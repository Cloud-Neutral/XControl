package embed

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
)

// BGE calls a local bge-m3 embedding service.
type BGE struct {
	Endpoint string
	Client   *http.Client
}

// NewBGE returns a new BGE embedder.
func NewBGE(endpoint string) *BGE {
	return &BGE{Endpoint: endpoint, Client: &http.Client{}}
}

// Embed posts text to the bge service and parses the vector.
func (b *BGE) Embed(ctx context.Context, text string) ([]float32, error) {
	body := map[string]string{"text": text}
	data, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, "POST", b.Endpoint, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var res struct {
		Embedding []float32 `json:"embedding"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}
	return res.Embedding, nil
}
