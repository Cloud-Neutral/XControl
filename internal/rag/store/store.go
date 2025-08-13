package store

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	pgvector "github.com/pgvector/pgvector-go"
)

// DocRow represents a row to be stored in the documents table.
type DocRow struct {
	Repo       string         `json:"repo"`
	Path       string         `json:"path"`
	ChunkID    int            `json:"chunk_id"`
	Content    string         `json:"content"`
	Embedding  []float32      `json:"embedding"`
	Metadata   map[string]any `json:"metadata"`
	ContentSHA string         `json:"content_sha"`
}

// EnsureSchema creates the documents table and minimal indexes required for
// hybrid search. It avoids extensive migrations and only ensures the basic
// structure needed by the service.
func EnsureSchema(ctx context.Context, conn *pgx.Conn, dim int, _ bool) error {
	create := fmt.Sprintf(`CREATE TABLE IF NOT EXISTS documents (
        id BIGSERIAL PRIMARY KEY,
        repo TEXT NOT NULL,
        path TEXT NOT NULL,
        chunk_id INT NOT NULL,
        content TEXT NOT NULL,
        embedding VECTOR(%d),
        metadata JSONB,
        content_sha TEXT NOT NULL,
        content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(repo,path,chunk_id)
    )`, dim)
	if _, err := conn.Exec(ctx, create); err != nil {
		return err
	}
	if _, err := conn.Exec(ctx, `CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops)`); err != nil {
		return err
	}
	if _, err := conn.Exec(ctx, `CREATE INDEX IF NOT EXISTS documents_content_tsv_idx ON documents USING GIN (content_tsv)`); err != nil {
		return err
	}
	return nil
}

// UpsertDocuments upserts rows and returns affected row count.
func UpsertDocuments(ctx context.Context, conn *pgx.Conn, rows []DocRow) (int, error) {
	if len(rows) == 0 {
		return 0, nil
	}
	batch := &pgx.Batch{}
	for _, r := range rows {
		meta, _ := json.Marshal(r.Metadata)
		batch.Queue(`INSERT INTO documents (repo,path,chunk_id,content,embedding,metadata,content_sha)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (repo,path,chunk_id) DO UPDATE
            SET content=EXCLUDED.content,
                embedding=EXCLUDED.embedding,
                metadata=EXCLUDED.metadata,
                content_sha=EXCLUDED.content_sha,
                updated_at=now()
            WHERE documents.content_sha<>EXCLUDED.content_sha`,
			r.Repo, r.Path, r.ChunkID, r.Content, pgvector.NewVector(r.Embedding), meta, r.ContentSHA)
	}
	br := conn.SendBatch(ctx, batch)
	count := 0
	for range rows {
		ct, err := br.Exec()
		if err != nil {
			br.Close()
			return count, err
		}
		count += int(ct.RowsAffected())
	}
	return count, br.Close()
}
