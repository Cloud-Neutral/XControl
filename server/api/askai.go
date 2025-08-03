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
	"time"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// askFn performs the chat completion request. It is replaceable in tests.
var askFn = callChutes

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
		answer, err := askFn(req.Question)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"answer": answer})
	})
}

const chutesURL = "https://llm.chutes.ai/v1/chat/completions"

type serverConfig struct {
	Env   map[string]string `yaml:"env"`
	Model []string          `yaml:"model"`
	AskAI struct {
		Timeout int `yaml:"timeout"` // seconds
		Retries int `yaml:"retries"`
	} `yaml:"askai"`
}

// loadConfig attempts to read CHUTES_API_TOKEN, model, timeout and retries from
// environment variables, falling back to config/server.yaml.
func loadConfig() (string, string, time.Duration, int) {
	token := os.Getenv("CHUTES_API_TOKEN")
	model := os.Getenv("CHUTES_API_MODEL")
	timeout := 30 * time.Second
	retries := 3
	path := filepath.Join("server", "config", "server.yaml")
	data, err := os.ReadFile(path)
	if err == nil {
		var cfg serverConfig
		if err := yaml.Unmarshal(data, &cfg); err == nil {
			if token == "" {
				token = cfg.Env["CHUTES_API_TOKEN"]
			}
			if model == "" && len(cfg.Model) > 0 {
				model = cfg.Model[0]
			}
			if cfg.AskAI.Timeout > 0 {
				timeout = time.Duration(cfg.AskAI.Timeout) * time.Second
			}
			if cfg.AskAI.Retries > 0 {
				retries = cfg.AskAI.Retries
			}
		}
	}
	if timeout > 30*time.Second {
		timeout = 30 * time.Second
	}
	if retries > 3 {
		retries = 3
	}
	if model == "" {
		model = "deepseek-ai/DeepSeek-R1"
	}
	return token, model, timeout, retries
}

// callChutes sends the question to the hosted LLM service and returns the reply.
func callChutes(question string) (string, error) {
	token, model, timeout, retries := loadConfig()
	if token == "" {
		return "", errors.New("CHUTES_API_TOKEN not set")
	}
	url := os.Getenv("CHUTES_API_URL")
	if url == "" {
		url = chutesURL
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
