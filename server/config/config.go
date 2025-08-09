package config

import (
	"fmt"
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

type VectorDB struct {
	PGURL      string `yaml:"pgurl"`
	PGHost     string `yaml:"pg_host"`
	PGPort     int    `yaml:"pg_port"`
	PGUser     string `yaml:"pg_user"`
	PGPassword string `yaml:"pg_password"`
	PGDBName   string `yaml:"pg_db_name"`
	PGSSLMode  string `yaml:"pg_sslmode"`
}

func (v VectorDB) DSN() string {
	if v.PGURL != "" {
		return v.PGURL
	}
	if v.PGHost == "" || v.PGUser == "" || v.PGDBName == "" {
		return ""
	}
	port := v.PGPort
	if port == 0 {
		port = 5432
	}
	ssl := v.PGSSLMode
	if ssl == "" {
		ssl = "require"
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s", v.PGUser, v.PGPassword, v.PGHost, port, v.PGDBName, ssl)
}

type Datasource struct {
	Name string `yaml:"name"`
	Repo string `yaml:"repo"`
	Path string `yaml:"path"`
}

type Global struct {
	Redis       Redis        `yaml:"redis"`
	VectorDB    VectorDB     `yaml:"vectordb"`
	Datasources []Datasource `yaml:"datasources"`
	Proxy       string       `yaml:"proxy"`
}

type Provider struct {
	Name    string   `yaml:"name"`
	BaseURL string   `yaml:"base_url"`
	Token   string   `yaml:"token"`
	Models  []string `yaml:"models"`
}

type API struct {
	AskAI struct {
		Timeout int `yaml:"timeout"`
		Retries int `yaml:"retries"`
	} `yaml:"askai"`
}

type Config struct {
	Log      Log        `yaml:"log"`
	Global   Global     `yaml:"global"`
	Provider []Provider `yaml:"provider"`
	API      API        `yaml:"api"`
}

// Load reads the configuration file at the provided path. When path is empty,
// it defaults to server/config/server.yaml.
func Load(path ...string) (*Config, error) {
	p := filepath.Join("server", "config", "server.yaml")
	if len(path) > 0 && path[0] != "" {
		p = path[0]
	}
	b, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
