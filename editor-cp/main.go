package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
)

const (
	address = ":8080"
)

func main() {
	app := fiber.New(fiber.Config{AppName: "PeerEditor Modules"})

	app.Use(compress.New(compress.Config{Level: compress.LevelBestSpeed}))

	server := NewServer()
	server.setupRoutes(app)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := app.Listen(address); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Println("Server started on", address)

	<-stop

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	server.roomsMutex.Lock()
	for _, room := range server.rooms {
		room.clientsMutex.Lock()
		for client := range room.clients {
			client.Close()
		}
		room.clientsMutex.Unlock()
	}
	server.roomsMutex.Unlock()

	if err := app.Shutdown(); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	<-ctx.Done()
	log.Println("Server stopped gracefully")
}
