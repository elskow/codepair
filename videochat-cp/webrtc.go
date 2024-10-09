package main

import (
	"encoding/json"
	"log"

	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
)

func (s *Server) createPeerConnection() (*webrtc.PeerConnection, error) {
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{stunServerURL},
			},
		},
	}
	return webrtc.NewPeerConnection(config)
}

func (s *Server) handleSDP(c *websocket.Conn, pc *webrtc.PeerConnection, sdpStr string) {
	var sdp webrtc.SessionDescription
	if err := json.Unmarshal([]byte(sdpStr), &sdp); err != nil {
		log.Printf("Failed to unmarshal SDP: %v", err)
		return
	}

	if sdp.Type == webrtc.SDPTypeOffer {
		if err := pc.SetRemoteDescription(sdp); err != nil {
			log.Printf("Failed to set remote description: %v", err)
			return
		}

		answer, err := pc.CreateAnswer(nil)
		if err != nil {
			log.Printf("Failed to create answer: %v", err)
			return
		}

		if err := pc.SetLocalDescription(answer); err != nil {
			log.Printf("Failed to set local description: %v", err)
			return
		}

		answerJSON, err := json.Marshal(answer)
		if err != nil {
			log.Printf("Failed to marshal answer: %v", err)
			return
		}

		if err := c.WriteMessage(websocket.TextMessage, answerJSON); err != nil {
			log.Printf("Failed to send answer: %v", err)
		}
	} else if sdp.Type == webrtc.SDPTypeAnswer {
		if err := pc.SetRemoteDescription(sdp); err != nil {
			log.Printf("Failed to set remote description: %v", err)
		}
	}
}

func (s *Server) handleICECandidate(pc *webrtc.PeerConnection, candidateStr string) {
	var candidate webrtc.ICECandidateInit
	if err := json.Unmarshal([]byte(candidateStr), &candidate); err != nil {
		log.Printf("Failed to unmarshal ICE candidate: %v", err)
		return
	}

	if err := pc.AddICECandidate(candidate); err != nil {
		log.Printf("Failed to add ICE candidate: %v", err)
	}
}
