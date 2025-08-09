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
	Repo       string
	Path       string
	ChunkID    int
	Content    string
	Embedding  []float32
	Metadata   map[string]any
	ContentSHA string
}

// EnsureSchema creates the documents table and indexes if they do not exist. It
// also validates the embedding dimension. When migrate is true and a dimension
// mismatch is detected, it attempts to alter the column type.
func EnsureSchema(ctx context.Context, conn *pgx.Conn, dim int, migrate bool) error {
	// ensure table
	create := fmt.Sprintf(`CREATE TABLE IF NOT EXISTS documents (
        id BIGSERIAL PRIMARY KEY,
        repo TEXT,
        path TEXT,
        chunk_id INT,
        content TEXT,
        embedding VECTOR(%d),
        metadata JSONB,
        content_sha TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(repo,path,chunk_id)
    )`, dim)
	if _, err := conn.Exec(ctx, create); err != nil {
		return err
	}
	// check dimension
	var curDim int
	err := conn.QueryRow(ctx, `SELECT atttypmod-4 FROM pg_attribute a JOIN pg_type t ON a.atttypid=t.oid WHERE a.attrelid='documents'::regclass AND a.attname='embedding'`).Scan(&curDim)
	if err == nil && curDim != dim {
		if !migrate {
			return fmt.Errorf("embedding dimension %d != %d", curDim, dim)
		}
		if _, err := conn.Exec(ctx, `DROP INDEX IF EXISTS documents_embedding_idx`); err != nil {
			return err
		}
		if _, err := conn.Exec(ctx, fmt.Sprintf(`ALTER TABLE documents ALTER COLUMN embedding TYPE VECTOR(%d)`, dim)); err != nil {
			return err
		}
	}
	// index
	if _, err := conn.Exec(ctx, `CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops)`); err != nil {
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
                content_sha=EXCLUDED.content_sha
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
