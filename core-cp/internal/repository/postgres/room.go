package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

type roomRepository struct {
	db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) domain.RoomRepository {
	return &roomRepository{db: db}
}

func (r *roomRepository) GetRoom(ctx context.Context, roomID uuid.UUID) (*domain.Room, error) {
	var room domain.Room
	err := r.db.WithContext(ctx).
		Preload("Interviewer").
		First(&room, "id = ?", roomID).
		Error
	if err != nil {
		return nil, err
	}
	return &room, nil
}

func (r *roomRepository) ListRooms(ctx context.Context, interviewerID uuid.UUID, params domain.ListRoomsParams) ([]domain.Room, error) {
	var rooms []domain.Room

	query := r.db.WithContext(ctx).
		Select("rooms.*").
		Joins("LEFT JOIN users ON rooms.interviewer_id = users.id").
		Where("rooms.interviewer_id = ?", interviewerID)

	if params.Status != nil {
		query = query.Where("rooms.is_active = ?", *params.Status)
	}

	var orderClauses []string
	orderClauses = append(orderClauses, "rooms.is_active DESC")

	if params.SortBy == "updated_at" {
		orderClauses = append(orderClauses,
			fmt.Sprintf("rooms.updated_at %s", params.SortOrder),
			fmt.Sprintf("rooms.created_at %s", params.SortOrder),
		)
	} else {
		orderClauses = append(orderClauses,
			fmt.Sprintf("rooms.created_at %s", params.SortOrder),
		)
	}

	query = query.Order(strings.Join(orderClauses, ", "))

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	err := query.Preload("Interviewer").Find(&rooms).Error
	return rooms, err
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
	if settings.ScheduledTime != nil {
		scheduledTime, err := time.Parse(time.RFC3339, *settings.ScheduledTime)
		if err == nil {
			updates["scheduled_time"] = scheduledTime
		}
	}
	if settings.Duration != nil {
		updates["duration"] = *settings.Duration
	}
	if settings.TechnicalStack != nil {
		updates["technical_stack"] = pq.StringArray(settings.TechnicalStack)
	}

	return r.db.WithContext(ctx).
		Model(&domain.Room{}).
		Where("id = ?", id).
		Updates(updates).
		Error
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

func (r *roomRepository) SetActive(ctx context.Context, id uuid.UUID, active bool) error {
	return r.db.WithContext(ctx).Model(&domain.Room{}).Where("id = ?", id).Update("is_active", active).Error
}

func (r *roomRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Room{}, "id = ?", id).Error
}
