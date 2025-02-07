package middleware

import (
	"strings"
	"time"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"go.uber.org/zap"
)

type AuthMiddleware struct {
	authService domain.AuthService
	logger      *zap.Logger
}

func NewAuthMiddleware(authService domain.AuthService, logger *zap.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
		logger:      logger,
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
