package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/elskow/codepair/videochat-cp/config"
	"github.com/elskow/codepair/videochat-cp/server"
	"github.com/gofiber/contrib/fiberzap/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/healthcheck"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
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

	app := fiber.New(fiber.Config{AppName: "Videochat Modules"})

	app.Use(fiberzap.New(fiberzap.Config{
		Logger: logger,
	}))

	app.Use(requestid.New())
	app.Use(recover.New())
	app.Use(healthcheck.New())
	app.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))

	srv := server.NewServer(app, logger, config)
	srv.SetupRoutes()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := app.Listen(config.Server.Address); err != nil {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	logger.Info("Server started", zap.String("address", config.Server.Address))

	<-stop

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), config.Server.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	<-ctx.Done()
	logger.Info("Server stopped gracefully")
}
