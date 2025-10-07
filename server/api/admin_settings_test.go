package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	accountservice "xcontrol/account/service"
)

func setupAdminSettingsTest(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	registrar := RegisterRoutes(nil, "")
	registrar(r)

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := accountservice.SetAdminSettingsDB(db); err != nil {
		t.Fatalf("set admin settings db: %v", err)
	}
	t.Cleanup(func() {
		accountservice.SetAdminSettingsDB(nil)
		sqlDB, err := db.DB()
		if err == nil {
			sqlDB.Close()
		}
	})
	return r
}

func TestAdminSettingsReadWrite(t *testing.T) {
	r := setupAdminSettingsTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/auth/admin/settings", nil)
	req.Header.Set("X-User-Role", "admin")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	var resp accountservice.PermissionMatrix
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal get response: %v", err)
	}
	if resp.Version != 0 || len(resp.Modules) != 0 {
		t.Fatalf("expected empty matrix, got %+v", resp)
	}

	payload := accountservice.PermissionMatrix{
		Version: resp.Version,
		Modules: map[string]map[string]bool{
			"analytics": {
				"admin":    true,
				"operator": false,
			},
			"billing": {
				"admin":    true,
				"operator": true,
			},
		},
	}
	body, _ := json.Marshal(payload)
	req = httptest.NewRequest(http.MethodPost, "/api/auth/admin/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "admin")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	var updateResp accountservice.PermissionMatrix
	if err := json.Unmarshal(w.Body.Bytes(), &updateResp); err != nil {
		t.Fatalf("unmarshal update response: %v", err)
	}
	if updateResp.Version != resp.Version+1 {
		t.Fatalf("expected version %d, got %d", resp.Version+1, updateResp.Version)
	}
	if len(updateResp.Modules) != len(payload.Modules) {
		t.Fatalf("expected %d modules, got %d", len(payload.Modules), len(updateResp.Modules))
	}

	req = httptest.NewRequest(http.MethodGet, "/api/auth/admin/settings", nil)
	req.Header.Set("X-User-Role", "operator")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal second get: %v", err)
	}
	if resp.Version != updateResp.Version {
		t.Fatalf("expected version %d, got %d", updateResp.Version, resp.Version)
	}

	stale := payload
	stale.Version = 0
	body, _ = json.Marshal(stale)
	req = httptest.NewRequest(http.MethodPost, "/api/auth/admin/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "admin")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", w.Code)
	}
}

func TestAdminSettingsUnauthorized(t *testing.T) {
	r := setupAdminSettingsTest(t)

	req := httptest.NewRequest(http.MethodGet, "/api/auth/admin/settings", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", w.Code)
	}
}
