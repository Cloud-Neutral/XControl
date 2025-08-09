package config

import "testing"

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

func TestResolveEmbedding(t *testing.T) {
	cfg := &Config{
		Provider:  []Provider{{Name: "p1", BaseURL: "https://api.example.com", Token: "tok"}},
		Embedding: EmbeddingCfg{Provider: "p1", Model: "m"},
	}
	e := cfg.ResolveEmbedding()
	if e.BaseURL != "https://api.example.com/v1" {
		t.Fatalf("unexpected base url %q", e.BaseURL)
	}
	if e.APIKey != "tok" {
		t.Fatalf("unexpected api key %q", e.APIKey)
	}
	if e.Model != "m" {
		t.Fatalf("unexpected model %q", e.Model)
	}
}

func TestResolveChunking(t *testing.T) {
	cfg := &Config{}
	ch := cfg.ResolveChunking()
	if ch.MaxTokens != 800 || ch.OverlapTokens != 80 {
		t.Fatalf("defaults not applied: %+v", ch)
	}
	if len(ch.IncludeExts) == 0 || len(ch.IgnoreDirs) == 0 {
		t.Fatalf("expected default slices")
	}
}
