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

func (s *roomService) GetRoom(ctx context.Context, id uuid.UUID) (*domain.Room, error) {
	return s.roomRepo.FindByID(ctx, id)
}

func (s *roomService) ValidateRoomToken(ctx context.Context, token string) (*domain.Room, error) {
	room, err := s.roomRepo.FindByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if !room.IsActive {
		return nil, errors.New("room is no longer active")
	}

	return room, nil
}

func (s *roomService) GetInterviewerRooms(ctx context.Context, interviewerID uuid.UUID) ([]domain.Room, error) {
	return s.roomRepo.FindByInterviewer(ctx, interviewerID)
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
