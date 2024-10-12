package main

import (
	"context"
	"log"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type Server struct {
	app        *fiber.App
	rooms      map[string]*Room
	roomsMutex sync.RWMutex
	broadcast  chan RoomMessage
}

type Room struct {
	clients      map[*websocket.Conn]bool
	clientsMutex sync.RWMutex
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

func NewServer(app *fiber.App) *Server {
	return &Server{
		app:       app,
		rooms:     make(map[string]*Room),
		broadcast: make(chan RoomMessage, 20),
	}
}

func (s *Server) setupRoutes() {
	s.app.Get("/ws/:roomId", websocket.New(s.handleWebSocket))
	go s.handleMessages()
}

func (s *Server) handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	roomId := c.Params("roomId")
	if roomId == "" {
		log.Println("Room ID is required")
		return
	}

	s.roomsMutex.Lock()
	if _, exists := s.rooms[roomId]; !exists {
		s.rooms[roomId] = &Room{
			clients: make(map[*websocket.Conn]bool),
		}
	}
	room := s.rooms[roomId]
	s.roomsMutex.Unlock()

	room.clientsMutex.Lock()
	room.clients[c] = true
	room.clientsMutex.Unlock()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go s.handleIncomingMessages(ctx, c, roomId)

	<-ctx.Done()

	room.clientsMutex.Lock()
	delete(room.clients, c)
	room.clientsMutex.Unlock()

	s.roomsMutex.Lock()
	if len(room.clients) == 0 {
		delete(s.rooms, roomId)
	}
	s.roomsMutex.Unlock()
}

func (s *Server) handleIncomingMessages(ctx context.Context, c *websocket.Conn, roomId string) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			var msg Message
			err := c.ReadJSON(&msg)
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("error: %v", err)
				}
				return
			}
			s.broadcast <- RoomMessage{RoomID: roomId, Message: msg}
		}
	}
}

func (s *Server) handleMessages() {
	for roomMsg := range s.broadcast {
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
					log.Printf("error: %v", err)
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
	s.roomsMutex.Lock()
	defer s.roomsMutex.Unlock()

	for _, room := range s.rooms {
		room.clientsMutex.Lock()
		for client := range room.clients {
			client.Close()
		}
		room.clientsMutex.Unlock()
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
