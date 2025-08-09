package main

import (
	"context"
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"xcontrol/server/proxy"
	rconfig "xcontrol/server/rag/config"
	"xcontrol/server/rag/ingest"
)

// main loads server RAG configuration and triggers a manual sync by
// calling the running API server's /api/rag/sync endpoint. When a file path
// is provided, it instead performs local markdown parsing and chunking.
func main() {
	configPath := flag.String("config", "", "Path to server RAG configuration file")
	filePath := flag.String("file", "", "Markdown file to parse and chunk")
	flag.Parse()

	var cfg *rconfig.Config
	var err error
	if *configPath != "" {
		cfg, err = rconfig.Load(*configPath)
		if err != nil {
			log.Fatalf("load config: %v", err)
		}
	} else {
		cfg = &rconfig.Config{}
	}

	if *filePath != "" {
		chunkCfg := cfg.ResolveChunking()
		secs, err := ingest.ParseMarkdown(*filePath)
		if err != nil {
			log.Fatalf("parse markdown: %v", err)
		}
		chunks, err := ingest.BuildChunks(secs, chunkCfg)
		if err != nil {
			log.Fatalf("build chunks: %v", err)
		}
		enc := json.NewEncoder(os.Stdout)
		for _, ch := range chunks {
			if err := enc.Encode(ch); err != nil {
				log.Fatalf("encode chunk: %v", err)
			}
		}
		return
	}

	baseURL := os.Getenv("SERVER_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/api/rag/sync", nil)
	if err != nil {
		log.Fatalf("create request: %v", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("sync request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		log.Fatalf("sync failed: %s", string(b))
	}
	if _, err := io.Copy(os.Stdout, resp.Body); err != nil {
		log.Fatalf("read response: %v", err)
	}
}
