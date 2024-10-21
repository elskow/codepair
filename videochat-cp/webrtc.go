package main

import (
	"context"
	"encoding/json"

	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
	"go.uber.org/zap"
)

func (s *Server) createPeerConnection() (*webrtc.PeerConnection, error) {
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{stunServerURL},
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

func (s *Server) handleSDP(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection, sdpStr string) {
	logger := s.getLogger(ctx)

	var sdp webrtc.SessionDescription
	if err := json.Unmarshal([]byte(sdpStr), &sdp); err != nil {
		logger.Error("Failed to unmarshal SDP", zap.Error(err))
		return
	}

	if sdp.Type == webrtc.SDPTypeOffer {
		if err := pc.SetRemoteDescription(sdp); err != nil {
			logger.Error("Failed to set remote description", zap.Error(err))
			return
		}

		answer, err := pc.CreateAnswer(nil)
		if err != nil {
			logger.Error("Failed to create answer", zap.Error(err))
			return
		}

		if err := pc.SetLocalDescription(answer); err != nil {
			logger.Error("Failed to set local description", zap.Error(err))
			return
		}

		answerJSON, err := json.Marshal(answer)
		if err != nil {
			logger.Error("Failed to marshal answer", zap.Error(err))
			return
		}

		if err := c.WriteMessage(websocket.TextMessage, answerJSON); err != nil {
			logger.Error("Failed to send answer", zap.Error(err))
		}
	} else if sdp.Type == webrtc.SDPTypeAnswer {
		if err := pc.SetRemoteDescription(sdp); err != nil {
			logger.Error("Failed to set remote description", zap.Error(err))
		}
	}
}

func (s *Server) addRemoteICECandidate(ctx context.Context, pc *webrtc.PeerConnection, candidateStr string) {
	logger := s.getLogger(ctx)

	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal([]byte(candidateStr), &candidate); err != nil {
		logger.Error("Failed to unmarshal ICE candidate", zap.Error(err))
		return
	}

	if err := pc.AddICECandidate(candidate); err != nil {
		logger.Debug("Failed to add ICE candidate", zap.Error(err))
	}
}
