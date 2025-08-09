package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	rconfig "xcontrol/internal/rag/config"
	"xcontrol/internal/rag/embed"
	"xcontrol/internal/rag/ingest"
	"xcontrol/internal/rag/store"
	rsync "xcontrol/internal/rag/sync"
	"xcontrol/server/proxy"
)

// main either lists markdown files for ingestion or processes a single file.
// When invoked without -file, it synchronizes configured repositories and
// prints absolute paths of markdown files to stdout. When -file is provided,
// the file is parsed, embedded and sent to the /api/rag/upsert endpoint.

func main() {
	configPath := flag.String("config", "", "Path to server RAG configuration file")
	filePath := flag.String("file", "", "Markdown file to embed and upsert")
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

	proxy.Set(cfg.Global.Proxy)

	embCfg := cfg.ResolveEmbedding()
	chunkCfg := cfg.ResolveChunking()

	baseURL := os.Getenv("SERVER_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	if *filePath != "" {
		var ds *rconfig.DataSource
		var workdir string
		for i := range cfg.Global.Datasources {
			wd := filepath.Join(os.TempDir(), "xcontrol", cfg.Global.Datasources[i].Name)
			if strings.HasPrefix(*filePath, wd) {
				ds = &cfg.Global.Datasources[i]
				workdir = wd
				break
			}
		}
		if ds == nil {
			log.Fatalf("file %s not under any datasource", *filePath)
		}

		var embedder embed.Embedder
		if embCfg.Model != "" {
			embedder = embed.NewOpenAI(embCfg.BaseURL, embCfg.APIKey, embCfg.Model, embCfg.Dimension)
		} else {
			embedder = embed.NewBGE(embCfg.BaseURL, embCfg.APIKey, embCfg.Dimension)
		}

		secs, err := ingest.ParseMarkdown(*filePath)
		if err != nil {
			log.Fatalf("parse markdown: %v", err)
		}
		chunks, err := ingest.BuildChunks(secs, chunkCfg)
		if err != nil {
			log.Fatalf("build chunks: %v", err)
		}
		texts := make([]string, len(chunks))
		rows := make([]store.DocRow, len(chunks))
		rel := strings.TrimPrefix(*filePath, workdir+"/")
		for i, ch := range chunks {
			texts[i] = ch.Text
			rows[i] = store.DocRow{
				Repo:       ds.Repo,
				Path:       rel,
				ChunkID:    ch.ChunkID,
				Content:    ch.Text,
				Metadata:   ch.Meta,
				ContentSHA: ch.SHA256,
			}
		}
		vecs, _, err := embedder.Embed(ctx, texts)
		if err != nil {
			log.Fatalf("embed %s: %v", *filePath, err)
		}
		for i := range rows {
			rows[i].Embedding = vecs[i]
		}
		payload := struct {
			Docs []store.DocRow `json:"docs"`
		}{Docs: rows}
		b, err := json.Marshal(payload)
		if err != nil {
			log.Fatalf("marshal docs: %v", err)
		}
               var resp *http.Response
               var req *http.Request
               for i := 0; i < 3; i++ {
                       req, err = http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/api/rag/upsert", bytes.NewReader(b))
                       if err != nil {
                               log.Fatalf("create request: %v", err)
                       }
                       req.Header.Set("Content-Type", "application/json")
                       resp, err = http.DefaultClient.Do(req)
                       if err == nil {
                               break
                       }
                       time.Sleep(time.Second * time.Duration(i+1))
               }
               if err != nil {
                       log.Fatalf("upsert request: %v", err)
               }
               if resp == nil {
                       log.Fatalf("upsert request returned no response")
               }
               defer resp.Body.Close()
               if resp.StatusCode != http.StatusOK {
                       body, _ := io.ReadAll(resp.Body)
                       log.Fatalf("upsert failed: %s: %s", resp.Status, strings.TrimSpace(string(body)))
               }
		log.Printf("ingested %d chunks for %s", len(rows), rel)
		return
	}

	var syncErrs []string
	for _, ds := range cfg.Global.Datasources {
		workdir := filepath.Join(os.TempDir(), "xcontrol", ds.Name)
		if _, err := rsync.SyncRepo(ctx, ds.Repo, workdir); err != nil {
			log.Printf("sync repo %s: %v", ds.Name, err)
			syncErrs = append(syncErrs, ds.Name)
			continue
		}
		root := filepath.Join(workdir, ds.Path)
		files, err := ingest.ListMarkdown(root, chunkCfg.IncludeExts, chunkCfg.IgnoreDirs, 0)
		if err != nil {
			log.Fatalf("list markdown: %v", err)
		}
		for _, f := range files {
			fmt.Println(f)
		}
	}
	if len(syncErrs) > 0 {
		log.Fatalf("failed to sync repositories: %s", strings.Join(syncErrs, ", "))
	}
}
