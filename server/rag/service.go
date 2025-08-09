package rag

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	pgvector "github.com/pgvector/pgvector-go"

	"xcontrol/server/rag/config"
	"xcontrol/server/rag/embed"
	"xcontrol/server/rag/ingest"
)

type Service struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

func (s *Service) Sync(ctx context.Context) error {
	return s.SyncWithProgress(ctx, nil)
}

// SyncWithProgress performs a full sync while reporting progress via the provided callback.
//
// The progress callback may be nil. When non-nil it will receive human readable
// status messages as the sync operation progresses.
func (s *Service) SyncWithProgress(ctx context.Context, progress func(string)) error {
	if s == nil || s.cfg == nil {
		return nil
	}
	for _, ds := range s.cfg.Global.Datasources {
		if progress != nil {
			progress("syncing " + ds.Name)
		}
		if _, err := ingest.IngestRepo(ctx, s.cfg, ds, ingest.Options{}); err != nil {
			if progress != nil {
				progress("error syncing " + ds.Name + ": " + err.Error())
			}
			return err
		}
		if progress != nil {
			progress("completed " + ds.Name)
		}
	}
	return nil
}

func (s *Service) Watch(ctx context.Context) {
	if s == nil || s.cfg == nil {
		return
	}
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_ = s.Sync(ctx)
		}
	}
}

type Document struct {
	Repo     string         `json:"repo"`
	Path     string         `json:"path"`
	ChunkID  int            `json:"chunk_id"`
	Content  string         `json:"content"`
	Metadata map[string]any `json:"metadata"`
}

func (s *Service) Query(ctx context.Context, question string, limit int) ([]Document, error) {
	if s == nil || s.cfg == nil {
		return nil, nil
	}
	embCfg := s.cfg.ResolveEmbedding()
	if embCfg.APIKey == "" || embCfg.BaseURL == "" || embCfg.Model == "" {
		return nil, nil
	}
	emb := embed.NewOpenAI(embCfg.BaseURL, embCfg.APIKey, embCfg.Model, embCfg.Dimension)
	vecs, _, err := emb.Embed(ctx, []string{question})
	if err != nil {
		return nil, err
	}
	if len(vecs) == 0 {
		return nil, nil
	}
	dsn := s.cfg.Global.VectorDB.DSN()
	if dsn == "" {
		return nil, nil
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return nil, err
	}
	defer conn.Close(ctx)

	rows, err := conn.Query(ctx, `SELECT repo, path, chunk_id, content, metadata FROM documents ORDER BY embedding <-> $1 LIMIT $2`,
		pgvector.NewVector(vecs[0]), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []Document
	for rows.Next() {
		var d Document
		var metaBytes []byte
		if err := rows.Scan(&d.Repo, &d.Path, &d.ChunkID, &d.Content, &metaBytes); err != nil {
			return nil, err
		}
		if len(metaBytes) > 0 {
			_ = json.Unmarshal(metaBytes, &d.Metadata)
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}
