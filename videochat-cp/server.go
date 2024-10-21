package main

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
	"go.uber.org/zap"
)

type Room struct {
	clients map[*websocket.Conn]bool
	mutex   sync.RWMutex
}

type Server struct {
	app        *fiber.App
	rooms      map[string]*Room
	roomsMutex sync.RWMutex
	logger     *zap.Logger
}

func NewServer(app *fiber.App, logger *zap.Logger) *Server {
	server := &Server{
		app:    app,
		rooms:  make(map[string]*Room),
		logger: logger,
	}

	go server.cleanupInactiveClients()

	return server
}

func (s *Server) setupRoutes() {
	s.app.Get("/:roomID", websocket.New(s.handleWebSocket))
}

func (s *Server) handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := s.getLogger(ctx)

	roomID := c.Params("roomID")
	if roomID == "" {
		logger.Error("Room ID is required")
		return
	}

	pc, err := s.createPeerConnection()
	if err != nil {
		logger.Error("Failed to create peer connection", zap.Error(err))
		return
	}

	s.addClientToRoom(roomID, c)
	logger.Info("Client connected to room", zap.String("roomID", roomID))

	go s.manageICECandidateEvents(ctx, c, pc, roomID)
	s.handleIncomingMessages(ctx, c, pc, roomID)

	c.SetCloseHandler(func(code int, text string) error {
		logger.Info("WebSocket closing",
			zap.Int("code", code),
			zap.String("reason", text),
			zap.String("roomID", roomID))
		cancel()
		s.removeClientFromRoom(roomID, c)
		if err := pc.Close(); err != nil {
			logger.Error("Failed to close peer connection", zap.Error(err))
		}
		logger.Info("Client disconnected", zap.String("roomID", roomID))
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
		s.logger.Info("New room created", zap.String("roomID", roomID))
	}

	s.rooms[roomID].mutex.Lock()
	defer s.rooms[roomID].mutex.Unlock()
	s.rooms[roomID].clients[c] = true
	s.logger.Info("Client added to room",
		zap.String("roomID", roomID),
		zap.Int("totalClients", len(s.rooms[roomID].clients)))
}

func (s *Server) removeClientFromRoom(roomID string, c *websocket.Conn) {
	s.roomsMutex.Lock()
	defer s.roomsMutex.Unlock()

	if room, exists := s.rooms[roomID]; exists {
		room.mutex.Lock()
		defer room.mutex.Unlock()
		delete(room.clients, c)
		s.logger.Info("Client removed from room",
			zap.String("roomID", roomID),
			zap.Int("remainingClients", len(room.clients)))

		if len(room.clients) == 0 {
			delete(s.rooms, roomID)
			s.logger.Info("Room closed due to no clients", zap.String("roomID", roomID))
		}
	}
}

func (s *Server) cleanupInactiveClients() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.roomsMutex.Lock()
		for roomID, room := range s.rooms {
			room.mutex.Lock()
			for client := range room.clients {
				if err := client.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive client detected, closing connection",
						zap.String("roomID", roomID),
						zap.Error(err))
					client.Close()
					delete(room.clients, client)
				}
			}
			if len(room.clients) == 0 {
				s.logger.Info("Removing empty room during cleanup", zap.String("roomID", roomID))
				delete(s.rooms, roomID)
			}
			room.mutex.Unlock()
		}
		s.roomsMutex.Unlock()
	}
}

func (s *Server) manageICECandidateEvents(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection, roomID string) {
	logger := s.getLogger(ctx)

	pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate == nil {
			return
		}
		candidateJSON, err := json.Marshal(candidate.ToJSON())
		if err != nil {
			logger.Error("Failed to marshal ICE candidate", zap.Error(err))
			return
		}
		select {
		case <-ctx.Done():
			return
		default:
			s.broadcastMessageToRoom(ctx, roomID, c, candidateJSON)
		}
	})
}

func (s *Server) handleIncomingMessages(ctx context.Context, c *websocket.Conn, pc *webrtc.PeerConnection, roomID string) {
	logger := s.getLogger(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		default:
			_, msg, err := c.ReadMessage()
			if err != nil {
				if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
					return
				}
				logger.Error("Failed to read message", zap.Error(err))
				return
			}

			var signal map[string]interface{}

			if err := json.Unmarshal(msg, &signal); err != nil {
				logger.Error("Failed to unmarshal signal", zap.Error(err))
				continue
			}

			if sdp, ok := signal["sdp"].(map[string]interface{}); ok {
				sdpStr, _ := json.Marshal(sdp)
				s.handleSDP(ctx, c, pc, string(sdpStr))
			} else if candidate, ok := signal["candidate"].(map[string]interface{}); ok {
				candidateStr, _ := json.Marshal(candidate)
				s.addRemoteICECandidate(ctx, pc, string(candidateStr))
			}

			s.broadcastMessageToRoom(ctx, roomID, c, msg)
		}
	}
}

func (s *Server) broadcastMessageToRoom(ctx context.Context, roomID string, sender *websocket.Conn, message []byte) {
	s.roomsMutex.RLock()
	defer s.roomsMutex.RUnlock()

	if room, exists := s.rooms[roomID]; exists {
		room.mutex.RLock()
		defer room.mutex.RUnlock()

		for client := range room.clients {
			if client != sender {
				if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
					s.logger.Error("Failed to write message to client", zap.Error(err))
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

func (s *Server) getLogger(ctx context.Context) *zap.Logger {
	if requestID, ok := ctx.Value("requestID").(string); ok {
		return s.logger.With(zap.String("requestID", requestID))
	}
	return s.logger
}
