package service

import (
	"context"
	"testing"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockRoomRepository struct {
	mock.Mock
}

func (m *mockRoomRepository) Create(ctx context.Context, room *domain.Room) error {
	args := m.Called(ctx, room)
	return args.Error(0)
}

func (m *mockRoomRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Room, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*domain.Room), args.Error(1)
}

func (m *mockRoomRepository) FindByUser(ctx context.Context, userID uuid.UUID) ([]domain.Room, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]domain.Room), args.Error(1)
}

func (m *mockRoomRepository) Update(ctx context.Context, room *domain.Room) error {
	args := m.Called(ctx, room)
	return args.Error(0)
}

func (m *mockRoomRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockRoomRepository) AddUserToRoom(ctx context.Context, userID, roomID uuid.UUID, role string) error {
	args := m.Called(ctx, userID, roomID, role)
	return args.Error(0)
}

func (m *mockRoomRepository) RemoveUserFromRoom(ctx context.Context, userID, roomID uuid.UUID) error {
	args := m.Called(ctx, userID, roomID)
	return args.Error(0)
}

func (m *mockRoomRepository) UpdateUserRole(ctx context.Context, userID, roomID uuid.UUID, role string) error {
	args := m.Called(ctx, userID, roomID, role)
	return args.Error(0)
}

func (m *mockRoomRepository) GetUserRole(ctx context.Context, userID, roomID uuid.UUID) (string, error) {
	args := m.Called(ctx, userID, roomID)
	return args.String(0), args.Error(1)
}

func TestRoomService_CreateRoom(t *testing.T) {
	mockRoomRepo := new(mockRoomRepository)
	mockUserRepo := new(mockUserRepository)
	roomService := NewRoomService(mockRoomRepo, mockUserRepo)

	ctx := context.Background()
	room := &domain.Room{
		Name:        "Test Room",
		Description: "This is a test room",
		CreatedBy:   uuid.New(),
	}

	mockRoomRepo.On("Create", ctx, room).Return(nil)

	err := roomService.CreateRoom(ctx, room)

	assert.NoError(t, err)
	mockRoomRepo.AssertExpectations(t)
}

func TestRoomService_JoinRoom(t *testing.T) {
	mockRoomRepo := new(mockRoomRepository)
	mockUserRepo := new(mockUserRepository)
	roomService := NewRoomService(mockRoomRepo, mockUserRepo)

	ctx := context.Background()
	userID := uuid.New()
	roomID := uuid.New()

	mockRoomRepo.On("FindByID", ctx, roomID).Return(&domain.Room{}, nil)
	mockUserRepo.On("FindByID", ctx, userID).Return(&domain.User{}, nil)
	mockRoomRepo.On("AddUserToRoom", ctx, userID, roomID, "member").Return(nil)

	err := roomService.JoinRoom(ctx, userID, roomID)

	assert.NoError(t, err)
	mockRoomRepo.AssertExpectations(t)
	mockUserRepo.AssertExpectations(t)
}
