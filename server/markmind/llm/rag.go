package llm

import (
	"context"

	"xcontrol/server/markmind/db"
	"xcontrol/server/markmind/ingest"
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
	answer, err := callChutes(prompt)
	if err != nil {
		return "", err
	}
	return answer, nil
}
