package server

import (
	"time"

	"github.com/gofiber/websocket/v2"
)

type ChatMessage struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"roomId"`
	UserName  string    `json:"userName"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

type ChatClient struct {
	conn     *websocket.Conn
	username string
}

type ChatEvent struct {
	Type     string      `json:"type"`
	UserName string      `json:"userName"`
	Content  string      `json:"content,omitempty"`
	Message  ChatMessage `json:"message,omitempty"`
}
