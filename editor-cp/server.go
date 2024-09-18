package main

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

type Server struct {
	clients      map[*websocket.Conn]bool
	clientsMutex sync.Mutex
	broadcast    chan Message
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

func NewServer() *Server {
	return &Server{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan Message),
	}
}

func (s *Server) setupRoutes(app *fiber.App) {
	app.Get("/ws", websocket.New(s.handleWebSocket))
	go s.handleMessages()
}

func (s *Server) handleWebSocket(c *websocket.Conn) {
	defer c.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	s.clientsMutex.Lock()
	s.clients[c] = true
	s.clientsMutex.Unlock()

	go s.handleIncomingMessages(ctx, c)

	c.SetCloseHandler(func(code int, text string) error {
		log.Printf("WebSocket closed with code %d: %s", code, text)
		cancel()
		s.clientsMutex.Lock()
		delete(s.clients, c)
		s.clientsMutex.Unlock()
		return nil
	})
}

func (s *Server) handleIncomingMessages(ctx context.Context, c *websocket.Conn) {
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

			var message Message
			if err := json.Unmarshal(msg, &message); err != nil {
				log.Printf("Failed to unmarshal message: %v", err)
				continue
			}

			if message.Type == "execute" {
				req := ExecutionRequest{
					Language: message.Language,
					Code:     message.Code,
				}
				executionResult := executeCode(req)
				message.Code = executionResult.Output
				if executionResult.Error != "" {
					message.Code = executionResult.Error
				}
			}

			s.broadcast <- message
		}
	}
}

func (s *Server) handleMessages() {
	for {
		msg := <-s.broadcast
		s.clientsMutex.Lock()
		for client := range s.clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("Failed to send message to client: %v", err)
				client.Close()
				delete(s.clients, client)
			}
		}
		s.clientsMutex.Unlock()
	}
}
