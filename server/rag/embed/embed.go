package embed

import "context"

// Embedder produces a vector representation for input text.
type Embedder interface {
	Embed(ctx context.Context, text string) ([]float32, error)
}
