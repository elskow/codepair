package domain

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email     string    `gorm:"unique;not null"`
	Password  string    `gorm:"not null"`
	Name      string    `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
	Rooms     []Room `gorm:"many2many:user_rooms;"`
}

type Room struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string    `gorm:"not null"`
	Description string
	CreatedBy   uuid.UUID `gorm:"type:uuid;not null"`
	IsPrivate   bool      `gorm:"default:false"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Users       []User `gorm:"many2many:user_rooms;"`
}

type UserRoom struct {
	UserID    uuid.UUID `gorm:"type:uuid"`
	RoomID    uuid.UUID `gorm:"type:uuid"`
	Role      string    `gorm:"type:varchar(20)"`
	JoinedAt  time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}
