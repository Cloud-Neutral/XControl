package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	rconfig "xcontrol/server/rag/config"
)

// main loads server RAG configuration and triggers a manual sync by
// calling the running API server's /api/rag/sync endpoint.
func main() {
	cfg, err := rconfig.LoadServer()
	if err != nil {
		log.Printf("read config: %v", err)
	} else {
		log.Printf("loaded %d datasource(s)", len(cfg.Datasources))
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
	log.Println("sync triggered")
}
