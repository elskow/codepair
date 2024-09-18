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
	app          *fiber.App
	clients      map[*websocket.Conn]bool
	clientsMutex sync.Mutex
}

func NewServer() *Server {
	return &Server{
		app:     fiber.New(),
		clients: make(map[*websocket.Conn]bool),
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

	s.clientsMutex.Lock()
	s.clients[c] = true
	s.clientsMutex.Unlock()

	go s.handleICECandidates(ctx, c, pc)
	s.handleIncomingMessages(ctx, c, pc)

	// Handle WebSocket close
	c.SetCloseHandler(func(code int, text string) error {
		log.Printf("WebSocket closed with code %d: %s", code, text)
		cancel() // Cancel the context to stop goroutines
		s.clientsMutex.Lock()
		delete(s.clients, c)
		s.clientsMutex.Unlock()
		pc.Close() // Close the peer connection
		return nil
	})
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
			log.Printf("Sending ICE candidate: %s", candidateJSON)
			s.broadcastMessage(c, candidateJSON)
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
				if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
					log.Printf("WebSocket closed: %v", err)
				} else {
					log.Printf("Failed to read message: %v", err)
				}
				return
			}

			var signal map[string]interface{}
			if err := json.Unmarshal(msg, &signal); err != nil {
				log.Printf("Failed to unmarshal signal: %v", err)
				continue
			}

			if sdp, ok := signal["sdp"].(map[string]interface{}); ok {
				sdpStr, err := json.Marshal(sdp)
				if err != nil {
					log.Printf("Failed to marshal SDP: %v", err)
					continue
				}
				log.Printf("Received SDP: %s", sdpStr)
				s.handleSDP(c, pc, string(sdpStr))
			} else if candidate, ok := signal["candidate"].(map[string]interface{}); ok {
				candidateStr, err := json.Marshal(candidate)
				if err != nil {
					log.Printf("Failed to marshal ICE candidate: %v", err)
					continue
				}
				log.Printf("Received ICE candidate: %s", candidateStr)
				s.handleICECandidate(pc, string(candidateStr))
			}

			// Broadcast the message to other clients
			s.broadcastMessage(c, msg)
		}
	}
}

func (s *Server) broadcastMessage(sender *websocket.Conn, message []byte) {
	s.clientsMutex.Lock()
	defer s.clientsMutex.Unlock()

	for client := range s.clients {
		if client != sender {
			if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Failed to send message to client: %v", err)
			}
		}
	}
}
