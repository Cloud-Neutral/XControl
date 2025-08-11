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
			_, _, _, _, timeout, retries := loadConfig()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
				"config": gin.H{
					"timeout": timeout.Seconds(),
					"retries": retries,
				},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{"answer": answer, "chunks": chunks})
	})
}

// ConfigPath points to the server configuration file.
var ConfigPath = filepath.Join("server", "config", "server.yaml")

type serverConfig struct {
	Models struct {
		Generator struct {
			Provider string   `yaml:"provider"`
			Models   []string `yaml:"models"`
			Endpoint string   `yaml:"endpoint"`
			Token    string   `yaml:"token"`
		} `yaml:"generator"`
	} `yaml:"models"`
	API struct {
		AskAI struct {
			Timeout int `yaml:"timeout"` // seconds
			Retries int `yaml:"retries"`
		} `yaml:"askai"`
	} `yaml:"api"`
}

// loadConfig reads provider, model, endpoint, timeout and retries from ConfigPath
// and environment variables.
func loadConfig() (string, string, string, string, time.Duration, int) {
	provider := ""
	model := os.Getenv("CHUTES_API_MODEL")
	endpoint := os.Getenv("CHUTES_API_URL")
	token := ""
	timeout := 30 * time.Second
	retries := 3
	data, err := os.ReadFile(ConfigPath)
	if err == nil {
		var cfg serverConfig
		if err := yaml.Unmarshal(data, &cfg); err == nil {
			g := cfg.Models.Generator
			if provider == "" {
				provider = g.Provider
			}
			if model == "" && len(g.Models) > 0 {
				model = g.Models[0]
			}
			if endpoint == "" {
				endpoint = g.Endpoint
			}
			if token == "" {
				token = g.Token
			}
			if cfg.API.AskAI.Timeout > 0 {
				timeout = time.Duration(cfg.API.AskAI.Timeout) * time.Second
			}
			if cfg.API.AskAI.Retries > 0 {
				retries = cfg.API.AskAI.Retries
			}
		}
	}
	// Allow custom timeout values without imposing a hard cap.
	if retries > 3 {
		retries = 3
	}
	provider = strings.ToLower(provider)
	endpoint = strings.TrimRight(endpoint, "/")
	switch provider {
	case "ollama":
		if endpoint == "" {
			endpoint = "http://localhost:11434/v1/chat/completions"
		}
		if model == "" {
			model = "gpt-oss:20b"
		}
		return provider, token, model, endpoint, timeout, retries
	case "chutes":
		if endpoint == "" {
			endpoint = "https://llm.chutes.ai/v1/chat/completions"
		}
		if model == "" {
			model = "deepseek-ai/DeepSeek-R1"
		}
		return provider, token, model, endpoint, timeout, retries
	default:
		if endpoint == "" {
			endpoint = "https://llm.chutes.ai/v1/chat/completions"
		}
		if model == "" {
			model = "deepseek-ai/DeepSeek-R1"
		}
		return provider, token, model, endpoint, timeout, retries
	}
}

// callChutes sends the question to the hosted LLM service and returns the reply.
func callChutes(token, model, url string, timeout time.Duration, retries int, question string) (string, error) {
	if token == "" || token == "cpk_xxxxxxx" {
		return "", errors.New("chutes token not set")
	}

	reqBody := map[string]any{
		"model":       model,
		"messages":    []any{map[string]any{"role": "user", "content": question}},
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

// callOllama sends the question to a local Ollama server.
func callOllama(model, url string, timeout time.Duration, retries int, question string) (string, error) {
	reqBody := map[string]any{
		"model":       model,
		"messages":    []any{map[string]any{"role": "user", "content": question}},
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
			lastErr = fmt.Errorf("ollama API error: %s", string(b))
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

// callLLM dispatches the question to the configured provider.
func callLLM(question string) (string, error) {
	provider, token, model, url, timeout, retries := loadConfig()
	var (
		answer string
		err    error
	)
	switch provider {
	case "ollama":
		answer, err = callOllama(model, url, timeout, retries, question)
	case "chutes":
		answer, err = callChutes(token, model, url, timeout, retries, question)
	default:
		answer, err = callChutes(token, model, url, timeout, retries, question)
	}
	if err != nil {
		return "", fmt.Errorf("%w (timeout=%s retries=%d)", err, timeout, retries)
	}
	return answer, nil
}
