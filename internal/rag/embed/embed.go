package embed

import "context"

// Client defines embedding operations for various providers.
type Client interface {
	// Embed converts input texts into embedding vectors.
	Embed(ctx context.Context, inputs []string) ([][]float32, error)
}
