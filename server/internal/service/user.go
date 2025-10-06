package service

import (
	"context"

	"gorm.io/gorm"
	"xcontrol/internal/roles"
	"xcontrol/server/internal/model"
)

var db *gorm.DB

func SetDB(d *gorm.DB) { db = d }

func ListUsers(ctx context.Context) ([]model.User, error) {
	var users []model.User
	if err := db.WithContext(ctx).Find(&users).Error; err != nil {
		return nil, err
	}
	for i := range users {
		level, role := roles.Normalize(users[i].Level, users[i].Role)
		users[i].Level = level
		users[i].Role = role
	}
	return users, nil
}
