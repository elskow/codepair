package service

import (
	"context"
	"errors"
	"time"

	"github.com/elskow/codepair/core-cp/config"
	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/elskow/codepair/core-cp/pkg/utils"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type authService struct {
	userRepo domain.UserRepository
	config   *config.Config
}

func NewAuthService(userRepo domain.UserRepository, config *config.Config) domain.AuthService {
	return &authService{
		userRepo: userRepo,
		config:   config,
	}
}

func (s *authService) Register(ctx context.Context, user *domain.User) error {
	// Check if user exists
	existing, err := s.userRepo.FindByEmail(ctx, user.Email)
	if err == nil && existing != nil {
		return errors.New("user already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		return err
	}

	user.Password = hashedPassword
	return s.userRepo.Create(ctx, user)
}

func (s *authService) Login(ctx context.Context, email, password string) (string, error) {
	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	if !utils.CheckPassword(password, user.Password) {
		return "", errors.New("invalid credentials")
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.ID.String(),
		"email":  user.Email,
		"exp":    time.Now().Add(s.config.JWT.TokenExpiry).Unix(),
	})

	tokenString, err := token.SignedString([]byte(s.config.JWT.Secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (s *authService) ValidateToken(ctx context.Context, tokenString string) (*domain.User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID := claims["userId"].(string)
		id, err := uuid.Parse(userID)
		if err != nil {
			return nil, err
		}

		return s.userRepo.FindByID(ctx, id)
	}

	return nil, errors.New("invalid token")
}
