package server

import (
	"context"
	"encoding/json"

	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type NotesClient struct {
	conn *websocket.Conn
}

type NotesMessage struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	HTML    string `json:"html,omitempty"`
}

func (s *Server) handleNotesMessage(ctx context.Context, c *websocket.Conn, roomID string, msg NotesMessage) {
	logger := s.getLogger(ctx)

	s.roomsMutex.RLock()
	room, exists := s.rooms[roomID]
	s.roomsMutex.RUnlock()

	if !exists {
		logger.Error("Room not found", zap.String("roomID", roomID))
		return
	}

	switch msg.Type {
	case "content":
		room.currentNotes = msg.Content
		logger.Debug("Notes updated", zap.String("roomID", roomID))
	}

	messageJSON, err := json.Marshal(msg)
	if err != nil {
		logger.Error("Failed to marshal notes message", zap.Error(err))
		return
	}

	room.clientsMutex.RLock()
	for client := range room.notesClients {
		if client != c {
			err := client.WriteMessage(websocket.TextMessage, messageJSON)
			if err != nil {
				logger.Error("Failed to broadcast notes message", zap.Error(err))
			}
		}
	}
	room.clientsMutex.RUnlock()
}
