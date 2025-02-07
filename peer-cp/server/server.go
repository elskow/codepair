package server

import (
	"context"
	"sync"
	"time"

	"github.com/elskow/codepair/peer-cp/config"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
	"go.uber.org/zap"
)

type Room struct {
	clients      map[*websocket.Conn]bool
	clientsMutex sync.RWMutex
	currentCode  string
	language     string
	peerConns    map[string]*webrtc.PeerConnection
}

type Server struct {
	app        *fiber.App
	rooms      map[string]*Room
	roomsMutex sync.RWMutex
	logger     *zap.Logger
	config     config.Config
}

func NewServer(app *fiber.App, logger *zap.Logger, config config.Config) *Server {
	server := &Server{
		app:    app,
		rooms:  make(map[string]*Room),
		logger: logger,
		config: config,
	}

	go server.cleanupInactiveClients()
	return server
}

func (s *Server) SetupRoutes() {
	s.app.Get("/editor/:roomId", websocket.New(s.handleEditorWS))
	s.app.Get("/videochat/:roomId", websocket.New(s.handleVideoChatWS))
}

func (s *Server) cleanupInactiveClients() {
	ticker := time.NewTicker(s.config.Server.CleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		s.roomsMutex.Lock()
		for roomID, room := range s.rooms {
			room.clientsMutex.Lock()
			for client := range room.clients {
				if err := client.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive client detected, closing connection",
						zap.String("roomID", roomID),
						zap.Error(err))
					client.Close()
					delete(room.clients, client)
				}
			}

			// Cleanup peer connections
			for id, pc := range room.peerConns {
				if pc.ConnectionState() == webrtc.PeerConnectionStateClosed {
					delete(room.peerConns, id)
				}
			}

			if len(room.clients) == 0 {
				s.logger.Info("Removing empty room during cleanup", zap.String("roomID", roomID))
				delete(s.rooms, roomID)
			}
			room.clientsMutex.Unlock()
		}
		s.roomsMutex.Unlock()
	}
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.roomsMutex.Lock()
	defer s.roomsMutex.Unlock()

	for roomID, room := range s.rooms {
		room.clientsMutex.Lock()
		for client := range room.clients {
			client.Close()
		}
		for _, pc := range room.peerConns {
			pc.Close()
		}
		room.clientsMutex.Unlock()
		s.logger.Info("Room closed during shutdown", zap.String("roomID", roomID))
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
