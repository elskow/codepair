package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/elskow/codepair/core-cp/config"
	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/elskow/codepair/core-cp/internal/handlers"
	"github.com/elskow/codepair/core-cp/internal/middleware"
	"github.com/elskow/codepair/core-cp/internal/repository/postgres"
	"github.com/elskow/codepair/core-cp/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/lesismal/nbio/nbhttp"
	"go.uber.org/zap"
)

func setupRouter(
	logger *zap.Logger,
	authService domain.AuthService,
	authHandler *handlers.AuthHandler,
	roomHandler *handlers.RoomHandler,
) *gin.Engine {
	r := gin.New()

	r.Use(middleware.CORS())
	r.Use(middleware.Logger(logger))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"time":   time.Now(),
		})
	})

	auth := r.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.GET("/me", middleware.RequireAuth(authService), authHandler.GetCurrentUser)
	}

	rooms := r.Group("/rooms")
	{
		rooms.GET("/join", roomHandler.JoinRoom)

		protected := rooms.Use(middleware.RequireAuth(authService))
		{
			protected.GET("", roomHandler.GetInterviewerRooms)
			protected.POST("", roomHandler.CreateRoom)
			protected.GET("/search", roomHandler.SearchRooms)
			protected.DELETE("/:roomId", roomHandler.DeleteRoom)
			protected.POST("/:roomId/end", roomHandler.EndInterview)
			protected.PATCH("/:roomId/settings", roomHandler.UpdateRoomSettings)
		}
	}

	return r
}

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

	// Setup router
	router := setupRouter(logger, authService, authHandler, roomHandler)

	// NBIO engine configuration
	engine := nbhttp.NewEngine(nbhttp.Config{
		Network: "tcp",
		Addrs:   []string{cfg.Server.Port},
		Handler: router,

		ReadBufferSize:          1024 * 64,   // 64KB
		MaxWriteBufferSize:      1024 * 1024, // 1MB
		MaxLoad:                 1000000,     // Max concurrent connections
		ReleaseWebsocketPayload: true,

		// TODO: SSL/TLS config if needed
		// ServerName:      "localhost",
		// CertFile:        "server.crt",
		// KeyFile:         "server.key",
	})

	// Start the server
	err = engine.Start()
	if err != nil {
		logger.Fatal("failed to start server", zap.Error(err))
	}

	logger.Info("server started",
		zap.String("port", cfg.Server.Port),
		zap.String("mode", "nbio"),
	)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := engine.Shutdown(ctx); err != nil {
		logger.Fatal("server forced to shutdown", zap.Error(err))
	}

	logger.Info("server stopped gracefully")
}
