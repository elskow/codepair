package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email     string    `gorm:"unique;not null"`
	Password  string    `gorm:"not null"`
	Name      string    `gorm:"not null"`
	Role      string    `gorm:"type:varchar(20);default:'interviewer'"`
	IsActive  bool      `gorm:"default:true"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Room struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	InterviewerID uuid.UUID `gorm:"type:uuid;not null"`
	Interviewer   User      `gorm:"foreignKey:InterviewerID"`
	CandidateName string    `gorm:"not null"`
	Token         string    `gorm:"unique;not null"`
	IsActive      bool      `gorm:"default:true"`

	ScheduledTime  *time.Time     `gorm:"index"`
	Duration       int            `gorm:"default:60"` // in minutes
	TechnicalStack pq.StringArray `gorm:"type:text[]"`
	Description    string         `gorm:"type:text"`
	Notes          string         `gorm:"type:text"`

	CreatedAt time.Time `gorm:"index"`
	UpdatedAt time.Time `gorm:"index"`
}
