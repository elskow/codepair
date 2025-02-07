package server

import (
	"context"
	"encoding/json"

	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
	"go.uber.org/zap"
)

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

	pc, err := s.createPeerConnection()
	if err != nil {
		logger.Error("Failed to create peer connection", zap.Error(err))
		return
	}

	s.roomsMutex.Lock()
	if _, exists := s.rooms[roomID]; !exists {
		s.rooms[roomID] = &Room{
			clients:   make(map[*websocket.Conn]bool),
			peerConns: make(map[string]*webrtc.PeerConnection),
		}
	}
	room := s.rooms[roomID]
	clientID := c.Query("clientId")
	room.peerConns[clientID] = pc
	s.roomsMutex.Unlock()

	room.clientsMutex.Lock()
	room.clients[c] = true
	room.clientsMutex.Unlock()

	logger.Info("Video chat client connected",
		zap.String("roomID", roomID),
		zap.String("clientID", clientID))

	// Setup data channel
	pc.OnDataChannel(func(d *webrtc.DataChannel) {
		d.OnMessage(func(msg webrtc.DataChannelMessage) {
			s.broadcastToRoom(roomID, c, msg.Data)
		})
	})

	// Handle ICE candidates
	pc.OnICECandidate(func(ice *webrtc.ICECandidate) {
		if ice == nil {
			return
		}

		candidateJSON, err := json.Marshal(ice.ToJSON())
		if err != nil {
			logger.Error("Failed to marshal ICE candidate", zap.Error(err))
			return
		}

		s.broadcastToRoom(roomID, c, candidateJSON)
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

		if sdp, ok := signal["sdp"].(map[string]interface{}); ok {
			s.handleSDP(ctx, c, pc, sdp)
		} else if candidate, ok := signal["candidate"].(map[string]interface{}); ok {
			s.handleICECandidate(ctx, pc, candidate)
		}

		s.broadcastToRoom(roomID, c, msg)
	}

	// Cleanup
	room.clientsMutex.Lock()
	delete(room.clients, c)
	delete(room.peerConns, clientID)
	room.clientsMutex.Unlock()

	pc.Close()

	s.roomsMutex.Lock()
	if len(room.clients) == 0 {
		delete(s.rooms, roomID)
		logger.Info("Room closed", zap.String("roomID", roomID))
	}
	s.roomsMutex.Unlock()

	logger.Info("Video chat client disconnected",
		zap.String("roomID", roomID),
		zap.String("clientID", clientID))
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

func (s *Server) handleSDP(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection, sdp map[string]interface{}) {
	logger := s.getLogger(ctx)

	sdpJSON, err := json.Marshal(sdp)
	if err != nil {
		logger.Error("Failed to marshal SDP", zap.Error(err))
		return
	}

	var sessionDesc webrtc.SessionDescription
	if err := json.Unmarshal(sdpJSON, &sessionDesc); err != nil {
		logger.Error("Failed to parse SDP", zap.Error(err))
		return
	}

	err = pc.SetRemoteDescription(sessionDesc)
	if err != nil {
		logger.Error("Failed to set remote description", zap.Error(err))
		return
	}

	if sessionDesc.Type == webrtc.SDPTypeOffer {
		answer, err := pc.CreateAnswer(nil)
		if err != nil {
			logger.Error("Failed to create answer", zap.Error(err))
			return
		}

		err = pc.SetLocalDescription(answer)
		if err != nil {
			logger.Error("Failed to set local description", zap.Error(err))
			return
		}

		c.WriteJSON(map[string]interface{}{
			"sdp": answer,
		})
	}
}

func (s *Server) handleICECandidate(ctx context.Context, pc *webrtc.PeerConnection, candidate map[string]interface{}) {
	logger := s.getLogger(ctx)

	candidateJSON, err := json.Marshal(candidate)
	if err != nil {
		logger.Error("Failed to marshal ICE candidate", zap.Error(err))
		return
	}

	var iceCandidate webrtc.ICECandidateInit
	if err := json.Unmarshal(candidateJSON, &iceCandidate); err != nil {
		logger.Error("Failed to parse ICE candidate", zap.Error(err))
		return
	}

	err = pc.AddICECandidate(iceCandidate)
	if err != nil {
		logger.Error("Failed to add ICE candidate", zap.Error(err))
	}
}

func (s *Server) broadcastToRoom(roomID string, sender *websocket.Conn, message []byte) {
	s.roomsMutex.RLock()
	defer s.roomsMutex.RUnlock()

	if room, exists := s.rooms[roomID]; exists {
		room.clientsMutex.RLock()
		defer room.clientsMutex.RUnlock()

		for client := range room.clients {
			if client != sender {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					s.logger.Error("Failed to broadcast message to client",
						zap.Error(err),
						zap.String("roomID", roomID))
				}
			}
		}
	}
}
