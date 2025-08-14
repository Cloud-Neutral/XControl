package embed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// OllamaClient implements embeddings using the Ollama API.
type OllamaClient struct {
	endpoint string
	model    string
	client   *http.Client
}

// NewOllamaClient returns a new Ollama client.
func NewOllamaClient(endpoint, model string) *OllamaClient {
	return &OllamaClient{
		endpoint: strings.TrimRight(endpoint, "/"),
		model:    model,
		client:   &http.Client{Timeout: 30 * time.Second},
	}
}

// Embed posts texts to the Ollama embeddings endpoint.
func (a *OllamaClient) Embed(ctx context.Context, inputs []string) ([][]float32, error) {
	vecs := make([][]float32, len(inputs))
	url := a.endpoint
	for i, text := range inputs {
		payload := map[string]any{"model": a.model, "prompt": text}
		body, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := a.client.Do(req)
		if err != nil {
			return nil, err
		}
		if resp.StatusCode >= 300 {
			resp.Body.Close()
			return nil, &HTTPError{Code: resp.StatusCode, Status: fmt.Sprintf("embed failed: %s", resp.Status)}
		}
		data, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		var out struct {
			Embedding []float64 `json:"embedding"`
		}
		if err := json.Unmarshal(data, &out); err != nil {
			return nil, err
		}
		vec := make([]float32, len(out.Embedding))
		for j, v := range out.Embedding {
			vec[j] = float32(v)
		}
		vecs[i] = vec
	}
	return vecs, nil
}
