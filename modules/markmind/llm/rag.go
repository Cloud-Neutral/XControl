package llm

import (
	"context"

	"xcontrol/modules/markmind/db"
	"xcontrol/modules/markmind/ingest"
)

// Answer performs a minimal RAG workflow.
func Answer(ctx context.Context, store *db.Store, question string) (string, error) {
	embed, err := ingest.Embed(question)
	if err != nil {
		return "", err
	}
	chunks, err := store.SearchSimilar(ctx, embed, 5)
	if err != nil {
		return "", err
	}
	prompt := BuildPrompt(question, chunks)
	// TODO: call real LLM model with the prompt
	// For now just return the prompt for demonstration.
	return prompt, nil
}
