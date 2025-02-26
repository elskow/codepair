package domain

import (
	"context"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, updates map[string]interface{}) error
	UpdatePassword(ctx context.Context, userID uuid.UUID, hashedPassword string) error
	UpdateRole(ctx context.Context, userID uuid.UUID, role string) error
	UpdateStatus(ctx context.Context, userID uuid.UUID, isActive bool) error
	ListInterviewers(ctx context.Context) ([]User, error)
	DeleteInterviewer(ctx context.Context, userID uuid.UUID) error
}

type RoomRepository interface {
	Create(ctx context.Context, room *Room) error
	FindByID(ctx context.Context, id uuid.UUID) (*Room, error)
	FindByToken(ctx context.Context, token string) (*Room, error)
	GetRoom(ctx context.Context, roomID uuid.UUID) (*Room, error)
	ListRooms(ctx context.Context, interviewerID uuid.UUID, params ListRoomsParams) ([]Room, error)
	SetActive(ctx context.Context, id uuid.UUID, active bool) error
	SearchRooms(ctx context.Context, interviewerID uuid.UUID, query string) ([]Room, error)
	UpdateRoomSettings(ctx context.Context, id uuid.UUID, settings RoomSettings) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type AuthService interface {
	Register(ctx context.Context, user *User) error
	Login(ctx context.Context, email, password string) (string, error)
	ValidateToken(ctx context.Context, token string) (*User, error)
	GetCurrentUser(ctx context.Context, token string) (*User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, name string) error
	UpdatePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error
	UpdateInterviewerRole(ctx context.Context, adminID, userID uuid.UUID, role string) error
	UpdateInterviewerStatus(ctx context.Context, adminID, userID uuid.UUID, isActive bool) error
	CreateInterviewer(ctx context.Context, adminID uuid.UUID, newUser *User) error
	ListInterviewers(ctx context.Context, adminID uuid.UUID) ([]User, error)
	DeleteInterviewer(ctx context.Context, adminID, userID uuid.UUID) error
}

type RoomService interface {
	CreateRoom(ctx context.Context, interviewer *User, candidateName string) (*Room, error)
	GetRoom(ctx context.Context, roomID uuid.UUID) (*Room, error)
	ValidateRoomToken(ctx context.Context, token string) (*Room, error)
	ListRooms(ctx context.Context, interviewerID uuid.UUID, params ListRoomsParams) ([]Room, error)
	EndInterview(ctx context.Context, roomID uuid.UUID, interviewerID uuid.UUID) error
	SearchRooms(ctx context.Context, interviewerID uuid.UUID, query string) ([]Room, error)
	UpdateRoomSettings(ctx context.Context, roomID uuid.UUID, interviewerID uuid.UUID, settings RoomSettings) error
	DeleteRoom(ctx context.Context, roomID uuid.UUID, interviewerID uuid.UUID) error
}
