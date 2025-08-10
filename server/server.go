package server

import (
	"log/slog"
	"os"
	"path/filepath"
	"runtime"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// Config represents server configuration loaded from YAML.
type Config struct {
	Provider []struct {
		Name    string   `yaml:"name"`
		BaseURL string   `yaml:"base_url"`
		Token   string   `yaml:"token"`
		Models  []string `yaml:"models"`
	} `yaml:"provider"`
}

// cfg holds the loaded configuration.
var cfg Config

// loadConfig reads config/server.yaml and sets environment variables.
func loadConfig() {
	path := filepath.Join("server", "config", "server.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		slog.Warn("server config", "err", err)
		return
	}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		slog.Warn("server config parse", "err", err)
		return
	}
	for _, p := range cfg.Provider {
		if p.Name != "chutes" {
			continue
		}
		if p.Token != "" {
			os.Setenv("CHUTES_API_TOKEN", p.Token)
		}
		if p.BaseURL != "" {
			os.Setenv("CHUTES_API_URL", p.BaseURL)
		}
		if len(p.Models) > 0 {
			os.Setenv("CHUTES_API_MODEL", p.Models[0])
		}
		break
	}
}

// Registrar registers routes on the provided gin engine.
type Registrar func(*gin.Engine)

// New creates a gin engine with all CPU cores enabled and applies the provided route registrars.
func New(registrars ...Registrar) *gin.Engine {
	loadConfig()
	runtime.GOMAXPROCS(runtime.NumCPU())
	r := gin.Default()
	for _, register := range registrars {
		if register != nil {
			register(r)
		}
	}
	return r
}
