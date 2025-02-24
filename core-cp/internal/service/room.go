package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/google/uuid"
)

type roomService struct {
	roomRepo domain.RoomRepository
}

func NewRoomService(roomRepo domain.RoomRepository) domain.RoomService {
	return &roomService{
		roomRepo: roomRepo,
	}
}

func (s *roomService) CreateRoom(ctx context.Context, interviewer *domain.User, candidateName string) (*domain.Room, error) {
	// Generate random token for candidate access
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	room := &domain.Room{
		InterviewerID: interviewer.ID,
		CandidateName: candidateName,
		Token:         token,
		IsActive:      true,
	}

	if err := s.roomRepo.Create(ctx, room); err != nil {
		return nil, err
	}

	return room, nil
}

func (s *roomService) GetRoom(ctx context.Context, roomID uuid.UUID) (*domain.Room, error) {
	return s.roomRepo.GetRoom(ctx, roomID)
}

func (s *roomService) ListRooms(ctx context.Context, interviewerID uuid.UUID, params domain.ListRoomsParams) ([]domain.Room, error) {
	return s.roomRepo.ListRooms(ctx, interviewerID, params)
}

func (s *roomService) SearchRooms(ctx context.Context, interviewerID uuid.UUID, query string) ([]domain.Room, error) {
	return s.roomRepo.SearchRooms(ctx, interviewerID, query)
}

func (s *roomService) UpdateRoomSettings(ctx context.Context, roomID uuid.UUID, interviewerID uuid.UUID, settings domain.RoomSettings) error {
	room, err := s.roomRepo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	if room.InterviewerID != interviewerID {
		return errors.New("unauthorized: not the interviewer of this room")
	}

	return s.roomRepo.UpdateRoomSettings(ctx, roomID, settings)
}

func (s *roomService) ValidateRoomToken(ctx context.Context, token string) (*domain.Room, error) {
	room, err := s.roomRepo.FindByToken(ctx, token)
	if err != nil {
		return nil, errors.New("invalid token")
	}

	if !room.IsActive {
		return room, nil
	}

	return room, nil
}

func (s *roomService) EndInterview(ctx context.Context, roomID uuid.UUID, interviewerID uuid.UUID) error {
	room, err := s.roomRepo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	if room.InterviewerID != interviewerID {
		return errors.New("unauthorized: not the interviewer of this room")
	}

	return s.roomRepo.SetActive(ctx, roomID, false)
}

func (s *roomService) DeleteRoom(ctx context.Context, roomID uuid.UUID, interviewerID uuid.UUID) error {
	// First check if the room exists and belongs to the interviewer
	room, err := s.roomRepo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}

	if room.InterviewerID != interviewerID {
		return errors.New("unauthorized: not the interviewer of this room")
	}

	return s.roomRepo.Delete(ctx, roomID)
}
