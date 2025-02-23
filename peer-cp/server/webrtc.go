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
