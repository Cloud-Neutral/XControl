package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"xcontrol/account/internal/model"
)

// PermissionMatrix represents the permission matrix with an optimistic locking version.
type PermissionMatrix struct {
	Version uint                       `json:"version"`
	Modules map[string]map[string]bool `json:"modules"`
}

var (
	adminSettingsDBMu sync.RWMutex
	adminSettingsDB   *gorm.DB

	cacheMu      sync.RWMutex
	cachedMatrix PermissionMatrix
	cacheLoaded  bool
)

var (
	// ErrAdminSettingsNotConfigured indicates that the backing database has not been configured.
	ErrAdminSettingsNotConfigured = errors.New("admin settings database is not configured")
	// ErrAdminSettingsConflict indicates that the provided version does not match the stored version.
	ErrAdminSettingsConflict = errors.New("admin settings version conflict")
)

// SetAdminSettingsDB configures the database handle used for admin settings persistence.
func SetAdminSettingsDB(db *gorm.DB) error {
	adminSettingsDBMu.Lock()
	defer adminSettingsDBMu.Unlock()

	adminSettingsDB = db
	cacheMu.Lock()
	cachedMatrix = PermissionMatrix{}
	cacheLoaded = false
	cacheMu.Unlock()

	if db == nil {
		return nil
	}

	if err := db.AutoMigrate(&model.AdminSetting{}, &model.AdminSettingVersion{}); err != nil {
		return fmt.Errorf("auto-migrate admin settings: %w", err)
	}

	return nil
}

func getDB() (*gorm.DB, error) {
	adminSettingsDBMu.RLock()
	defer adminSettingsDBMu.RUnlock()
	if adminSettingsDB == nil {
		return nil, ErrAdminSettingsNotConfigured
	}
	return adminSettingsDB, nil
}

// GetAdminPermissionMatrix returns the cached permission matrix or loads it from the database.
func GetAdminPermissionMatrix(ctx context.Context) (PermissionMatrix, error) {
	cacheMu.RLock()
	if cacheLoaded {
		matrix := cloneMatrix(cachedMatrix)
		cacheMu.RUnlock()
		return matrix, nil
	}
	cacheMu.RUnlock()

	db, err := getDB()
	if err != nil {
		return PermissionMatrix{}, err
	}

	var version model.AdminSettingVersion
	if err := db.WithContext(ctx).FirstOrCreate(&version, model.AdminSettingVersion{ID: 1}).Error; err != nil {
		return PermissionMatrix{}, fmt.Errorf("load admin setting version: %w", err)
	}

	var rows []model.AdminSetting
	if err := db.WithContext(ctx).Order("module_key ASC, role ASC").Find(&rows).Error; err != nil {
		return PermissionMatrix{}, fmt.Errorf("load admin settings: %w", err)
	}

	matrix := buildMatrix(version.Version, rows)

	cacheMu.Lock()
	cachedMatrix = cloneMatrix(matrix)
	cacheLoaded = true
	cacheMu.Unlock()

	return matrix, nil
}

// UpdateAdminPermissionMatrix persists a new permission matrix, applying optimistic locking using the version field.
func UpdateAdminPermissionMatrix(ctx context.Context, matrix PermissionMatrix) (PermissionMatrix, error) {
	db, err := getDB()
	if err != nil {
		return PermissionMatrix{}, err
	}
	normalized, err := normalizeMatrix(matrix)
	if err != nil {
		return PermissionMatrix{}, err
	}

	var updated PermissionMatrix

	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var version model.AdminSettingVersion
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).FirstOrCreate(&version, model.AdminSettingVersion{ID: 1}).Error; err != nil {
			return fmt.Errorf("lock admin setting version: %w", err)
		}

		if version.Version != normalized.Version {
			return ErrAdminSettingsConflict
		}

		newVersion := version.Version + 1

		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&model.AdminSetting{}).Error; err != nil {
			return fmt.Errorf("clear admin settings: %w", err)
		}

		rows := matrixToRows(newVersion, normalized.Modules)
		if len(rows) > 0 {
			if err := tx.Create(&rows).Error; err != nil {
				return fmt.Errorf("insert admin settings: %w", err)
			}
		}

		version.Version = newVersion
		if err := tx.Save(&version).Error; err != nil {
			return fmt.Errorf("update admin setting version: %w", err)
		}

		updated = PermissionMatrix{Version: newVersion, Modules: cloneModules(normalized.Modules)}
		return nil
	})

	if err != nil {
		return PermissionMatrix{}, err
	}

	cacheMu.Lock()
	cachedMatrix = cloneMatrix(updated)
	cacheLoaded = true
	cacheMu.Unlock()

	return updated, nil
}

func normalizeMatrix(matrix PermissionMatrix) (PermissionMatrix, error) {
	modules := make(map[string]map[string]bool, len(matrix.Modules))
	for module, roles := range matrix.Modules {
		trimmedModule := strings.TrimSpace(module)
		if trimmedModule == "" {
			return PermissionMatrix{}, errors.New("module key cannot be empty")
		}
		normalizedRoles := make(map[string]bool, len(roles))
		for role, enabled := range roles {
			trimmedRole := strings.TrimSpace(role)
			if trimmedRole == "" {
				return PermissionMatrix{}, fmt.Errorf("module %q contains an empty role", trimmedModule)
			}
			normalizedRoles[strings.ToLower(trimmedRole)] = enabled
		}
		modules[strings.ToLower(trimmedModule)] = normalizedRoles
	}
	return PermissionMatrix{Version: matrix.Version, Modules: modules}, nil
}

func cloneMatrix(matrix PermissionMatrix) PermissionMatrix {
	return PermissionMatrix{Version: matrix.Version, Modules: cloneModules(matrix.Modules)}
}

func cloneModules(modules map[string]map[string]bool) map[string]map[string]bool {
	if len(modules) == 0 {
		return map[string]map[string]bool{}
	}
	copied := make(map[string]map[string]bool, len(modules))
	for module, roles := range modules {
		dup := make(map[string]bool, len(roles))
		for role, enabled := range roles {
			dup[role] = enabled
		}
		copied[module] = dup
	}
	return copied
}

func matrixToRows(version uint, modules map[string]map[string]bool) []model.AdminSetting {
	if len(modules) == 0 {
		return nil
	}
	rows := make([]model.AdminSetting, 0, len(modules))
	for module, roles := range modules {
		for role, enabled := range roles {
			rows = append(rows, model.AdminSetting{
				ModuleKey: module,
				Role:      role,
				Enabled:   enabled,
				Version:   version,
			})
		}
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].ModuleKey == rows[j].ModuleKey {
			return rows[i].Role < rows[j].Role
		}
		return rows[i].ModuleKey < rows[j].ModuleKey
	})
	return rows
}

func buildMatrix(version uint, rows []model.AdminSetting) PermissionMatrix {
	modules := make(map[string]map[string]bool)
	for _, row := range rows {
		roles := modules[row.ModuleKey]
		if roles == nil {
			roles = make(map[string]bool)
			modules[row.ModuleKey] = roles
		}
		roles[row.Role] = row.Enabled
	}
	return PermissionMatrix{Version: version, Modules: modules}
}
