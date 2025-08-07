package config

import (
	"path/filepath"
	"testing"
)

func TestVectorDB_DSN(t *testing.T) {
	v := VectorDB{
		PGHost:     "localhost",
		PGUser:     "user",
		PGPassword: "pass",
		PGDBName:   "db",
		PGPort:     5433,
		PGSSLMode:  "disable",
	}
	got := v.DSN()
	want := "postgres://user:pass@localhost:5433/db?sslmode=disable"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestRuntimeToConfig(t *testing.T) {
	rt := &Runtime{
		Datasources: []Datasource{
			{Name: "docs", Repo: "https://example.com/repo.git", Path: "docs"},
		},
	}
	cfg := rt.ToConfig()
	if len(cfg.Repos) != 1 {
		t.Fatalf("expected 1 repo, got %d", len(cfg.Repos))
	}
	r := cfg.Repos[0]
	if r.URL != "https://example.com/repo.git" || len(r.Paths) != 1 || r.Paths[0] != "docs" {
		t.Fatalf("unexpected repo: %+v", r)
	}
	expectedLocal := filepath.Join("server", "rag", "docs")
	if r.Local != expectedLocal {
		t.Fatalf("expected local %q, got %q", expectedLocal, r.Local)
	}
}
