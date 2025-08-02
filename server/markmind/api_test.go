package markmind

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"xcontrol/server/markmind/db"
)

// TestAskAI verifies the /api/askai endpoint returns an answer.
func TestAskAI(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// stub answer function
	old := answerFn
	defer func() { answerFn = old }()
	answerFn = func(ctx context.Context, store *db.Store, q string) (string, error) {
		return "stub answer", nil
	}

	RegisterRoutes(r, nil)

	body, _ := json.Marshal(map[string]string{"question": "hello"})
	req := httptest.NewRequest(http.MethodPost, "/api/askai", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if resp["answer"] != "stub answer" {
		t.Fatalf("unexpected answer %q", resp["answer"])
	}
}

// TestAskAI_BadRequest ensures invalid payload returns 400.
func TestAskAI_BadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// ensure answerFn is stubbed to avoid dependency
	old := answerFn
	defer func() { answerFn = old }()
	answerFn = func(ctx context.Context, store *db.Store, q string) (string, error) {
		return "", nil
	}

	RegisterRoutes(r, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/askai", bytes.NewReader([]byte("{")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}
