package embed

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestChutesEmbed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[[0.1,0.2],[0.3,0.4]]}`))
	}))
	defer srv.Close()

	emb := NewChutes(srv.URL, "", 0)
	vecs, _, err := emb.Embed(context.Background(), []string{"a", "b"})
	if err != nil {
		t.Fatalf("Embed returned error: %v", err)
	}
	if len(vecs) != 2 || len(vecs[0]) != 2 {
		t.Fatalf("unexpected embedding: %#v", vecs)
	}
}
