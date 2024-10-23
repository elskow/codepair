package service

import (
	"context"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/google/uuid"
)

type roomService struct {
	roomRepo domain.RoomRepository
	userRepo domain.UserRepository
}

func NewRoomService(roomRepo domain.RoomRepository, userRepo domain.UserRepository) domain.RoomService {
	return &roomService{
		roomRepo: roomRepo,
		userRepo: userRepo,
	}
}

func (s *roomService) CreateRoom(ctx context.Context, room *domain.Room) error {
	return s.roomRepo.Create(ctx, room)
}

func (s *roomService) GetRoom(ctx context.Context, id uuid.UUID) (*domain.Room, error) {
	return s.roomRepo.FindByID(ctx, id)
}

func (s *roomService) UpdateRoom(ctx context.Context, room *domain.Room) error {
	return s.roomRepo.Update(ctx, room)
}

func (s *roomService) DeleteRoom(ctx context.Context, id uuid.UUID) error {
	return s.roomRepo.Delete(ctx, id)
}

func (s *roomService) JoinRoom(ctx context.Context, userID, roomID uuid.UUID) error {
	// Check if room exists
	_, err := s.roomRepo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	// Check if user exists
	_, err = s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	// Add user to room with "member" role
	return s.roomRepo.AddUserToRoom(ctx, userID, roomID, "member")
}

func (s *roomService) LeaveRoom(ctx context.Context, userID, roomID uuid.UUID) error {
	return s.roomRepo.RemoveUserFromRoom(ctx, userID, roomID)
}

func (s *roomService) UpdateUserRole(ctx context.Context, userID, roomID uuid.UUID, role string) error {
	return s.roomRepo.UpdateUserRole(ctx, userID, roomID, role)
}

func (s *roomService) GetUserRooms(ctx context.Context, userID uuid.UUID) ([]domain.Room, error) {
	return s.roomRepo.FindByUser(ctx, userID)
}
