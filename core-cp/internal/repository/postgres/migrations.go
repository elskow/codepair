package postgres

import (
	"github.com/elskow/codepair/core-cp/internal/domain"
	"gorm.io/gorm"
)

func AutoMigrate(db *gorm.DB) error {
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";").Error; err != nil {
		return err
	}

	return db.AutoMigrate(
		&domain.User{},
		&domain.Room{},
	)
}
