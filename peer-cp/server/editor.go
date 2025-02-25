package server

import (
	"context"
	"encoding/json"

	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type EditorMessage struct {
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

func (s *Server) handleEditorMessage(ctx context.Context, c *websocket.Conn, roomID string, msg EditorMessage) {
	logger := s.getLogger(ctx)

	s.roomsMutex.RLock()
	room, exists := s.rooms[roomID]
	s.roomsMutex.RUnlock()

	if !exists {
		logger.Error("Room not found", zap.String("roomID", roomID))
		return
	}

	switch msg.Type {
	case "code":
		room.currentCode = msg.Code
		room.language = msg.Language
		logger.Debug("Code updated",
			zap.String("roomID", roomID),
			zap.String("language", msg.Language))

	case "cursor":
		logger.Debug("Cursor position updated",
			zap.String("roomID", roomID),
			zap.Int("line", msg.Cursor.Line),
			zap.Int("column", msg.Cursor.Column))
	}

	messageJSON, err := json.Marshal(msg)
	if err != nil {
		logger.Error("Failed to marshal message", zap.Error(err))
		return
	}

	room.clientsMutex.RLock()
	for client := range room.editorClients {
		if client != c {
			err := client.WriteMessage(websocket.TextMessage, messageJSON)
			if err != nil {
				logger.Error("Failed to broadcast message", zap.Error(err))
			}
		}
	}
	room.clientsMutex.RUnlock()
}
