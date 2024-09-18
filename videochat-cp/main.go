package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const (
	address = ":3000"
)

func main() {
	server := NewServer()
	server.setupRoutes()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := server.app.Listen(address); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Println("Server started")

	<-stop

	log.Println("Shutting down server...")

	_, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	server.clientsMutex.Lock()
	for client := range server.clients {
		client.Close()
	}
	server.clientsMutex.Unlock()

	if err := server.app.Shutdown(); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped gracefully")
}
