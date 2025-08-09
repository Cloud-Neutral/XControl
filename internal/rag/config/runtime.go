package config

import (
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// RuntimeEmbedding is the resolved embedding configuration used at runtime.
type RuntimeEmbedding struct {
	BaseURL      string
	APIKey       string
	Model        string
	Dimension    int
	RateLimitTPM int
	MaxBatch     int
	MaxChars     int
}

// ResolveEmbedding applies fallback logic to produce runtime embedding settings.
func (c *Config) ResolveEmbedding() RuntimeEmbedding {
	e := c.Embedding
	var rt RuntimeEmbedding
	rt.Model = e.Model
	rt.Dimension = e.Dimension
	rt.RateLimitTPM = e.RateLimitTPM
	rt.MaxBatch = e.MaxBatch
	rt.MaxChars = e.MaxChars

	// find provider by name
	var prov *Provider
	for i := range c.Provider {
		if c.Provider[i].Name == e.Provider {
			prov = &c.Provider[i]
			break
		}
	}

	if e.BaseURL != "" {
		rt.BaseURL = e.BaseURL
	} else if prov != nil {
		rt.BaseURL = strings.TrimRight(prov.BaseURL, "/") + "/v1"
	}

	if e.APIKeyEnv != "" {
		rt.APIKey = os.Getenv(e.APIKeyEnv)
	} else if e.Token != "" {
		rt.APIKey = e.Token
	} else if prov != nil {
		rt.APIKey = prov.Token
	}

	return rt
}

// ResolveChunking returns chunking configuration with defaults applied.
func (c *Config) ResolveChunking() ChunkingCfg {
	ch := c.Chunking
	if ch.MaxTokens == 0 {
		ch.MaxTokens = 800
	}
	if ch.OverlapTokens == 0 {
		ch.OverlapTokens = 80
	}
	if len(ch.IncludeExts) == 0 {
		ch.IncludeExts = []string{".md", ".mdx"}
	}
	if len(ch.IgnoreDirs) == 0 {
		ch.IgnoreDirs = []string{".git", "node_modules", "dist", "build"}
	}
	return ch
}

// Runtime holds runtime configuration for RAG features.
type Runtime struct {
	Redis struct {
		Addr     string `yaml:"addr"`
		Password string `yaml:"password"`
	} `yaml:"redis"`
	VectorDB    VectorDB     `yaml:"vectordb"`
	Datasources []DataSource `yaml:"datasources"`
	Proxy       string       `yaml:"proxy"`
}

// ServerConfigPath points to the server configuration file.
var ServerConfigPath = filepath.Join("server", "config", "server.yaml")

// LoadServer loads global configuration from ServerConfigPath.
func LoadServer() (*Runtime, error) {
	b, err := os.ReadFile(ServerConfigPath)
	if err != nil {
		return nil, err
	}
	var cfg struct {
		Global Runtime `yaml:"global"`
	}
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		return nil, err
	}
	return &cfg.Global, nil
}

// ToConfig converts runtime configuration into service configuration.
func (rt *Runtime) ToConfig() *Config {
	if rt == nil {
		return nil
	}
	var c Config
	c.Global.Redis = rt.Redis
	c.Global.VectorDB = rt.VectorDB
	c.Global.Datasources = rt.Datasources
	c.Global.Proxy = rt.Proxy
	return &c
}
