package ingest

import (
	"bytes"

	"github.com/yuin/goldmark"
)

// ConvertToText converts Markdown content to plain text using goldmark.
func ConvertToText(md string) (string, error) {
	var buf bytes.Buffer
	if err := goldmark.Convert([]byte(md), &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}
