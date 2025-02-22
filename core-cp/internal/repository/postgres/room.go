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

func (r *roomRepository) SearchRooms(ctx context.Context, interviewerID uuid.UUID, query string) ([]domain.Room, error) {
	var rooms []domain.Room
	result := r.db.WithContext(ctx).
		Preload("Interviewer").
		Where("interviewer_id = ? AND candidate_name ILIKE ?", interviewerID, "%"+query+"%").
		Find(&rooms)
	return rooms, result.Error
}

func (r *roomRepository) UpdateRoomSettings(ctx context.Context, id uuid.UUID, settings domain.RoomSettings) error {
	updates := map[string]interface{}{}

	if settings.IsActive != nil {
		updates["is_active"] = *settings.IsActive
	}
	if settings.CandidateName != nil {
		updates["candidate_name"] = *settings.CandidateName
	}

	return r.db.WithContext(ctx).
		Model(&domain.Room{}).
		Where("id = ?", id).
		Updates(updates).
		Error
}

func NewRoomRepository(db *gorm.DB) domain.RoomRepository {
	return &roomRepository{db: db}
}

func (r *roomRepository) Create(ctx context.Context, room *domain.Room) error {
	return r.db.WithContext(ctx).Create(room).Error
}

func (r *roomRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Room, error) {
	var room domain.Room
	err := r.db.WithContext(ctx).First(&room, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *roomRepository) FindByToken(ctx context.Context, token string) (*domain.Room, error) {
	var room domain.Room
	err := r.db.WithContext(ctx).Where("token = ?", token).First(&room).Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *roomRepository) FindByInterviewer(ctx context.Context, interviewerID uuid.UUID) ([]domain.Room, error) {
	var rooms []domain.Room
	err := r.db.WithContext(ctx).Where("interviewer_id = ?", interviewerID).Find(&rooms).Error
	return rooms, err
}

func (r *roomRepository) SetActive(ctx context.Context, id uuid.UUID, active bool) error {
	return r.db.WithContext(ctx).Model(&domain.Room{}).Where("id = ?", id).Update("is_active", active).Error
}
