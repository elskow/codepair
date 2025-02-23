package server

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
	"go.uber.org/zap"
)

// WebRTCClient represents a client connected for video chat
type WebRTCClient struct {
	conn       *websocket.Conn
	pc         *webrtc.PeerConnection
	writeMutex sync.Mutex
	candidates []webrtc.ICECandidateInit
}

func (s *Server) HandleVideoChatWS(c *websocket.Conn) {
	defer c.Close()

	ctx := context.WithValue(context.Background(), "requestID", c.Params("requestId"))
	logger := s.getLogger(ctx)

	roomID := c.Params("roomId")
	token := c.Query("token")

	logger.Debug("WebSocket connection attempt",
		zap.String("roomID", roomID),
		zap.String("tokenPresent", fmt.Sprintf("%t", token != "")))

	validRoom, err := s.validateRoom(roomID, token)
	if err != nil {
		logger.Error("Room validation failed",
			zap.String("roomID", roomID),
			zap.Error(err))
		return
	}

	if !validRoom.IsActive {
		logger.Error("Room is not active",
			zap.String("roomID", roomID))
		c.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Room is not active"))
		return
	}

	// Create WebRTC client
	client := &WebRTCClient{
		conn:       c,
		candidates: make([]webrtc.ICECandidateInit, 0),
	}

	pc, err := s.createPeerConnection()
	if err != nil {
		logger.Error("Failed to create peer connection", zap.Error(err))
		return
	}
	client.pc = pc

	s.roomsMutex.Lock()
	localRoom, exists := s.rooms[roomID]
	if !exists {
		localRoom = &Room{
			editorClients: make(map[*websocket.Conn]*EditorClient),
			webrtcClients: make(map[*websocket.Conn]*WebRTCClient),
			peerConns:     make(map[string]*webrtc.PeerConnection),
		}
		s.rooms[roomID] = localRoom
	}
	clientID := c.Query("clientId")
	localRoom.peerConns[clientID] = pc
	localRoom.webrtcClients[c] = client
	s.roomsMutex.Unlock()

	// Setup ICE handling
	pc.OnICECandidate(func(ice *webrtc.ICECandidate) {
		if ice == nil {
			return
		}

		candidateJSON := ice.ToJSON()
		msg := map[string]interface{}{
			"type":      "ice_candidate",
			"candidate": candidateJSON,
		}

		client.writeMutex.Lock()
		defer client.writeMutex.Unlock()

		if err := c.WriteJSON(msg); err != nil {
			logger.Error("Failed to send ICE candidate", zap.Error(err))
		}
	})

	// Setup media handling
	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		s.logger.Info("Received track",
			zap.String("roomID", roomID),
			zap.String("trackID", track.ID()),
			zap.String("kind", track.Kind().String()))

		// Create a local track to forward the received track
		localTrack, err := webrtc.NewTrackLocalStaticRTP(track.Codec().RTPCodecCapability, track.ID(), track.StreamID())
		if err != nil {
			s.logger.Error("Failed to create local track", zap.Error(err))
			return
		}

		// Add the local track to all other peers
		s.roomsMutex.RLock()
		if room, exists := s.rooms[roomID]; exists {
			for _, otherClient := range room.webrtcClients {
				if otherClient.conn != c {
					sender, err := otherClient.pc.AddTrack(localTrack)
					if err != nil {
						s.logger.Error("Failed to add track to peer", zap.Error(err))
						continue
					}

					go func() {
						rtcpBuf := make([]byte, 1500)
						for {
							if _, _, rtcpErr := sender.Read(rtcpBuf); rtcpErr != nil {
								return
							}
						}
					}()
				}
			}
		}
		s.roomsMutex.RUnlock()

		// Read incoming track data and forward it
		go func() {
			rtpBuf := make([]byte, 1500)
			for {
				n, _, err := track.Read(rtpBuf)
				if err != nil {
					s.logger.Error("Failed to read from track", zap.Error(err))
					return
				}

				if _, err = localTrack.Write(rtpBuf[:n]); err != nil {
					s.logger.Error("Failed to write to local track", zap.Error(err))
					return
				}
			}
		}()
	})

	// State change handling
	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		s.logger.Info("Peer connection state changed",
			zap.String("roomID", roomID),
			zap.String("state", state.String()))
	})

	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				logger.Info("WebSocket closed normally")
			} else {
				logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		var signal map[string]interface{}
		if err := json.Unmarshal(msg, &signal); err != nil {
			logger.Error("Failed to parse signal", zap.Error(err))
			continue
		}

		// Handle SDP first
		if sdp, ok := signal["sdp"].(map[string]interface{}); ok {
			if err := s.handleSDP(ctx, client, sdp); err != nil {
				logger.Error("Failed to handle SDP", zap.Error(err))
				continue
			}

			// Process stored candidates after SDP is set
			for _, candidate := range client.candidates {
				if err := client.pc.AddICECandidate(candidate); err != nil {
					logger.Error("Failed to add stored ICE candidate", zap.Error(err))
				}
			}
			client.candidates = nil // Clear stored candidates
		} else if candidate, ok := signal["candidate"].(map[string]interface{}); ok {
			if err := s.handleICECandidate(ctx, client, candidate); err != nil {
				logger.Error("Failed to handle ICE candidate", zap.Error(err))
			}
		}

		// Broadcast to other clients in room
		s.broadcastToRoom(roomID, c, msg)
	}

	// Cleanup
	s.roomsMutex.Lock()
	if localRoom, exists := s.rooms[roomID]; exists {
		delete(localRoom.webrtcClients, c)
		delete(localRoom.peerConns, clientID)
		if len(localRoom.editorClients) == 0 && len(localRoom.webrtcClients) == 0 {
			delete(s.rooms, roomID)
		}
	}
	s.roomsMutex.Unlock()
}

