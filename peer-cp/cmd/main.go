package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/elskow/codepair/peer-cp/config"
	"github.com/elskow/codepair/peer-cp/middleware"
	"github.com/elskow/codepair/peer-cp/server"
	"github.com/gofiber/contrib/fiberzap/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

func main() {
	configFile := flag.String("config", "config.yaml", "Path to the config file")
	flag.Parse()

	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}
	defer logger.Sync()

	cfg, err := config.LoadConfig(*configFile)
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	app := fiber.New(fiber.Config{
		AppName: "CodePair Peer Service",
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	app.Use(recover.New())

	app.Use(fiberzap.New(fiberzap.Config{
		Logger: logger,
	}))

	srv := server.NewServer(app, logger, cfg)

	app.Get("/editor/:roomId", websocket.New(srv.HandleEditorWS))
	app.Use("/editor/*", middleware.UpgradeWebSocket)
	app.Get("/videochat/:roomId", websocket.New(srv.HandleVideoChatWS))
	app.Use("/videochat/*", middleware.UpgradeWebSocket)
	app.Get("/chat/:roomId", websocket.New(srv.HandleChatWS))
	app.Use("/chat/*", middleware.UpgradeWebSocket)
	app.Get("/notes/:roomId", websocket.New(srv.HandleNotesWS))
	app.Use("/notes/*", middleware.UpgradeWebSocket)

	go func() {
		logger.Info("Server starting", zap.String("address", cfg.Server.Address))
		if err := app.Listen(cfg.Server.Address); err != nil {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(
		context.Background(),
		cfg.Server.ShutdownTimeout,
	)
	defer cancel()

	if err = srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server stopped gracefully")
}
