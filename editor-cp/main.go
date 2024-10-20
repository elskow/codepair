package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/contrib/fiberzap/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/healthcheck"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
	"go.uber.org/zap"
)

const (
	address = ":8080"
)

func main() {
	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	app := fiber.New(fiber.Config{AppName: "PeerEditor Modules"})

	app.Use(fiberzap.New(fiberzap.Config{
		Logger: logger,
	}))

	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(healthcheck.New())
	app.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))

	server := NewServer(app, logger)
	server.setupRoutes()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := app.Listen(address); err != nil {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	logger.Info("Server started", zap.String("address", address))

	<-stop

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	<-ctx.Done()
	logger.Info("Server stopped gracefully")
}
