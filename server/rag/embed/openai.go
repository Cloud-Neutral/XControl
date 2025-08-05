package embed

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
)

// OpenAI calls the OpenAI embeddings endpoint.
type OpenAI struct {
	APIKey string
	Model  string
	Client *http.Client
}

// NewOpenAI creates a new OpenAI embedder.
func NewOpenAI(model, key string) *OpenAI {
	return &OpenAI{Model: model, APIKey: key, Client: &http.Client{}}
}

// Embed generates an embedding using OpenAI API.
func (o *OpenAI) Embed(ctx context.Context, text string) ([]float32, error) {
	body := map[string]any{"input": text, "model": o.Model}
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/embeddings", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+o.APIKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := o.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var res struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	if len(res.Data) == 0 {
		return nil, nil
	}
	return res.Data[0].Embedding, nil
}
