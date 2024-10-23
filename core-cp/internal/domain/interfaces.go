package domain

import (
	"context"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type RoomRepository interface {
	Create(ctx context.Context, room *Room) error
	FindByID(ctx context.Context, id uuid.UUID) (*Room, error)
	FindByUser(ctx context.Context, userID uuid.UUID) ([]Room, error)
	Update(ctx context.Context, room *Room) error
	Delete(ctx context.Context, id uuid.UUID) error
	AddUserToRoom(ctx context.Context, userID, roomID uuid.UUID, role string) error
	RemoveUserFromRoom(ctx context.Context, userID, roomID uuid.UUID) error
	UpdateUserRole(ctx context.Context, userID, roomID uuid.UUID, role string) error
	GetUserRole(ctx context.Context, userID, roomID uuid.UUID) (string, error)
}

type AuthService interface {
	Register(ctx context.Context, user *User) error
	Login(ctx context.Context, email, password string) (string, error)
	ValidateToken(ctx context.Context, token string) (*User, error)
}

type RoomService interface {
	CreateRoom(ctx context.Context, room *Room) error
	GetRoom(ctx context.Context, id uuid.UUID) (*Room, error)
	UpdateRoom(ctx context.Context, room *Room) error
	DeleteRoom(ctx context.Context, id uuid.UUID) error
	JoinRoom(ctx context.Context, userID, roomID uuid.UUID) error
	LeaveRoom(ctx context.Context, userID, roomID uuid.UUID) error
	UpdateUserRole(ctx context.Context, userID, roomID uuid.UUID, role string) error
	GetUserRooms(ctx context.Context, userID uuid.UUID) ([]Room, error)
}

type UserRoomRepository interface {
	GetUserRole(userID, roomID uuid.UUID) (string, error)
}
