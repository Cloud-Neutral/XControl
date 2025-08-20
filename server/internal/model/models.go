package model

import "time"

type User struct {
        ID          string     `gorm:"type:uuid;primaryKey" json:"id"`
        OIDCSubject string     `gorm:"uniqueIndex" json:"oidc_subject"`
        Email       string     `json:"email"`
        Name        string     `json:"name"`
        AvatarURL   string     `json:"avatar_url"`
        Level       int        `json:"level"`
        Active      bool       `json:"active"`
        Upload      int64      `json:"upload"`
        Download    int64      `json:"download"`
        ExpireAt    *time.Time `json:"expire_at"`
        CreatedAt   time.Time  `json:"created_at"`
        UpdatedAt   time.Time  `json:"updated_at"`
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
