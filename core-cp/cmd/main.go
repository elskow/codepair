package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/elskow/codepair/core-cp/config"
	"github.com/elskow/codepair/core-cp/internal/handlers"
	"github.com/elskow/codepair/core-cp/internal/middleware"
	"github.com/elskow/codepair/core-cp/internal/repository/postgres"
	"github.com/elskow/codepair/core-cp/internal/service"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Fatal("failed to load configuration", zap.Error(err))
	}

	// Initialize database
	db, err := postgres.NewConnection(cfg.Database.GetDSN())
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	// Initialize repositories and services
	userRepo := postgres.NewUserRepository(db)
	roomRepo := postgres.NewRoomRepository(db)
	authService := service.NewAuthService(userRepo, cfg)
	roomService := service.NewRoomService(roomRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	roomHandler := handlers.NewRoomHandler(roomService)

	// Initialize Gin
	r := gin.Default()

	// Middlewares
	r.Use(middleware.CORS())
	r.Use(gin.Recovery())
	r.Use(middleware.Logger(logger))

	auth := r.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
	}

	// Room routes
	rooms := r.Group("/rooms")
	rooms.Use(middleware.RequireAuth(authService))
	{
		rooms.POST("/", roomHandler.CreateRoom)
		rooms.GET("/", roomHandler.GetInterviewerRooms)
		rooms.POST("/:roomId/end", roomHandler.EndInterview)
	}

	// Public room routes
	r.GET("/rooms/join", roomHandler.JoinRoom)

	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	// Server setup
	srv := &http.Server{
		Addr:    cfg.Server.Port,
		Handler: r,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("server forced to shutdown", zap.Error(err))
	}

	logger.Info("server stopped gracefully")
}
