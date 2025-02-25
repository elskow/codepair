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
	chatClients   map[*websocket.Conn]*ChatClient
	notesClients  map[*websocket.Conn]*NotesClient
	clientsMutex  sync.RWMutex
	currentCode   string
	language      string
	chatMessages  []ChatMessage
	currentNotes  string
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

func newRoom() *Room {
	return &Room{
		editorClients: make(map[*websocket.Conn]*EditorClient),
		webrtcClients: make(map[*websocket.Conn]*WebRTCClient),
		chatClients:   make(map[*websocket.Conn]*ChatClient),
		notesClients:  make(map[*websocket.Conn]*NotesClient),
		chatMessages:  make([]ChatMessage, 0),
		peerConns:     make(map[string]*webrtc.PeerConnection),
	}
}

func (s *Server) validateRoom(roomID, token string) (*client.Room, error) {
	if token == "" {
		return nil, fmt.Errorf("token is required")
	}

	s.logger.Debug("Validating room",
		zap.String("roomID", roomID),
		zap.String("tokenPrefix", func() string {
			if len(token) > 10 {
				return token[:10]
			}
			return "token_too_short"
		}()))

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
			room.clientsMutex.Lock()

			for conn, editorClient := range room.editorClients {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive editor client detected",
						zap.String("roomID", roomID),
						zap.Error(err))
					editorClient.conn.Close()
					delete(room.editorClients, conn)
				}
			}

			for conn, rtcClient := range room.webrtcClients {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive WebRTC client detected",
						zap.String("roomID", roomID),
						zap.Error(err))
					rtcClient.conn.Close()
					delete(room.webrtcClients, conn)
				}
			}

			for conn, chatClient := range room.chatClients {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive chat client detected",
						zap.String("roomID", roomID),
						zap.Error(err))
					chatClient.conn.Close()
					delete(room.chatClients, conn)
				}
			}

			for conn, notesClient := range room.notesClients {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					s.logger.Warn("Inactive notes client detected",
						zap.String("roomID", roomID),
						zap.Error(err))
					notesClient.conn.Close()
					delete(room.notesClients, conn)
				}
			}

			for id, pc := range room.peerConns {
				if pc.ConnectionState() == webrtc.PeerConnectionStateClosed {
					delete(room.peerConns, id)
				}
			}

			if len(room.editorClients) == 0 &&
				len(room.webrtcClients) == 0 &&
				len(room.chatClients) == 0 {
				s.logger.Info("Removing empty room", zap.String("roomID", roomID))
				delete(s.rooms, roomID)
			}

			room.clientsMutex.Unlock()
		}
		s.roomsMutex.Unlock()
	}
}
