package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Log struct {
	Level string `yaml:"level"`
}

type Redis struct {
	Addr     string `yaml:"addr"`
	Password string `yaml:"password"`
}

type Postgres struct {
	DSN string `yaml:"dsn"`
}

type Server struct {
	Log      Log      `yaml:"log"`
	Redis    Redis    `yaml:"redis"`
	Postgres Postgres `yaml:"postgres"`
}

// Load reads server/config/server.yaml and unmarshals into Server struct.
func Load() (*Server, error) {
	path := filepath.Join("server", "config", "server.yaml")
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Server
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
