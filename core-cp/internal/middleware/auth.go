package middleware

import (
	"strings"
	"time"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type AuthMiddleware struct {
	authService  domain.AuthService
	userRoomRepo domain.UserRoomRepository
	logger       *zap.Logger
}

func NewAuthMiddleware(authService domain.AuthService, userRoomRepo domain.UserRoomRepository, logger *zap.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		authService:  authService,
		userRoomRepo: userRoomRepo,
		logger:       logger,
	}
}

func (m *AuthMiddleware) RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			m.logger.Info("missing authorization header",
				zap.String("path", c.Path()),
				zap.String("ip", c.IP()),
			)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing authorization header",
			})
		}

		// Check if the header starts with "Bearer "
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			m.logger.Info("invalid authorization header format",
				zap.String("path", c.Path()),
				zap.String("ip", c.IP()),
			)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid authorization header format",
			})
		}

		token := parts[1]
		user, err := m.authService.ValidateToken(c.Context(), token)
		if err != nil {
			m.logger.Info("invalid or expired token",
				zap.String("path", c.Path()),
				zap.String("ip", c.IP()),
				zap.Error(err),
			)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		// Store user in context for later use
		c.Locals("user", user)
		return c.Next()
	}
}

// Logger middleware with proper zap logger
func LoggerMiddleware(logger *zap.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		logger.Info("request processed",
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.Int("status", c.Response().StatusCode()),
			zap.Duration("latency", time.Since(start)),
			zap.String("ip", c.IP()),
		)

		return err
	}
}

// CORS middleware configuration
func CORSMiddleware() fiber.Handler {
	return cors.New(cors.Config{
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
		MaxAge:       300,
	})
}

// Rate limiter middleware configuration
func RateLimiterMiddleware() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        30,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "too many requests",
			})
		},
	})
}

func (m *AuthMiddleware) userHasRoleInRoom(userID uuid.UUID, roomID string, requiredRole string) bool {
	roomUUID, err := uuid.Parse(roomID)
	if err != nil {
		m.logger.Error("invalid room ID",
			zap.String("roomId", roomID),
			zap.Error(err),
		)
		return false
	}

	role, err := m.userRoomRepo.GetUserRole(userID, roomUUID)
	if err != nil {
		m.logger.Error("failed to get user role",
			zap.String("userId", userID.String()),
			zap.String("roomId", roomID),
			zap.Error(err),
		)
		return false
	}

	// Check if the user's role matches the required role
	switch requiredRole {
	case "owner":
		return role == "owner"
	case "admin":
		return role == "owner" || role == "admin"
	case "member":
		return role == "owner" || role == "admin" || role == "member"
	default:
		m.logger.Error("invalid role requirement",
			zap.String("requiredRole", requiredRole),
		)
		return false
	}
}

func (m *AuthMiddleware) RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := c.Locals("user").(*domain.User)
		roomID := c.Params("roomId")

		// Check if user has required role in the room
		hasRole := false
		for _, role := range roles {
			if m.userHasRoleInRoom(user.ID, roomID, role) {
				hasRole = true
				break
			}
		}

		if !hasRole {
			m.logger.Info("insufficient permissions",
				zap.String("userId", user.ID.String()),
				zap.String("roomId", roomID),
				zap.Strings("requiredRoles", roles),
			)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "insufficient permissions",
			})
		}

		return c.Next()
	}
}
