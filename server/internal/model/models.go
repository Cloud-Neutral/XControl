package model

import (
	"time"

	"github.com/lib/pq"
)

type User struct {
	ID          string         `gorm:"type:uuid;primaryKey" json:"id"`
	Email       string         `json:"email"`
	Level       int            `json:"level"`
	Role        string         `json:"role"`
	Groups      pq.StringArray `gorm:"type:text[]" json:"groups"`
	Permissions pq.StringArray `gorm:"type:text[]" json:"permissions"`
	Active      bool           `json:"active"`
	Upload      int64          `json:"upload"`
	Download    int64          `json:"download"`
	ExpireAt    *time.Time     `json:"expire_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type Node struct {
	ID        string    `gorm:"type:uuid;primaryKey" json:"id"`
	Name      string    `json:"name"`
	Location  string    `json:"location"`
	Protocols string    `json:"protocols"`
	Address   string    `json:"address"`
	Available bool      `json:"available"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
