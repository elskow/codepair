package server

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/elskow/codepair/peer-cp/client"
	"github.com/elskow/codepair/peer-cp/config"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
	"go.uber.org/zap"
)

// EditorClient represents a client connected to the editor
type EditorClient struct {
	conn *websocket.Conn
}

// Room represents a shared room for collaboration
type Room struct {
	editorClients map[*websocket.Conn]*EditorClient
	webrtcClients map[*websocket.Conn]*WebRTCClient
	clientsMutex  sync.RWMutex
	currentCode   string
	language      string
	peerConns     map[string]*webrtc.PeerConnection
}

type Server struct {
	app        *fiber.App
	rooms      map[string]*Room
	roomsMutex sync.RWMutex
	logger     *zap.Logger
	config     config.Config
	coreClient *client.CoreClient
}

func NewServer(app *fiber.App, logger *zap.Logger, config config.Config) *Server {
	server := &Server{
		app:        app,
		rooms:      make(map[string]*Room),
		logger:     logger,
		config:     config,
		coreClient: client.NewCoreClient(config.Core.BaseURL),
	}

	go server.cleanupInactiveClients()
	return server
}

func (s *Server) validateRoom(roomID, token string) (*client.Room, error) {
	if token == "" {
		return nil, fmt.Errorf("token is required")
	}

	s.logger.Debug("Validating room",
		zap.String("roomID", roomID),
		zap.String("tokenPrefix", token[:10]))

	room, err := s.coreClient.ValidateRoom(roomID, token)
	if err != nil {
		s.logger.Error("Room validation failed",
			zap.String("roomID", roomID),
			zap.Error(err))
		return nil, fmt.Errorf("room validation failed: %w", err)
	}

	s.logger.Debug("Room validation result",
		zap.String("roomID", roomID),
		zap.Bool("isActive", room.IsActive),
		zap.String("candidateName", room.CandidateName))

	return room, nil
}

func (s *Server) cleanupInactiveClients() {
	ticker := time.NewTicker(s.config.Server.CleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		s.roomsMutex.Lock()
		for roomID, room := range s.rooms {
			// Validate room is still active
			validRoom, err := s.validateRoom(roomID, "") // We might want to store tokens per room
			if err != nil || !validRoom.IsActive {
				s.logger.Info("Room is no longer active, cleaning up",
					zap.String("roomID", roomID),
					zap.Error(err))

				room.clientsMutex.Lock()
				// Close all connections
				for conn := range room.editorClients {
					conn.Close()
				}
				for conn := range room.webrtcClients {
					conn.Close()
				}
				for _, pc := range room.peerConns {
					pc.Close()
				}
				room.clientsMutex.Unlock()

				delete(s.rooms, roomID)
				continue
			}

			room.clientsMutex.Lock()

			// Check editor clients
			for conn, client := range room.editorClients {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive editor client detected",
						zap.String("roomID", roomID),
						zap.Error(err))
					client.conn.Close()
					delete(room.editorClients, conn)
				}
			}

			// Check WebRTC clients
			for conn, client := range room.webrtcClients {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive WebRTC client detected",
						zap.String("roomID", roomID),
						zap.Error(err))
					client.conn.Close()
					delete(room.webrtcClients, conn)
				}
			}

			// Cleanup peer connections
			for id, pc := range room.peerConns {
				if pc.ConnectionState() == webrtc.PeerConnectionStateClosed {
					delete(room.peerConns, id)
				}
			}

			// Remove empty room
			if len(room.editorClients) == 0 && len(room.webrtcClients) == 0 {
				s.logger.Info("Removing empty room", zap.String("roomID", roomID))
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
		// Close editor clients
		for conn := range room.editorClients {
			conn.Close()
		}
		// Close WebRTC clients
		for conn := range room.webrtcClients {
			conn.Close()
		}
		// Close peer connections
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
