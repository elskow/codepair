package postgres

import (
	"fmt"
	"log"
	"time"

	"github.com/elskow/codepair/core-cp/internal/domain"
	"github.com/elskow/codepair/core-cp/pkg/utils"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewConnection(dsn string) (*gorm.DB, error) {
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	db, err := gorm.Open(postgres.Open(dsn), config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Run migrations
	if err := AutoMigrate(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	// Create initial user
	if err := CreateInitialUser(db); err != nil {
		return nil, fmt.Errorf("failed to create initial user: %w", err)
	}

	return db, nil
}

func CreateInitialUser(db *gorm.DB) error {
	// Check if the initial user already exists
	var count int64
	if err := db.Model(&domain.User{}).Count(&count).Error; err != nil {
		return err
	}

	// If there are no users, create the initial user
	if count == 0 {
		hashedPassword, err := utils.HashPassword("admin123") // Set default password
		if err != nil {
			return err
		}

		initialUser := &domain.User{
			Email:    "admin@codepair.com",
			Password: hashedPassword,
			Name:     "Admin Interviewer",
			Role:     "lead",
			IsActive: true,
		}

		if err := db.Create(initialUser).Error; err != nil {
			return err
		}

		log.Printf("Created initial user with email: %s", initialUser.Email)
	}

	return nil
}
