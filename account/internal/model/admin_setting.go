package model

import "time"

// AdminSetting represents a single permission flag for a module/role combination.
type AdminSetting struct {
	ID        uint   `gorm:"primaryKey"`
	ModuleKey string `gorm:"size:128;not null;index:idx_admin_settings_module_role,unique"`
	Role      string `gorm:"size:64;not null;index:idx_admin_settings_module_role,unique"`
	Enabled   bool   `gorm:"not null"`
	Version   uint   `gorm:"not null;default:1;index"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

// TableName overrides the table used by GORM.
func (AdminSetting) TableName() string { return "admin_settings" }

// AdminSettingVersion tracks the revision of the permission matrix.
type AdminSettingVersion struct {
	ID        uint `gorm:"primaryKey"`
	Version   uint `gorm:"not null;default:0"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

// TableName defines the table used to store matrix revision metadata.
func (AdminSettingVersion) TableName() string { return "admin_setting_versions" }
