package main

import (
	"log"
)

const (
	address = ":3000"
)

func main() {
	server := NewServer()
	server.setupRoutes()
	log.Fatal(server.app.Listen(address))
}
