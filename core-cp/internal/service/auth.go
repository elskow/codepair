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
	userRepo      domain.UserRepository
	config        *config.Config
	revokedTokens map[string]bool
}

func (s *authService) GetCurrentUser(ctx context.Context, token string) (*domain.User, error) {
	return s.ValidateToken(ctx, token)
}

func NewAuthService(userRepo domain.UserRepository, config *config.Config) domain.AuthService {
	return &authService{
		userRepo:      userRepo,
		config:        config,
		revokedTokens: make(map[string]bool),
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
	if err != nil || !utils.CheckPassword(password, user.Password) {
		return "", errors.New("invalid email or password")
	}

	token, err := s.generateToken(user, s.config.JWT.TokenExpiry)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *authService) ValidateToken(ctx context.Context, tokenString string) (*domain.User, error) {
	if s.revokedTokens[tokenString] {
		return nil, errors.New("token has been revoked")
	}

	claims, err := s.validateToken(tokenString)
	if err != nil {
		return nil, err
	}

	userID, err := uuid.Parse(claims["userId"].(string))
	if err != nil {
		return nil, err
	}

	return s.userRepo.FindByID(ctx, userID)
}

func (s *authService) UpdateProfile(ctx context.Context, userID uuid.UUID, name string) error {
	updates := map[string]interface{}{
		"name": name,
	}
	return s.userRepo.UpdateProfile(ctx, userID, updates)
}

func (s *authService) UpdatePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	if !utils.CheckPassword(currentPassword, user.Password) {
		return errors.New("current password is incorrect")
	}

	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePassword(ctx, userID, hashedPassword)
}

func (s *authService) CreateInterviewer(ctx context.Context, adminID uuid.UUID, newUser *domain.User) error {
	admin, err := s.userRepo.FindByID(ctx, adminID)
	if err != nil {
		return err
	}

	if admin.Role != "lead" {
		return errors.New("unauthorized: only lead interviewers can create new interviewers")
	}

	hashedPassword, err := utils.HashPassword(newUser.Password)
	if err != nil {
		return err
	}

	newUser.Password = hashedPassword
	return s.userRepo.Create(ctx, newUser)
}

func (s *authService) UpdateInterviewerRole(ctx context.Context, adminID, userID uuid.UUID, role string) error {
	admin, err := s.userRepo.FindByID(ctx, adminID)
	if err != nil {
		return err
	}

	if admin.Role != "lead" {
		return errors.New("unauthorized: only lead interviewers can update roles")
	}

	if role != "interviewer" && role != "lead" {
		return errors.New("invalid role")
	}

	return s.userRepo.UpdateRole(ctx, userID, role)
}

func (s *authService) UpdateInterviewerStatus(ctx context.Context, adminID, userID uuid.UUID, isActive bool) error {
	admin, err := s.userRepo.FindByID(ctx, adminID)
	if err != nil {
		return err
	}

	if admin.Role != "lead" {
		return errors.New("unauthorized: only lead interviewers can update status")
	}

	return s.userRepo.UpdateStatus(ctx, userID, isActive)
}

func (s *authService) ListInterviewers(ctx context.Context, adminID uuid.UUID) ([]domain.User, error) {
	admin, err := s.userRepo.FindByID(ctx, adminID)
	if err != nil {
		return nil, err
	}

	if admin.Role != "lead" {
		return nil, errors.New("unauthorized: only lead interviewers can list interviewers")
	}

	return s.userRepo.ListInterviewers(ctx)
}

func (s *authService) DeleteInterviewer(ctx context.Context, adminID, userID uuid.UUID) error {
	admin, err := s.userRepo.FindByID(ctx, adminID)
	if err != nil {
		return err
	}

	if admin.Role != "lead" {
		return errors.New("unauthorized: only lead interviewers can delete interviewers")
	}

	if adminID == userID {
		return errors.New("cannot delete yourself")
	}

	_, err = s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	return s.userRepo.DeleteInterviewer(ctx, userID)
}

func (s *authService) generateToken(user *domain.User, expiry time.Duration) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.ID.String(),
		"email":  user.Email,
		"exp":    time.Now().Add(expiry).Unix(),
	})

	return token.SignedString([]byte(s.config.JWT.Secret))
}

func (s *authService) validateToken(tokenString string) (jwt.MapClaims, error) {
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
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
