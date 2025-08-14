package embed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ChutesClient implements embeddings for the Chutes API.
type ChutesClient struct {
	endpoint string
	token    string
	model    string
	client   *http.Client
}

// NewChutesClient returns a new Chutes client.
func NewChutesClient(endpoint, token, model string) *ChutesClient {
	return &ChutesClient{
		endpoint: endpoint,
		token:    token,
		model:    model,
		client:   &http.Client{Timeout: 30 * time.Second},
	}
}

// Embed posts the inputs to the Chutes /embed endpoint.
func (c *ChutesClient) Embed(ctx context.Context, inputs []string) ([][]float32, error) {
	payload := map[string]any{"inputs": inputs}
	if c.model != "" {
		payload["model"] = c.model
	}
	b, _ := json.Marshal(payload)
	backoff := time.Second
	for attempt := 0; attempt < 3; attempt++ {
		body := bytes.NewReader(b)
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, body)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		if c.token != "" {
			req.Header.Set("Authorization", "Bearer "+c.token)
		}
		resp, err := c.client.Do(req)
		if err != nil {
			if attempt == 2 {
				return nil, err
			}
		} else {
			if resp.StatusCode == 429 || resp.StatusCode >= 500 {
				resp.Body.Close()
			} else if resp.StatusCode >= 400 {
				resp.Body.Close()
				return nil, &HTTPError{Code: resp.StatusCode, Status: fmt.Sprintf("embed failed: %s", resp.Status)}
			} else {
				data, err := io.ReadAll(resp.Body)
				resp.Body.Close()
				if err != nil {
					return nil, err
				}
				// Try Chutes format
				var chutes struct {
					Data [][]float32 `json:"data"`
				}
				if json.Unmarshal(data, &chutes) == nil && len(chutes.Data) > 0 {
					return chutes.Data, nil
				}
				// Try OpenAI format
				var openai struct {
					Data []struct {
						Embedding []float32 `json:"embedding"`
					} `json:"data"`
				}
				if json.Unmarshal(data, &openai) == nil && len(openai.Data) > 0 {
					vecs := make([][]float32, len(openai.Data))
					for i, d := range openai.Data {
						vecs[i] = d.Embedding
					}
					return vecs, nil
				}
				return nil, fmt.Errorf("unexpected embed response")
			}
		}
		time.Sleep(backoff)
		backoff *= 2
	}
	return nil, fmt.Errorf("embed failed after retries")
}
