package server

import (
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// Config represents server configuration loaded from YAML.
type Config struct {
	Env   map[string]string `yaml:"env"`
	Model []string          `yaml:"model"`
}

// cfg holds the loaded configuration.
var cfg Config

// loadConfig reads config/server.yaml and sets environment variables.
func loadConfig() {
	path := filepath.Join("server", "config", "server.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("server config: %v", err)
		return
	}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		log.Printf("server config parse: %v", err)
		return
	}
	for k, v := range cfg.Env {
		os.Setenv(k, v)
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
