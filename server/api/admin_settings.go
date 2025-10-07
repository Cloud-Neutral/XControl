package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	accountservice "xcontrol/account/service"
	"xcontrol/server/internal/model"
)

func registerAdminSettingsRoutes(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	auth.GET("/admin/settings", getAdminSettings)
	auth.POST("/admin/settings", updateAdminSettings)
}

func getAdminSettings(c *gin.Context) {
	if !authorizeAdminOrOperator(c) {
		return
	}

	matrix, err := accountservice.GetAdminPermissionMatrix(c.Request.Context())
	if err != nil {
		handleAdminSettingsError(c, err)
		return
	}
	c.JSON(http.StatusOK, matrix)
}

func updateAdminSettings(c *gin.Context) {
	if !authorizeAdminOrOperator(c) {
		return
	}

	var req accountservice.PermissionMatrix
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	normalized, err := validateMatrix(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := accountservice.UpdateAdminPermissionMatrix(c.Request.Context(), normalized)
	if err != nil {
		handleAdminSettingsError(c, err)
		return
	}
	c.JSON(http.StatusOK, updated)
}

func validateMatrix(matrix accountservice.PermissionMatrix) (accountservice.PermissionMatrix, error) {
	cleaned := accountservice.PermissionMatrix{Version: matrix.Version, Modules: make(map[string]map[string]bool)}
	for module, roles := range matrix.Modules {
		trimmedModule := strings.ToLower(strings.TrimSpace(module))
		if trimmedModule == "" {
			return accountservice.PermissionMatrix{}, errors.New("module key cannot be empty")
		}
		cleanedRoles := make(map[string]bool)
		for role, enabled := range roles {
			trimmedRole := strings.ToLower(strings.TrimSpace(role))
			if trimmedRole == "" {
				return accountservice.PermissionMatrix{}, fmt.Errorf("module %q contains an empty role", module)
			}
			cleanedRoles[trimmedRole] = enabled
		}
		cleaned.Modules[trimmedModule] = cleanedRoles
	}

	return cleaned, nil
}

func authorizeAdminOrOperator(c *gin.Context) bool {
	role := strings.ToLower(strings.TrimSpace(c.GetHeader("X-User-Role")))
	switch role {
	case model.RoleAdmin, model.RoleOperator:
		return true
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return false
	}
}

func handleAdminSettingsError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, accountservice.ErrAdminSettingsNotConfigured):
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
	case errors.Is(err, accountservice.ErrAdminSettingsConflict):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}
