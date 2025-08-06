package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Runtime holds runtime configuration for RAG features.
type Runtime struct {
	Redis struct {
		Addr     string `yaml:"addr"`
		Password string `yaml:"password"`
	} `yaml:"redis"`
	Module   string `yaml:"module"`
	VectorDB struct {
		PGURL string `yaml:"pgurl"`
	} `yaml:"vectordb"`
	Datasources []string `yaml:"datasources"`
}

// LoadServer loads RAG configuration from server/config/server.yaml.
func LoadServer() (*Runtime, error) {
	path := filepath.Join("server", "config", "server.yaml")
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg struct {
		RAG Runtime `yaml:"RAG"`
	}
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		return nil, err
	}
	return &cfg.RAG, nil
}
