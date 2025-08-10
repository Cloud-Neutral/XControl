package rag

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	pgvector "github.com/pgvector/pgvector-go"

	"xcontrol/internal/rag/config"
	"xcontrol/internal/rag/embed"
	"xcontrol/internal/rag/store"
)

type Service struct {
	cfg *config.Config
}

func New(cfg *config.Config) *Service {
	return &Service{cfg: cfg}
}

// Upsert stores pre-embedded documents into the vector database.
func (s *Service) Upsert(ctx context.Context, rows []store.DocRow) (int, error) {
	if s == nil || s.cfg == nil || len(rows) == 0 {
		return 0, nil
	}
	dsn := s.cfg.Global.VectorDB.DSN()
	if dsn == "" {
		return 0, nil
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return 0, err
	}
	defer conn.Close(ctx)

	dim := len(rows[0].Embedding)
	// Allow schema migration so the embedding dimension can be updated
	if err := store.EnsureSchema(ctx, conn, dim, true); err != nil {
		return 0, err
	}
	return store.UpsertDocuments(ctx, conn, rows)
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
	if embCfg.APIKey == "" || embCfg.BaseURL == "" {
		return nil, nil
	}
	var emb embed.Embedder
	switch embCfg.Provider {
	case "allama":
		emb = embed.NewAllama(embCfg.BaseURL, embCfg.Model, embCfg.Dimension)
	default:
		if embCfg.Model != "" {
			emb = embed.NewOpenAI(embCfg.BaseURL, embCfg.APIKey, embCfg.Model, embCfg.Dimension)
		} else {
			emb = embed.NewBGE(embCfg.BaseURL, embCfg.APIKey, embCfg.Dimension)
		}
	}
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
