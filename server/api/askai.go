package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// askFn performs the chat completion request. It is replaceable in tests.
var askFn = callLLM

// registerAskAIRoutes wires the /api/askai endpoint.
func registerAskAIRoutes(r *gin.RouterGroup) {
	r.POST("/askai", func(c *gin.Context) {
		var req struct {
			Question string `json:"question"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		var chunks any
		if ragSvc != nil {
			docs, _ := ragSvc.Query(c.Request.Context(), req.Question, 5)
			chunks = docs
		}
		answer, err := askFn(req.Question)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"answer": answer, "chunks": chunks})
	})
}

// ConfigPath points to the server configuration file.
var ConfigPath = filepath.Join("server", "config", "server.yaml")

type serverConfig struct {
	Provider []struct {
		Name    string   `yaml:"name"`
		BaseURL string   `yaml:"base_url"`
		Token   string   `yaml:"token"`
		Models  []string `yaml:"models"`
	} `yaml:"provider"`
	API struct {
		AskAI struct {
			Timeout int `yaml:"timeout"` // seconds
			Retries int `yaml:"retries"`
		} `yaml:"askai"`
	} `yaml:"api"`
}

// loadConfig reads provider, model, URL, timeout and retries from ConfigPath
// and environment variables.
func loadConfig() (string, string, string, string, time.Duration, int) {
	provider := ""
	model := os.Getenv("CHUTES_API_MODEL")
	baseURL := os.Getenv("CHUTES_API_URL")
	token := ""
	timeout := 30 * time.Second
	retries := 3
	data, err := os.ReadFile(ConfigPath)
	if err == nil {
		var cfg serverConfig
		if err := yaml.Unmarshal(data, &cfg); err == nil {
			for _, p := range cfg.Provider {
				if provider == "" {
					provider = p.Name
				}
				switch p.Name {
				case "allama":
					if model == "" && len(p.Models) > 0 {
						model = p.Models[0]
					}
					if baseURL == "" {
						baseURL = p.BaseURL
					}
				case "chutes":
					if token == "" {
						token = p.Token
					}
					if model == "" && len(p.Models) > 0 {
						model = p.Models[0]
					}
					if baseURL == "" {
						baseURL = p.BaseURL
					}
				}
			}
			if cfg.API.AskAI.Timeout > 0 {
				timeout = time.Duration(cfg.API.AskAI.Timeout) * time.Second
			}
			if cfg.API.AskAI.Retries > 0 {
				retries = cfg.API.AskAI.Retries
			}
		}
	}
	if timeout > 30*time.Second {
		timeout = 30 * time.Second
	}
	if retries > 3 {
		retries = 3
	}
	provider = strings.ToLower(provider)
	baseURL = strings.TrimRight(baseURL, "/")
	if provider == "allama" {
		if baseURL == "" {
			baseURL = "http://localhost:11434"
		}
		if model == "" {
			model = "gpt-oss:20b"
		}
		return provider, token, model, baseURL + "/api/chat", timeout, retries
	}
	if baseURL == "" {
		baseURL = "https://llm.chutes.ai"
	}
	if model == "" {
		model = "deepseek-ai/DeepSeek-R1"
	}
	return "chutes", token, model, baseURL + "/v1/chat/completions", timeout, retries
}

// callChutes sends the question to the hosted LLM service and returns the reply.
func callChutes(token, model, url string, timeout time.Duration, retries int, question string) (string, error) {
	if token == "" || token == "cpk_xxxxxxx" {
		return "", errors.New("chutes token not set")
	}

	reqBody := map[string]interface{}{
		"model":       model,
		"messages":    []interface{}{map[string]interface{}{"role": "user", "content": question}},
		"stream":      false,
		"max_tokens":  1024,
		"temperature": 0.7,
	}
	data, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: timeout}
	var lastErr error
	for i := 0; i <= retries; i++ {
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
		if err != nil {
			return "", err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		b, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("chutes API error: %s", string(b))
			continue
		}

		var res struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			} `json:"choices"`
		}
		if err := json.Unmarshal(b, &res); err != nil {
			lastErr = err
			continue
		}
		if len(res.Choices) == 0 {
			lastErr = errors.New("no choices returned")
			continue
		}
		return res.Choices[0].Message.Content, nil
	}
	if lastErr == nil {
		lastErr = errors.New("request failed")
	}
	return "", lastErr
}

// callAllama sends the question to a local Allama server.
func callAllama(model, url string, timeout time.Duration, retries int, question string) (string, error) {
	reqBody := map[string]any{
		"model":    model,
		"messages": []any{map[string]string{"role": "user", "content": question}},
		"stream":   false,
	}
	data, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}
	client := &http.Client{Timeout: timeout}
	var lastErr error
	for i := 0; i <= retries; i++ {
		req, err := http.NewRequest("POST", url, bytes.NewReader(data))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		b, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}
		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("allama API error: %s", string(b))
			continue
		}
		var res struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		}
		if err := json.Unmarshal(b, &res); err != nil {
			lastErr = err
			continue
		}
		return res.Message.Content, nil
	}
	if lastErr == nil {
		lastErr = errors.New("request failed")
	}
	return "", lastErr
}

// callLLM dispatches the question to the configured provider.
func callLLM(question string) (string, error) {
	provider, token, model, url, timeout, retries := loadConfig()
	switch provider {
	case "allama":
		return callAllama(model, url, timeout, retries, question)
	default:
		return callChutes(token, model, url, timeout, retries, question)
	}
}
