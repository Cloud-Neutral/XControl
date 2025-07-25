package llm

import (
	"strings"

	"xcontrol/modules/markmind/ingest"
)

// BuildPrompt constructs a simple prompt from retrieved chunks and a question.
func BuildPrompt(q string, chunks []ingest.Chunk) string {
	var b strings.Builder
	for _, c := range chunks {
		b.WriteString(c.Content)
		b.WriteString("\n---\n")
	}
	b.WriteString("Question: ")
	b.WriteString(q)
	b.WriteString("\nAnswer:")
	return b.String()
}
