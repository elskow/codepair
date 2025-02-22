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

func (s *Server) handleVideoChatWS(c *websocket.Conn) {
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := s.getLogger(ctx)
	roomID := c.Params("roomId")
	if roomID == "" {
		logger.Error("Room ID is required")
		return
	}

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

	// Store client in room
	s.roomsMutex.Lock()
	if _, exists := s.rooms[roomID]; !exists {
		s.rooms[roomID] = &Room{
			editorClients: make(map[*websocket.Conn]*EditorClient),
			webrtcClients: make(map[*websocket.Conn]*WebRTCClient),
			peerConns:     make(map[string]*webrtc.PeerConnection),
		}
	}
	room := s.rooms[roomID]
	clientID := c.Query("clientId")
	room.peerConns[clientID] = pc
	room.webrtcClients[c] = client
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
	if room, exists := s.rooms[roomID]; exists {
		delete(room.webrtcClients, c)
		delete(room.peerConns, clientID)
		if len(room.editorClients) == 0 && len(room.webrtcClients) == 0 {
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
		return nil, err
	}

	if err := m.RegisterCodec(webrtc.RTPCodecParameters{
		RTPCodecCapability: webrtc.RTPCodecCapability{
			MimeType: webrtc.MimeTypeVP9, ClockRate: 90000,
			Channels: 0, SDPFmtpLine: "", RTCPFeedback: nil},
		PayloadType: 96}, webrtc.RTPCodecTypeVideo); err != nil {
		return nil, err
	}

	api := webrtc.NewAPI(webrtc.WithMediaEngine(m))

	return api.NewPeerConnection(config)
}

func (s *Server) handleSDP(ctx context.Context, client *WebRTCClient, sdp map[string]interface{}) error {
	sdpJSON, err := json.Marshal(sdp)
	if err != nil {
		return fmt.Errorf("failed to marshal SDP: %w", err)
	}

	var sessionDesc webrtc.SessionDescription
	if err := json.Unmarshal(sdpJSON, &sessionDesc); err != nil {
		return fmt.Errorf("failed to parse SDP: %w", err)
	}

	if err := client.pc.SetRemoteDescription(sessionDesc); err != nil {
		return fmt.Errorf("failed to set remote description: %w", err)
	}

	if sessionDesc.Type == webrtc.SDPTypeOffer {
		answer, err := client.pc.CreateAnswer(nil)
		if err != nil {
			return fmt.Errorf("failed to create answer: %w", err)
		}

		if err := client.pc.SetLocalDescription(answer); err != nil {
			return fmt.Errorf("failed to set local description: %w", err)
		}

		client.writeMutex.Lock()
		defer client.writeMutex.Unlock()

		if err := client.conn.WriteJSON(map[string]interface{}{
			"type": "answer",
			"sdp":  answer,
		}); err != nil {
			return fmt.Errorf("failed to send answer: %w", err)
		}
	}

	return nil
}

func (s *Server) handleICECandidate(ctx context.Context, client *WebRTCClient, candidate map[string]interface{}) error {
	candidateJSON, err := json.Marshal(candidate)
	if err != nil {
		return fmt.Errorf("failed to marshal ICE candidate: %w", err)
	}

	var iceCandidate webrtc.ICECandidateInit
	if err := json.Unmarshal(candidateJSON, &iceCandidate); err != nil {
		return fmt.Errorf("failed to parse ICE candidate: %w", err)
	}

	// If remote description isn't set yet, store the candidate
	if client.pc.RemoteDescription() == nil {
		client.candidates = append(client.candidates, iceCandidate)
		return nil
	}

	// Add the candidate if remote description is set
	if err := client.pc.AddICECandidate(iceCandidate); err != nil {
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
