package config

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	Log     Log     `yaml:"log"`
	Server  Server  `yaml:"server"`
	Store   Store   `yaml:"store"`
	Session Session `yaml:"session"`
	SMTP    SMTP    `yaml:"smtp"`
}

// Server defines HTTP server configuration.
type Server struct {
	Addr         string        `yaml:"addr"`
	ReadTimeout  time.Duration `yaml:"readTimeout"`
	WriteTimeout time.Duration `yaml:"writeTimeout"`
	TLS          TLS           `yaml:"tls"`
}

// TLS describes TLS configuration for the server listener.
type TLS struct {
	Enabled      *bool  `yaml:"enabled"`
	CertFile     string `yaml:"certFile"`
	KeyFile      string `yaml:"keyFile"`
	CAFile       string `yaml:"caFile"`
	ClientCAFile string `yaml:"clientCAFile"`
	RedirectHTTP bool   `yaml:"redirectHttp"`
}

// IsEnabled reports whether TLS should be enabled for the server listener. When the
// configuration explicitly sets the Enabled field it is respected. Otherwise TLS is
// considered enabled only if both the certificate and key paths are non-empty.
func (t TLS) IsEnabled() bool {
	if t.Enabled != nil {
		return *t.Enabled
	}
	return strings.TrimSpace(t.CertFile) != "" && strings.TrimSpace(t.KeyFile) != ""
}

// Store defines persistence configuration for the account service.
type Store struct {
	Driver       string `yaml:"driver"`
	DSN          string `yaml:"dsn"`
	MaxOpenConns int    `yaml:"maxOpenConns"`
	MaxIdleConns int    `yaml:"maxIdleConns"`
}

// Session defines session management configuration.
type Session struct {
	TTL time.Duration `yaml:"ttl"`
}

// SMTP defines outbound SMTP configuration used for transactional email.
type SMTP struct {
	Host     string        `yaml:"host"`
	Port     int           `yaml:"port"`
	Username string        `yaml:"username"`
	Password string        `yaml:"password"`
	From     string        `yaml:"from"`
	ReplyTo  string        `yaml:"replyTo"`
	Timeout  time.Duration `yaml:"timeout"`
	TLS      SMTPTLS       `yaml:"tls"`
}

// SMTPTLS describes TLS settings for SMTP connections. Mode supports "auto",
// "starttls", "implicit", and "none". The "auto" mode negotiates STARTTLS
// when the server advertises support and otherwise falls back to an unencrypted
// connection which is useful for local testing.
type SMTPTLS struct {
	Mode               string `yaml:"mode"`
	InsecureSkipVerify bool   `yaml:"insecureSkipVerify"`
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
