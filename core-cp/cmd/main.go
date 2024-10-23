package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/elskow/codepair/core-cp/config"
	"github.com/elskow/codepair/core-cp/internal/handlers"
	"github.com/elskow/codepair/core-cp/internal/middleware"
	"github.com/elskow/codepair/core-cp/internal/repository/postgres"
	"github.com/elskow/codepair/core-cp/internal/service"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
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

	// Initialize database connection
	db, err := postgres.NewConnection(cfg.Database.GetDSN())
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	// Initialize repositories
	userRepo := postgres.NewUserRepository(db)
	roomRepo := postgres.NewRoomRepository(db)
	userRoomRepo := postgres.NewUserRoomRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg)
	roomService := service.NewRoomService(roomRepo, userRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	roomHandler := handlers.NewRoomHandler(roomService)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(authService, userRoomRepo, logger)

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName: "CodePair Core Service",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			logger.Error("request error",
				zap.Error(err),
				zap.String("path", c.Path()),
				zap.String("method", c.Method()),
			)

			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Setup middleware
	app.Use(middleware.LoggerMiddleware(logger))
	app.Use(middleware.CORSMiddleware())
	app.Use(middleware.RateLimiterMiddleware())

	// Setup routes
	api := app.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)

	// Protected routes
	rooms := api.Group("/rooms", authMiddleware.RequireAuth())
	rooms.Post("/", roomHandler.CreateRoom)
	rooms.Get("/", roomHandler.GetUserRooms)
	rooms.Post("/:roomId/join", roomHandler.JoinRoom)
	rooms.Post("/:roomId/leave", roomHandler.LeaveRoom)

	// Admin routes
	admin := rooms.Group("/:roomId/admin", authMiddleware.RequireRole("admin", "owner"))
	admin.Put("/", roomHandler.UpdateRoom)
	admin.Delete("/", roomHandler.DeleteRoom)
	admin.Put("/users/:userId/role", roomHandler.UpdateUserRole)

	// Graceful shutdown setup
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := app.Listen(cfg.Server.Port); err != nil {
			logger.Fatal("failed to start server", zap.Error(err))
		}
	}()

	logger.Info("server started", zap.String("port", cfg.Server.Port))

	<-quit
	logger.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := app.ShutdownWithContext(ctx); err != nil {
		logger.Fatal("server forced to shutdown", zap.Error(err))
	}

	logger.Info("server stopped gracefully")
}
