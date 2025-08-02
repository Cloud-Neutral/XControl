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
}

// loadTokenAndModel attempts to read CHUTES_API_TOKEN and model from
// environment variables, falling back to config/server.yaml.
func loadTokenAndModel() (string, string) {
	token := os.Getenv("CHUTES_API_TOKEN")
	model := os.Getenv("CHUTES_API_MODEL")
	if token != "" && model != "" {
		return token, model
	}
	path := filepath.Join("server", "config", "server.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		return token, model
	}
	var cfg serverConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return token, model
	}
	if token == "" {
		token = cfg.Env["CHUTES_API_TOKEN"]
	}
	if model == "" && len(cfg.Model) > 0 {
		model = cfg.Model[0]
	}
	if model == "" {
		model = "deepseek-ai/DeepSeek-R1"
	}
	return token, model
}

// callChutes sends the question to the hosted LLM service and returns the reply.
func callChutes(question string) (string, error) {
	token, model := loadTokenAndModel()
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
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("chutes API error: %s", string(b))
	}

	var res struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if len(res.Choices) == 0 {
		return "", errors.New("no choices returned")
	}
	return res.Choices[0].Message.Content, nil
}
