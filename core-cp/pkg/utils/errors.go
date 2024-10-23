package utils

import (
	"errors"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidToken       = errors.New("invalid token")
	ErrRoomNotFound       = errors.New("room not found")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrUserNotInRoom      = errors.New("user is not in room")
)
