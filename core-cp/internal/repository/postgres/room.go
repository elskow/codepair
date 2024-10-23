package postgres

import (
	"context"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type roomRepository struct {
	db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) domain.RoomRepository {
	return &roomRepository{db: db}
}

func (r *roomRepository) Create(ctx context.Context, room *domain.Room) error {
	return r.db.WithContext(ctx).Create(room).Error
}

func (r *roomRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Room, error) {
	var room domain.Room
	err := r.db.WithContext(ctx).
		Preload("Users").
		First(&room, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *roomRepository) FindByUser(ctx context.Context, userID uuid.UUID) ([]domain.Room, error) {
	var rooms []domain.Room
	err := r.db.WithContext(ctx).
		Joins("JOIN user_rooms ON rooms.id = user_rooms.room_id").
		Where("user_rooms.user_id = ?", userID).
		Find(&rooms).Error
	return rooms, err
}

func (r *roomRepository) Update(ctx context.Context, room *domain.Room) error {
	return r.db.WithContext(ctx).Save(room).Error
}

func (r *roomRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Room{}, "id = ?", id).Error
}

func (r *roomRepository) AddUserToRoom(ctx context.Context, userRoom *domain.UserRoom) error {
	return r.db.WithContext(ctx).Create(userRoom).Error
}

func (r *roomRepository) RemoveUserFromRoom(ctx context.Context, userID, roomID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND room_id = ?", userID, roomID).
		Delete(&domain.UserRoom{}).Error
}

func (r *roomRepository) UpdateUserRole(ctx context.Context, userID, roomID uuid.UUID, role string) error {
	return r.db.WithContext(ctx).
		Model(&domain.UserRoom{}).
		Where("user_id = ? AND room_id = ?", userID, roomID).
		Update("role", role).Error
}
