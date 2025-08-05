package config

import (
	"gopkg.in/yaml.v3"
	"os"
)

// Repo holds configuration for a single Git repository and paths to index.
type Repo struct {
	URL    string   `yaml:"url"`
	Branch string   `yaml:"branch"`
	Paths  []string `yaml:"paths"`
	Local  string   `yaml:"local"`
}

// Config describes the RAG ingestion settings.
type Config struct {
	Repos    []Repo `yaml:"repos"`
	Embedder string `yaml:"embedder"`
}

// Load reads YAML configuration from path.
func Load(path string) (*Config, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var c Config
	if err := yaml.Unmarshal(b, &c); err != nil {
		return nil, err
	}
	return &c, nil
}
