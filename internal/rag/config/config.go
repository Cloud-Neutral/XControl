package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// DataSource represents a repository and a path to ingest.
type DataSource struct {
	Name string `yaml:"name"`
	Repo string `yaml:"repo"`
	Path string `yaml:"path"`
}

// VectorDB configuration for PostgreSQL with pgvector.
type VectorDB struct {
	PGURL      string `yaml:"pgurl"`
	PGHost     string `yaml:"pg_host"`
	PGPort     int    `yaml:"pg_port"`
	PGUser     string `yaml:"pg_user"`
	PGPassword string `yaml:"pg_password"`
	PGDBName   string `yaml:"pg_db_name"`
	PGSSLMode  string `yaml:"pg_sslmode"`
}

// DSN returns the PostgreSQL connection string derived from individual fields
// when PGURL is not provided.
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

// Global configuration shared by server and CLI.
type Global struct {
	Redis struct {
		Addr     string `yaml:"addr"`
		Password string `yaml:"password"`
	} `yaml:"redis"`
	VectorDB    VectorDB     `yaml:"vectordb"`
	Datasources []DataSource `yaml:"datasources"`
	Proxy       string       `yaml:"proxy"`
}

// Provider defines an LLM provider which can also serve embeddings.
type Provider struct {
	Name    string   `yaml:"name"`
	BaseURL string   `yaml:"base_url"`
	Token   string   `yaml:"token"`
	Models  []string `yaml:"models"`
}

// EmbeddingCfg describes embedding service settings.
type EmbeddingCfg struct {
	Provider     string `yaml:"provider"`
	BaseURL      string `yaml:"base_url"`
	Token        string `yaml:"token"`
	Model        string `yaml:"model"`
	APIKeyEnv    string `yaml:"api_key_env"`
	Dimension    int    `yaml:"dimension"`
	RateLimitTPM int    `yaml:"rate_limit_tpm"`
	MaxBatch     int    `yaml:"max_batch"`
	MaxChars     int    `yaml:"max_chars"`
}

// ChunkingCfg controls how markdown is split into chunks.
type ChunkingCfg struct {
	MaxTokens          int      `yaml:"max_tokens"`
	OverlapTokens      int      `yaml:"overlap_tokens"`
	PreferHeadingSplit bool     `yaml:"prefer_heading_split"`
	IncludeExts        []string `yaml:"include_exts"`
	IgnoreDirs         []string `yaml:"ignore_dirs"`
}

// Config is the root configuration for ingestion.
type Config struct {
	Global    Global       `yaml:"global"`
	Provider  []Provider   `yaml:"provider"`
	Embedding EmbeddingCfg `yaml:"embedding"`
	Chunking  ChunkingCfg  `yaml:"chunking"`
}

// Load reads YAML configuration from the given path.
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
