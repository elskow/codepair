package domain

import (
	"context"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
}

type RoomRepository interface {
	Create(ctx context.Context, room *Room) error
	FindByID(ctx context.Context, id uuid.UUID) (*Room, error)
	FindByToken(ctx context.Context, token string) (*Room, error)
	FindByInterviewer(ctx context.Context, interviewerID uuid.UUID) ([]Room, error)
	SetActive(ctx context.Context, id uuid.UUID, active bool) error
}

type AuthService interface {
	Register(ctx context.Context, user *User) error
	Login(ctx context.Context, email, password string) (string, error)
	ValidateToken(ctx context.Context, token string) (*User, error)
}

type RoomService interface {
	CreateRoom(ctx context.Context, interviewer *User, candidateName string) (*Room, error)
	GetRoom(ctx context.Context, id uuid.UUID) (*Room, error)
	ValidateRoomToken(ctx context.Context, token string) (*Room, error)
	GetInterviewerRooms(ctx context.Context, interviewerID uuid.UUID) ([]Room, error)
	EndInterview(ctx context.Context, roomID uuid.UUID, interviewerID uuid.UUID) error
}
