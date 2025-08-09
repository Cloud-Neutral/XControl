package ingest

import (
	"strings"
	"testing"

	cfgpkg "xcontrol/server/rag/config"
)

func TestBuildChunksHeading(t *testing.T) {
	secs := []Section{{Heading: "h", Text: "a b c"}}
	cfg := cfgpkg.ChunkingCfg{MaxTokens: 10, OverlapTokens: 2}
	chunks, err := BuildChunks(secs, cfg)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	if len(chunks) != 1 {
		t.Fatalf("expected 1 chunk, got %d", len(chunks))
	}
	if chunks[0].Meta["heading"].(string) != "h" {
		t.Fatalf("heading mismatch")
	}
}

func TestBuildChunksSlidingWindow(t *testing.T) {
	text := "one two three four five six seven eight nine ten"
	secs := []Section{{Heading: "h", Text: text}}
	cfg := cfgpkg.ChunkingCfg{MaxTokens: 4, OverlapTokens: 1}
	chunks, err := BuildChunks(secs, cfg)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	if len(chunks) != 3 {
		t.Fatalf("expected 3 chunks, got %d", len(chunks))
	}
}

func TestBuildChunksOverlap(t *testing.T) {
	text := "a b c d e f"
	secs := []Section{{Heading: "h", Text: text}}
	cfg := cfgpkg.ChunkingCfg{MaxTokens: 3, OverlapTokens: 1}
	chunks, err := BuildChunks(secs, cfg)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	if len(chunks) != 3 {
		t.Fatalf("expected 3 chunks, got %d", len(chunks))
	}
	if !strings.Contains(chunks[1].Text, "c") {
		t.Fatalf("expected overlap token in second chunk")
	}
}
