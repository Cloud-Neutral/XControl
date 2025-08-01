package llm

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
)

// chutesURL is the default endpoint for the Chutes hosted LLM service.
const chutesURL = "https://llm.chutes.ai/v1/chat/completions"

// message represents a chat message payload.
type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// chatRequest is the request body expected by the Chutes API.
type chatRequest struct {
	Model       string    `json:"model"`
	Messages    []message `json:"messages"`
	Stream      bool      `json:"stream"`
	MaxTokens   int       `json:"max_tokens"`
	Temperature float32   `json:"temperature"`
}

// chatResponse is a minimal subset of the response returned by the Chutes API.
type chatResponse struct {
	Choices []struct {
		Message message `json:"message"`
	} `json:"choices"`
}

// callChutes sends the prompt to the hosted LLM and returns the assistant reply.
func callChutes(prompt string) (string, error) {
	token := os.Getenv("CHUTES_API_TOKEN")
	if token == "" {
		return "", errors.New("CHUTES_API_TOKEN not set")
	}
	url := os.Getenv("CHUTES_API_URL")
	if url == "" {
		url = chutesURL
	}

	reqBody := chatRequest{
		Model:       "deepseek-ai/DeepSeek-R1",
		Messages:    []message{{Role: "user", Content: prompt}},
		Stream:      false,
		MaxTokens:   1024,
		Temperature: 0.7,
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

	var res chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if len(res.Choices) == 0 {
		return "", errors.New("no choices returned")
	}
	return res.Choices[0].Message.Content, nil
}