func (s *Server) createPeerConnection() (*webrtc.PeerConnection, error) {
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{s.config.Server.StunServerURL},
			},
		},
	}

	m := &webrtc.MediaEngine{}
	if err := m.RegisterDefaultCodecs(); err != nil {
		return nil, fmt.Errorf("failed to register default codecs: %w", err)
	}

	api := webrtc.NewAPI(webrtc.WithMediaEngine(m))
	pc, err := api.NewPeerConnection(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create peer connection: %w", err)
	}

	if _, err := pc.AddTransceiverFromKind(webrtc.RTPCodecTypeVideo, webrtc.RTPTransceiverInit{
		Direction: webrtc.RTPTransceiverDirectionSendrecv,
	}); err != nil {
		return nil, fmt.Errorf("failed to add video transceiver: %w", err)
	}

	if _, err := pc.AddTransceiverFromKind(webrtc.RTPCodecTypeAudio, webrtc.RTPTransceiverInit{
		Direction: webrtc.RTPTransceiverDirectionSendrecv,
	}); err != nil {
		return nil, fmt.Errorf("failed to add audio transceiver: %w", err)
	}

	return pc, nil
}

func (s *Server) handleSDP(ctx context.Context, client *WebRTCClient, sdp map[string]interface{}) error {
	logger := s.getLogger(ctx)
	logger.Debug("Handling SDP", zap.Any("type", sdp["type"]))

	sdpJSON, err := json.Marshal(sdp)
	if err != nil {
		logger.Error("Failed to marshal SDP", zap.Error(err))
		return fmt.Errorf("failed to marshal SDP: %w", err)
	}

	var sessionDesc webrtc.SessionDescription
	if err := json.Unmarshal(sdpJSON, &sessionDesc); err != nil {
		logger.Error("Failed to parse SDP", zap.Error(err))
		return fmt.Errorf("failed to parse SDP: %w", err)
	}

	logger.Debug("Setting remote description")
	if err := client.pc.SetRemoteDescription(sessionDesc); err != nil {
		logger.Error("Failed to set remote description", zap.Error(err))
		return fmt.Errorf("failed to set remote description: %w", err)
	}

	if sessionDesc.Type == webrtc.SDPTypeOffer {
		logger.Debug("Creating answer")
		answer, err := client.pc.CreateAnswer(nil)
		if err != nil {
			logger.Error("Failed to create answer", zap.Error(err))
			return fmt.Errorf("failed to create answer: %w", err)
		}

		logger.Debug("Setting local description")
		if err := client.pc.SetLocalDescription(answer); err != nil {
			logger.Error("Failed to set local description", zap.Error(err))
			return fmt.Errorf("failed to set local description: %w", err)
		}

		client.writeMutex.Lock()
		defer client.writeMutex.Unlock()

		logger.Debug("Sending answer")
		if err := client.conn.WriteJSON(map[string]interface{}{
			"type": "answer",
			"sdp":  answer,
		}); err != nil {
			logger.Error("Failed to send answer", zap.Error(err))
			return fmt.Errorf("failed to send answer: %w", err)
		}
	}

	return nil
}

func (s *Server) handleICECandidate(ctx context.Context, client *WebRTCClient, candidate map[string]interface{}) error {
	logger := s.getLogger(ctx)
	logger.Debug("Handling ICE candidate")

	candidateJSON, err := json.Marshal(candidate)
	if err != nil {
		logger.Error("Failed to marshal ICE candidate", zap.Error(err))
		return fmt.Errorf("failed to marshal ICE candidate: %w", err)
	}

	var iceCandidate webrtc.ICECandidateInit
	if err := json.Unmarshal(candidateJSON, &iceCandidate); err != nil {
		logger.Error("Failed to parse ICE candidate", zap.Error(err))
		return fmt.Errorf("failed to parse ICE candidate: %w", err)
	}

	if client.pc.RemoteDescription() == nil {
		logger.Debug("Storing ICE candidate for later")
		client.candidates = append(client.candidates, iceCandidate)
		return nil
	}

	logger.Debug("Adding ICE candidate")
	if err := client.pc.AddICECandidate(iceCandidate); err != nil {
		logger.Error("Failed to add ICE candidate", zap.Error(err))
		return fmt.Errorf("failed to add ICE candidate: %w", err)
	}

	return nil
}

func (s *Server) broadcastToRoom(roomID string, sender *websocket.Conn, message []byte) {
	s.roomsMutex.RLock()
	defer s.roomsMutex.RUnlock()

	if room, exists := s.rooms[roomID]; exists {
		for client, wc := range room.webrtcClients {
			if client != sender {
				wc.writeMutex.Lock()
				err := client.WriteMessage(websocket.TextMessage, message)
				wc.writeMutex.Unlock()

				if err != nil {
					s.logger.Error("Failed to broadcast message to client",
						zap.Error(err),
						zap.String("roomID", roomID))
				}
			}
		}
	}
}
