package config

import (
	"errors"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Log defines logging configuration for the account service.
type Log struct {
	// Level sets the minimum log level. Valid values are "debug", "info",
	// "warn", and "error".
	Level string `yaml:"level"`
}

// Config holds configuration for the account service.
type Config struct {
	Log Log `yaml:"log"`
}

// Load reads the configuration file at the provided path. When path is empty,
// it defaults to account/config/account.yaml. If the file does not exist an
// empty configuration is returned.
func Load(path string) (*Config, error) {
	p := path
	if p == "" {
		p = filepath.Join("account", "config", "account.yaml")
	}

	b, err := os.ReadFile(p)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Config{}, nil
		}
		return nil, err
	}

	var cfg Config
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
