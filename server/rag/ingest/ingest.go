package ingest

import (
	"bytes"
	"io/ioutil"
	"strings"

	"github.com/yuin/goldmark"
	"xcontrol/server/rag/store"
)

const chunkSize = 800

// File reads a markdown file and returns chunked documents.
func File(repo, path string) ([]store.Document, error) {
	b, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := goldmark.Convert(b, &buf); err != nil {
		return nil, err
	}
	words := strings.Fields(buf.String())
	var docs []store.Document
	for i := 0; i < len(words); i += chunkSize {
		end := i + chunkSize
		if end > len(words) {
			end = len(words)
		}
		chunk := strings.Join(words[i:end], " ")
		docs = append(docs, store.Document{
			Repo:    repo,
			Path:    path,
			ChunkID: len(docs),
			Content: chunk,
			Metadata: map[string]any{
				"offset": i,
			},
		})
	}
	return docs, nil
}
