package main

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
)

type Room struct {
	clients map[*websocket.Conn]bool
	mutex   sync.RWMutex
}

type Server struct {
	app        *fiber.App
	rooms      map[string]*Room
	roomsMutex sync.RWMutex
}

func NewServer(app *fiber.App) *Server {
	server := &Server{
		app:   app,
		rooms: make(map[string]*Room),
	}

	go server.removeInactiveClients()

	return server
}

func (s *Server) setupRoutes() {
	s.app.Get("/:roomID", websocket.New(s.handleWebSocket))
}

func (s *Server) handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	roomID := c.Params("roomID")
	if roomID == "" {
		log.Println("Room ID is required")
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pc, err := s.createPeerConnection()
	if err != nil {
		log.Printf("Failed to create peer connection: %v", err)
		return
	}

	s.addClientToRoom(roomID, c)

	go s.handleICECandidates(ctx, c, pc, roomID)
	s.handleIncomingMessages(ctx, c, pc, roomID)

	c.SetCloseHandler(func(code int, text string) error {
		log.Printf("WebSocket closed with code %d: %s", code, text)
		cancel()
		s.removeClientFromRoom(roomID, c)
		pc.Close()
		return nil
	})
}

func (s *Server) addClientToRoom(roomID string, c *websocket.Conn) {
	s.roomsMutex.Lock()
	defer s.roomsMutex.Unlock()

	if _, exists := s.rooms[roomID]; !exists {
		s.rooms[roomID] = &Room{
			clients: make(map[*websocket.Conn]bool),
		}
	}

	s.rooms[roomID].mutex.Lock()
	defer s.rooms[roomID].mutex.Unlock()
	s.rooms[roomID].clients[c] = true
}

func (s *Server) removeClientFromRoom(roomID string, c *websocket.Conn) {
	s.roomsMutex.Lock()
	defer s.roomsMutex.Unlock()

	if room, exists := s.rooms[roomID]; exists {
		room.mutex.Lock()
		defer room.mutex.Unlock()
		delete(room.clients, c)

		if len(room.clients) == 0 {
			delete(s.rooms, roomID)
		}
	}
}

func (s *Server) removeInactiveClients() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.roomsMutex.Lock()
		for roomID, room := range s.rooms {
			room.mutex.Lock()
			for client := range room.clients {
				if err := client.WriteMessage(websocket.PingMessage, nil); err != nil {
					client.Close()
					delete(room.clients, client)
				}
			}
			if len(room.clients) == 0 {
				delete(s.rooms, roomID)
			}
			room.mutex.Unlock()
		}
		s.roomsMutex.Unlock()
	}
}

func (s *Server) handleICECandidates(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection, roomID string) {
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
			s.broadcastMessageToRoom(roomID, c, candidateJSON)
		}
	})
}

func (s *Server) handleIncomingMessages(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection, roomID string) {
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

			s.broadcastMessageToRoom(roomID, c, msg)
		}
	}
}

func (s *Server) broadcastMessageToRoom(roomID string, sender *websocket.Conn, message []byte) {
	s.roomsMutex.RLock()
	defer s.roomsMutex.RUnlock()

	if room, exists := s.rooms[roomID]; exists {
		room.mutex.RLock()
		defer room.mutex.RUnlock()

		for client := range room.clients {
			if client != sender {
				if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
					log.Printf("Failed to send message to client: %v", err)
				}
			}
		}
	}
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.roomsMutex.Lock()
	defer s.roomsMutex.Unlock()

	for _, room := range s.rooms {
		room.mutex.Lock()
		for client := range room.clients {
			client.Close()
		}
		room.mutex.Unlock()
	}

	shutdownErr := make(chan error, 1)
	go func() {
		shutdownErr <- s.app.Shutdown()
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-shutdownErr:
		return err
	}
}
