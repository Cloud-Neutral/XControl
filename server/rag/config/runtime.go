package config

import (
	"os"
	"strings"
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
	} else if prov != nil {
		rt.APIKey = prov.Token
	}

	return rt
}

// LoadServer loads global configuration from server/config/server.yaml.
func LoadServer() (*Runtime, error) {
	path := filepath.Join("server", "config", "server.yaml")
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg struct {
		Global Runtime `yaml:"global"`
	}
	if ch.OverlapTokens == 0 {
		ch.OverlapTokens = 80
	}
	return &cfg.Global, nil
}

// ToConfig converts runtime configuration into service configuration.
func (rt *Runtime) ToConfig() *Config {
	if rt == nil {
		return nil
	}
	if len(ch.IgnoreDirs) == 0 {
		ch.IgnoreDirs = []string{".git", "node_modules", "dist", "build"}
	}
	return ch
}
