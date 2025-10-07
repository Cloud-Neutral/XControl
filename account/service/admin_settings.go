package service

import (
	"context"

	"gorm.io/gorm"

	internal "xcontrol/account/internal/service"
)

// PermissionMatrix describes the permissions for admin modules.
type PermissionMatrix = internal.PermissionMatrix

var (
	ErrAdminSettingsNotConfigured = internal.ErrAdminSettingsNotConfigured
	ErrAdminSettingsConflict      = internal.ErrAdminSettingsConflict
)

// SetAdminSettingsDB configures the database used to persist admin settings.
func SetAdminSettingsDB(db *gorm.DB) error { return internal.SetAdminSettingsDB(db) }

// GetAdminPermissionMatrix retrieves the current permission matrix from storage.
func GetAdminPermissionMatrix(ctx context.Context) (PermissionMatrix, error) {
	return internal.GetAdminPermissionMatrix(ctx)
}

// UpdateAdminPermissionMatrix stores the provided permission matrix.
func UpdateAdminPermissionMatrix(ctx context.Context, matrix PermissionMatrix) (PermissionMatrix, error) {
	return internal.UpdateAdminPermissionMatrix(ctx, matrix)
}
