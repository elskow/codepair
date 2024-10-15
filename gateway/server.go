package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/fasthttp/websocket"
	"github.com/gofiber/fiber/v2"
	fiberWebsocket "github.com/gofiber/websocket/v2"
)

type Server struct {
	app *fiber.App
}

func NewServer(app *fiber.App) *Server {
	return &Server{
		app: app,
	}
}

func (s *Server) setupRoutes() {
	api := s.app.Group("/api")

	// Videochat module routes
	videochat := api.Group("/videochat")
	videochat.Use(func(c *fiber.Ctx) error {
		if isWebSocketUpgrade(c) {
			return s.handleVideochatWebSocket(c)
		}
		return c.Next()
	})
	videochat.All("/*", proxyRequest(videochatURL))

	// Editor module routes
	editor := api.Group("/editor")
	editor.Use(func(c *fiber.Ctx) error {
		if isWebSocketUpgrade(c) {
			return s.handleEditorWebSocket(c)
		}
		return c.Next()
	})
	editor.All("/*", proxyRequest(editorURL))

	// TODO: Implement authentication and authorization middleware
	// TODO: Add rate limiting middleware
	// TODO: Implement logging and monitoring for all routes
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.app.ShutdownWithContext(ctx)
}

func (s *Server) handleVideochatWebSocket(c *fiber.Ctx) error {
	return s.handleWebSocket(c, videochatURL, "roomID")
}

func (s *Server) handleEditorWebSocket(c *fiber.Ctx) error {
	return s.handleWebSocket(c, editorURL, "roomId")
}

func (s *Server) handleWebSocket(c *fiber.Ctx, serviceURL, roomParamName string) error {
	return fiberWebsocket.New(func(conn *fiberWebsocket.Conn) {
		defer conn.Close()

		roomID := c.Params(roomParamName)
		if roomID == "" {
			log.Println("Room ID is required")
			return
		}

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		serviceWSURL := fmt.Sprintf("ws://%s/ws/%s", serviceURL, roomID)
		serviceConn, err := s.connectToService(serviceWSURL)
		if err != nil {
			log.Printf("Failed to connect to service: %v", err)
			return
		}
		defer serviceConn.Close()

		go s.relayMessages(ctx, conn, serviceConn)
		go s.relayMessages(ctx, serviceConn, conn)

		<-ctx.Done()
	})(c)
}

func (s *Server) connectToService(url string) (*websocket.Conn, error) {
	dialer := websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 45 * time.Second,
	}

	headers := http.Header{}
	headers.Add("Origin", "http://localhost:8000")

	conn, _, err := dialer.Dial(url, headers)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to service: %v", err)
	}

	return conn, nil
}

func (s *Server) relayMessages(ctx context.Context, src interface{}, dst interface{}) {
	var srcConn, dstConn interface {
		ReadMessage() (messageType int, p []byte, err error)
		WriteMessage(messageType int, data []byte) error
	}

	switch v := src.(type) {
	case *fiberWebsocket.Conn:
		srcConn = v
	case *websocket.Conn:
		srcConn = v
	default:
		log.Printf("Unsupported source connection type")
		return
	}

	switch v := dst.(type) {
	case *fiberWebsocket.Conn:
		dstConn = v
	case *websocket.Conn:
		dstConn = v
	default:
		log.Printf("Unsupported destination connection type")
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
			messageType, message, err := srcConn.ReadMessage()
			if err != nil {
				if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					log.Println("WebSocket closed normally")
				} else {
					log.Printf("Error reading WebSocket message: %v", err)
				}
				return
			}

			err = dstConn.WriteMessage(messageType, message)
			if err != nil {
				log.Printf("Error writing WebSocket message: %v", err)
				return
			}
		}
	}
}

func (s *Server) connectToEditorService(url string) (*websocket.Conn, error) {
	dialer := websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: 45 * time.Second,
	}

	headers := http.Header{}
	headers.Add("Origin", "http://localhost:8000")

	conn, _, err := dialer.Dial(url, headers)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to editor service: %v", err)
	}

	return conn, nil
}