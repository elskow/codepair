package main

import (
	"context"

	"github.com/gofiber/fiber/v2"
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

func (s *Server) handleVideochatWebSocket(c *fiber.Ctx) error {
	// TODO: Implement proper WebSocket handling for videochat
	return proxyRequest(videochatURL)(c)
}

func (s *Server) handleEditorWebSocket(c *fiber.Ctx) error {
	// TODO: Implement proper WebSocket handling for editor
	return proxyRequest(editorURL)(c)
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.app.ShutdownWithContext(ctx)
}
