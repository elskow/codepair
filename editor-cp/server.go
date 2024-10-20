package main

import (
	"context"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type Server struct {
	app        *fiber.App
	rooms      map[string]*Room
	roomsMutex sync.RWMutex
	broadcast  chan RoomMessage
	logger     *zap.Logger
}

func (s *Server) getLogger(ctx context.Context) *zap.Logger {
	if requestID, ok := ctx.Value("requestID").(string); ok {
		return s.logger.With(zap.String("requestID", requestID))
	}
	return s.logger
}

type Room struct {
	clients      map[*websocket.Conn]bool
	clientsMutex sync.RWMutex
	currentCode  string
	language     string
}

type RoomMessage struct {
	RoomID  string  `json:"roomId"`
	Message Message `json:"message"`
}

type Message struct {
	Type     string `json:"type"`
	Code     string `json:"code,omitempty"`
	Language string `json:"language,omitempty"`
	Cursor   Cursor `json:"cursor,omitempty"`
	Chat     string `json:"chat,omitempty"`
}

type Cursor struct {
	Line   int `json:"line"`
	Column int `json:"column"`
}

func NewServer(app *fiber.App, logger *zap.Logger) *Server {
	return &Server{
		app:       app,
		rooms:     make(map[string]*Room),
		broadcast: make(chan RoomMessage, 20),
		logger:    logger,
	}
}

func (s *Server) setupRoutes() {
	s.app.Get("/:roomId", websocket.New(s.handleWebSocket))
	go s.handleMessages()
}

func (s *Server) handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	ctx := context.WithValue(context.Background(), "requestID", c.Params("requestId"))
	logger := s.getLogger(ctx)

	roomID := c.Params("roomId")
	if roomID == "" {
		logger.Warn("Empty room ID")
		return
	}

	s.roomsMutex.Lock()
	if _, exists := s.rooms[roomID]; !exists {
		s.rooms[roomID] = &Room{
			clients: make(map[*websocket.Conn]bool),
		}
	}
	room := s.rooms[roomID]
	s.roomsMutex.Unlock()

	room.clientsMutex.Lock()
	room.clients[c] = true
	room.clientsMutex.Unlock()

	logger.Info("Client connected", zap.String("roomID", roomID))

	if room.currentCode != "" {
		syncMessage := Message{
			Type:     "sync",
			Code:     room.currentCode,
			Language: room.language,
		}
		if err := c.WriteJSON(syncMessage); err != nil {
			logger.Error("Failed to send sync message", zap.Error(err))
		}
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	go s.handleIncomingMessages(ctx, c, roomID)

	<-ctx.Done()

	room.clientsMutex.Lock()
	delete(room.clients, c)
	room.clientsMutex.Unlock()

	s.roomsMutex.Lock()
	if len(room.clients) == 0 {
		delete(s.rooms, roomID)
		logger.Info("Room closed", zap.String("roomID", roomID))
	}
	s.roomsMutex.Unlock()

	logger.Info("Client disconnected", zap.String("roomID", roomID))
}

func (s *Server) handleIncomingMessages(ctx context.Context, c *websocket.Conn, roomID string) {
	logger := s.getLogger(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			var msg Message
			err := c.ReadJSON(&msg)
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					logger.Error("Unexpected close error", zap.Error(err))
				}
				return
			}

			if msg.Type == "code" {
				s.roomsMutex.RLock()
				room := s.rooms[roomID]
				s.roomsMutex.RUnlock()

				room.currentCode = msg.Code
				room.language = msg.Language
				logger.Debug("Code updated", zap.String("roomID", roomID), zap.String("language", msg.Language))
			}

			s.broadcast <- RoomMessage{RoomID: roomID, Message: msg}
		}
	}
}

func (s *Server) handleMessages() {
	for roomMsg := range s.broadcast {
		ctx := context.Background()
		logger := s.getLogger(ctx)

		s.roomsMutex.RLock()
		room, exists := s.rooms[roomMsg.RoomID]
		s.roomsMutex.RUnlock()

		if !exists {
			continue
		}

		room.clientsMutex.RLock()
		for client := range room.clients {
			go func(client *websocket.Conn) {
				err := client.WriteJSON(roomMsg.Message)
				if err != nil {
					logger.Error("Failed to send message to client",
						zap.Error(err),
						zap.String("roomID", roomMsg.RoomID))
					client.Close()
					room.clientsMutex.Lock()
					delete(room.clients, client)
					room.clientsMutex.Unlock()
				}
			}(client)
		}
		room.clientsMutex.RUnlock()
	}
}

func (s *Server) Shutdown(ctx context.Context) error {
	logger := s.getLogger(ctx)

	s.roomsMutex.Lock()
	defer s.roomsMutex.Unlock()

	for roomID, room := range s.rooms {
		room.clientsMutex.Lock()
		for client := range room.clients {
			client.Close()
		}
		room.clientsMutex.Unlock()
		logger.Info("Room closed during shutdown", zap.String("roomID", roomID))
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
