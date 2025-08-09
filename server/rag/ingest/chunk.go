package ingest

import (
	"strings"

	cfgpkg "xcontrol/server/rag/config"
)

// Chunk represents a piece of text prepared for embedding.
type Chunk struct {
	ChunkID int
	Text    string
	Tokens  int
	SHA256  string
	Meta    map[string]any
}

// BuildChunks splits sections into chunks based on configuration.
// Token counting uses a best-effort approach by words when tiktoken fails.
func BuildChunks(secs []Section, cfg cfgpkg.ChunkingCfg) ([]Chunk, error) {
	var chunks []Chunk
	nextID := 0
	for _, sec := range secs {
		tokens := tokenize(sec.Text)
		if len(tokens) == 0 {
			continue
		}
		step := cfg.MaxTokens
		if step <= 0 {
			step = 800
		}
		overlap := cfg.OverlapTokens
		if overlap < 0 {
			overlap = 0
		}
		if len(tokens) <= step {
			text := strings.TrimSpace(sec.Text)
			chunks = append(chunks, Chunk{
				ChunkID: nextID,
				Text:    text,
				Tokens:  len(tokens),
				SHA256:  HashString(text),
				Meta:    map[string]any{"heading": sec.Heading},
			})
			nextID++
			continue
		}
		start := 0
		for start < len(tokens) {
			end := start + step
			if end > len(tokens) {
				end = len(tokens)
			}
			sub := strings.Join(tokens[start:end], " ")
			chunks = append(chunks, Chunk{
				ChunkID: nextID,
				Text:    sub,
				Tokens:  end - start,
				SHA256:  HashString(sub),
				Meta:    map[string]any{"heading": sec.Heading},
			})
			nextID++
			if end == len(tokens) {
				break
			}
			start = end - overlap
			if start < 0 {
				start = 0
			}
		}
	}
	return chunks, nil
}

func tokenize(s string) []string {
	if s == "" {
		return nil
	}
	return strings.Fields(s)
}
