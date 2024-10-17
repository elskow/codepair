package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
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
	videochat.Get("/ws/:roomID", fiberWebsocket.New(s.handleVideochatWebSocket()))
	videochat.All("/*", proxyRequest(videochatURL))

	// Editor module routes
	editor := api.Group("/editor")
	editor.Get("/ws/:roomID", fiberWebsocket.New(s.handleEditorWebSocket()))
	editor.All("/*", proxyRequest(editorURL))
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.app.ShutdownWithContext(ctx)
}

func (s *Server) handleVideochatWebSocket() func(*fiberWebsocket.Conn) {
	return s.handleWebSocket(videochatURL, "roomID")
}

func (s *Server) handleEditorWebSocket() func(*fiberWebsocket.Conn) {
	return s.handleWebSocket(editorURL, "roomID")
}

func (s *Server) handleWebSocket(serviceURL, roomParamName string) func(*fiberWebsocket.Conn) {
	return func(c *fiberWebsocket.Conn) {
		defer c.Close()

		// Get roomID from route params
		roomID := c.Params(roomParamName)
		if roomID == "" {
			log.Println("Room ID is required")
			return
		}

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		// Convert http:// to ws:// or https:// to wss://
		wsURL := convertToWebSocketURL(serviceURL)
		serviceWSURL := fmt.Sprintf("%s/ws/%s", wsURL, roomID)

		serviceConn, err := s.connectToService(serviceWSURL)
		if err != nil {
			log.Printf("Failed to connect to service: %v", err)
			return
		}
		defer serviceConn.Close()

		go s.relayMessages(ctx, c, serviceConn)
		go s.relayMessages(ctx, serviceConn, c)

		<-ctx.Done()
	}
}

// convertToWebSocketURL converts HTTP URLs to WebSocket URLs
func convertToWebSocketURL(url string) string {
	if strings.HasPrefix(url, "https://") {
		return "wss://" + strings.TrimPrefix(url, "https://")
	}
	if strings.HasPrefix(url, "http://") {
		return "ws://" + strings.TrimPrefix(url, "http://")
	}
	// If no prefix, assume ws:// is needed
	if !strings.HasPrefix(url, "ws://") && !strings.HasPrefix(url, "wss://") {
		return "ws://" + url
	}
	return url
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
