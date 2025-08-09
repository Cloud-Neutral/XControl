package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	rconfig "xcontrol/server/rag/config"
	"xcontrol/server/rag/embed"
	"xcontrol/server/rag/ingest"
	"xcontrol/server/rag/store"
	rsync "xcontrol/server/rag/sync"
)

// main performs cloning, parsing and embedding before sending documents to the server.
func main() {
	configPath := flag.String("config", "", "Path to RAG configuration file")
	flag.Parse()
	if *configPath == "" {
		log.Fatalf("config path required")
	}
	cfg, err := rconfig.Load(*configPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	baseURL := os.Getenv("SERVER_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	embCfg := cfg.ResolveEmbedding()
	chunkCfg := cfg.ResolveChunking()
	embedder := embed.NewOpenAI(embCfg.BaseURL, embCfg.APIKey, embCfg.Model, embCfg.Dimension)

	for _, ds := range cfg.Global.Datasources {
		workdir := filepath.Join(os.TempDir(), "xcontrol", ds.Name)
		if _, err := rsync.SyncRepo(ctx, ds.Repo, workdir); err != nil {
			log.Fatalf("sync repo %s: %v", ds.Name, err)
		}
		root := filepath.Join(workdir, ds.Path)
		files, err := ingest.ListMarkdown(root, chunkCfg.IncludeExts, chunkCfg.IgnoreDirs, 0)
		if err != nil {
			log.Fatalf("list markdown: %v", err)
		}
		var rows []store.DocRow
		for _, f := range files {
			secs, err := ingest.ParseMarkdown(f)
			if err != nil {
				log.Printf("parse %s: %v", f, err)
				continue
			}
			chunks, err := ingest.BuildChunks(secs, chunkCfg)
			if err != nil {
				log.Printf("chunk %s: %v", f, err)
				continue
			}
			texts := make([]string, len(chunks))
			rs := make([]store.DocRow, len(chunks))
			for i, ch := range chunks {
				texts[i] = ch.Text
				rs[i] = store.DocRow{
					Repo:       ds.Repo,
					Path:       strings.TrimPrefix(f, workdir+"/"),
					ChunkID:    ch.ChunkID,
					Content:    ch.Text,
					Metadata:   ch.Meta,
					ContentSHA: ch.SHA256,
				}
			}
			vecs, _, err := embedder.Embed(ctx, texts)
			if err != nil {
				log.Printf("embed %s: %v", f, err)
				continue
			}
			for i := range rs {
				rs[i].Embedding = vecs[i]
			}
			rows = append(rows, rs...)
		}

		payload := struct {
			Docs []store.DocRow `json:"docs"`
		}{Docs: rows}
		b, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/api/rag/upsert", bytes.NewReader(b))
		if err != nil {
			log.Fatalf("create request: %v", err)
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Fatalf("upsert request: %v", err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			log.Fatalf("upsert failed: %s", resp.Status)
		}
		log.Printf("ingested %d rows for %s", len(rows), ds.Name)
	}
}
