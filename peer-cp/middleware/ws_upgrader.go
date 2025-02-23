package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func UpgradeWebSocket(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		token := c.Query("token")
		if token == "" {
			return fiber.ErrUnauthorized
		}
		c.Set("Upgrade", "websocket")
		c.Set("Connection", "Upgrade")
		c.Locals("allowed", true)
		return c.Next()
	}
	return fiber.ErrUpgradeRequired
}
