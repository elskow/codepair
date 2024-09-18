package main

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
)

const (
	stunServerURL = "stun:stun.l.google.com:19302"
)

type Server struct {
	app            *fiber.App
	peerConnection *webrtc.PeerConnection
	pcMutex        sync.Mutex
}

func NewServer() *Server {
	return &Server{
		app: fiber.New(),
	}
}

func (s *Server) setupRoutes() {
	s.app.Get("/ws", websocket.New(s.handleWebSocket))
}

func (s *Server) handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pc, err := s.createPeerConnection()
	if err != nil {
		log.Printf("Failed to create peer connection: %v", err)
		return
	}

	s.pcMutex.Lock()
	s.peerConnection = pc
	s.pcMutex.Unlock()

	go s.handleICECandidates(ctx, c, pc)
	s.handleIncomingMessages(ctx, c, pc)
}

func (s *Server) handleICECandidates(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection) {
	pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate == nil {
			return
		}
		candidateJSON, err := json.Marshal(candidate.ToJSON())
		if err != nil {
			log.Printf("Failed to marshal ICE candidate: %v", err)
			return
		}
		select {
		case <-ctx.Done():
			return
		default:
			if err := c.WriteMessage(websocket.TextMessage, candidateJSON); err != nil {
				log.Printf("Failed to send ICE candidate: %v", err)
			}
		}
	})
}

func (s *Server) handleIncomingMessages(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection) {
	for {
		select {
		case <-ctx.Done():
			return

		default:
			_, msg, err := c.ReadMessage()
			if err != nil {
				log.Printf("Failed to read message: %v", err)
				return
			}

			var signal map[string]interface{}
			if err := json.Unmarshal(msg, &signal); err != nil {
				log.Printf("Failed to unmarshal signal: %v", err)
				continue
			}

			if sdp, ok := signal["sdp"]; ok {
				s.handleSDP(c, pc, sdp.(string))
			} else if candidate, ok := signal["candidate"]; ok {
				s.handleICECandidate(pc, candidate.(string))
			}
		}
	}
}
