package service

import (
	"context"
	"testing"
	"time"

	"github.com/elskow/codepair/core-cp/config"
	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/elskow/codepair/core-cp/pkg/utils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockUserRepository struct {
	mock.Mock
}

func (m *mockUserRepository) Create(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *mockUserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *mockUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *mockUserRepository) Update(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *mockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func TestAuthService_Register(t *testing.T) {
	mockRepo := new(mockUserRepository)
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:      "test-secret",
			TokenExpiry: 24 * 60 * 60,
		},
	}
	authService := NewAuthService(mockRepo, cfg)

	ctx := context.Background()
	user := &domain.User{
		Email:    "test@example.com",
		Password: "password123",
		Name:     "Test User",
	}

	mockRepo.On("FindByEmail", ctx, user.Email).Return((*domain.User)(nil), nil)
	mockRepo.On("Create", ctx, mock.AnythingOfType("*domain.User")).Return(nil)

	err := authService.Register(ctx, user)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestAuthService_Login(t *testing.T) {
	mockRepo := new(mockUserRepository)
	cfg := &config.Config{
		JWT: config.JWTConfig{
			Secret:             "test-secret",
			TokenExpiry:        24 * time.Hour,
			RefreshTokenExpiry: 7 * 24 * time.Hour,
		},
	}
	authService := NewAuthService(mockRepo, cfg)

	ctx := context.Background()
	email := "test@example.com"
	password := "password123"

	hashedPassword, _ := utils.HashPassword(password)
	user := &domain.User{
		ID:       uuid.New(),
		Email:    email,
		Password: hashedPassword,
	}

	mockRepo.On("FindByEmail", ctx, email).Return(user, nil)

	accessToken, refreshToken, err := authService.Login(ctx, email, password)

	assert.NoError(t, err)
	assert.NotEmpty(t, accessToken)
	assert.NotEmpty(t, refreshToken)
	mockRepo.AssertExpectations(t)
}
