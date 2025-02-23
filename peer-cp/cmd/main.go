package main

import (
	"flag"
	"log"

	"github.com/elskow/codepair/peer-cp/config"
	"github.com/elskow/codepair/peer-cp/server"
	"github.com/gofiber/contrib/fiberzap/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

func main() {
	configFile := flag.String("config", "config.yaml", "Path to the config file")
	flag.Parse()

	config, err := config.LoadConfig(*configFile)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}
	defer logger.Sync()

	app := fiber.New(fiber.Config{
		AppName: "CodePair Peer Service",
	})

	// Add CORS middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*", // For development. In production, set to your frontend URL
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	app.Use("/editor/*", func(c *fiber.Ctx) error {
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
	})

	app.Use("/videochat/*", func(c *fiber.Ctx) error {
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
	})

	app.Use(fiberzap.New(fiberzap.Config{
		Logger: logger,
	}))

	srv := server.NewServer(app, logger, config)
	srv.SetupRoutes()

	// Add OPTIONS handler for WebSocket endpoints
	app.Options("/videochat/*", func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		return c.SendStatus(fiber.StatusOK)
	})

	app.Options("/editor/*", func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", "*")
		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		return c.SendStatus(fiber.StatusOK)
	})

	// Start server
	log.Printf("Server starting on %s", config.Server.Address)
	if err := app.Listen(config.Server.Address); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}
