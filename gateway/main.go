package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/healthcheck"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

const (
	address = ":8000"
)

func main() {
	app := fiber.New(fiber.Config{
		AppName:      "CodePair Gateway",
		ServerHeader: "CodePair",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  5 * time.Minute,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New())
	app.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))

	// Health check middleware
	app.Use(healthcheck.New(healthcheck.Config{
		LivenessProbe: func(c *fiber.Ctx) bool {
			// TODO: Implement a more robust liveness check
			return true
		},
		ReadinessProbe: func(c *fiber.Ctx) bool {
			// TODO: Implement a more comprehensive readiness check
			return isServiceReachable(videochatURL) && isServiceReachable(editorURL)
		},
	}))

	server := NewServer(app)
	server.setupRoutes()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			log.Fatalf("Server forced to shutdown: %v", err)
		}
	}()

	log.Printf("Starting server on %s", address)
	if err := app.Listen(address); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}

func isServiceReachable(url string) bool {
	// TODO: Implement a more sophisticated health check for services
	_, err := http.Get(url)
	return err == nil
}
