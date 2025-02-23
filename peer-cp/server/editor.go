package server

import (
	"context"
	"encoding/json"

	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v4"
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

func (s *Server) HandleEditorWS(c *websocket.Conn) {
	defer c.Close()

	ctx := context.WithValue(context.Background(), "requestID", c.Params("requestId"))
	logger := s.getLogger(ctx)

	roomID := c.Params("roomId")
	token := c.Query("token")

	validRoom, err := s.validateRoom(roomID, token)
	if err != nil {
		logger.Error("Room validation failed", zap.Error(err))
		return
	}

	if !validRoom.IsActive {
		logger.Error("Room is not active")
		return
	}

	client := &EditorClient{
		conn: c,
	}

	s.roomsMutex.Lock()
	localRoom, exists := s.rooms[roomID]
	if !exists {
		localRoom = &Room{
			editorClients: make(map[*websocket.Conn]*EditorClient),
			webrtcClients: make(map[*websocket.Conn]*WebRTCClient),
			peerConns:     make(map[string]*webrtc.PeerConnection),
		}
		s.rooms[roomID] = localRoom
	}
	s.roomsMutex.Unlock()

	localRoom.clientsMutex.Lock()
	localRoom.editorClients[c] = client
	localRoom.clientsMutex.Unlock()

	logger.Info("Editor client connected", zap.String("roomID", roomID))

	// Send current code state to new client
	if localRoom.currentCode != "" {
		syncMessage := EditorMessage{
			Type:     "sync",
			Code:     localRoom.currentCode,
			Language: localRoom.language,
		}
		if err := c.WriteJSON(syncMessage); err != nil {
			logger.Error("Failed to send sync message", zap.Error(err))
		}
	}

	// Handle incoming messages
	for {
		var msg EditorMessage
		err := c.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		s.handleEditorMessage(ctx, c, roomID, msg)
	}

	// Cleanup when client disconnects
	localRoom.clientsMutex.Lock()
	delete(localRoom.editorClients, c)
	localRoom.clientsMutex.Unlock()

	s.roomsMutex.Lock()
	if len(localRoom.editorClients) == 0 && len(localRoom.webrtcClients) == 0 {
		delete(s.rooms, roomID)
		logger.Info("Room closed", zap.String("roomID", roomID))
	}
	s.roomsMutex.Unlock()

	logger.Info("Editor client disconnected", zap.String("roomID", roomID))
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

	case "chat":
		logger.Debug("Chat message received",
			zap.String("roomID", roomID),
			zap.String("message", msg.Chat))
	}

	// Broadcast message to all clients in room except sender
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
