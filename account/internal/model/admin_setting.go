package model

import "time"

// AdminSetting represents a single permission toggle in the admin matrix.
type AdminSetting struct {
	ID        uint      `gorm:"primaryKey"`
	ModuleKey string    `gorm:"size:128;not null;uniqueIndex:idx_admin_settings_module_role"`
	Role      string    `gorm:"size:32;not null;uniqueIndex:idx_admin_settings_module_role"`
	Enabled   bool      `gorm:"not null"`
	Version   uint      `gorm:"not null;index"`
	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`
}

// TableName overrides the default table name used by GORM.
func (AdminSetting) TableName() string { return "admin_settings" }
