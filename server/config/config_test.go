package config

import (
	"os"
	"testing"
)

// TestLoad ensures the configuration file is loaded correctly.
func TestLoad(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	// change to repository root so Load can read server/config/server.yaml
	if err := os.Chdir("../.."); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { os.Chdir(wd) })

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load returned error: %v", err)
	}
	if cfg.Log.Level != "info" {
		t.Fatalf("unexpected log level %q", cfg.Log.Level)
	}
}
