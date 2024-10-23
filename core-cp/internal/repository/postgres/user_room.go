package postgres

import (
	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/elskow/codepair/core-cp/pkg/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type userRoomRepository struct {
	db *gorm.DB
}

func NewUserRoomRepository(db *gorm.DB) domain.UserRoomRepository {
	return &userRoomRepository{
		db: db,
	}
}

func (r *userRoomRepository) GetUserRole(userID, roomID uuid.UUID) (string, error) {
	var userRoom domain.UserRoom
	err := r.db.Where("user_id = ? AND room_id = ?", userID, roomID).First(&userRoom).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", utils.ErrUserNotInRoom
		}
		return "", err
	}
	return userRoom.Role, nil
}
