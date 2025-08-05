package store

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Document represents a chunk stored in Postgres.
type Document struct {
	ID        int64
	Repo      string
	Path      string
	ChunkID   int
	Content   string
	Embedding []float32
	Metadata  map[string]any
}

// Store wraps a pgx pool for vector operations.
type Store struct {
	pool *pgxpool.Pool
}

// New creates a new Store connected using dsn.
func New(ctx context.Context, dsn string) (*Store, error) {
	p, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	return &Store{pool: p}, nil
}

// Upsert writes documents and their embeddings to the database.
func (s *Store) Upsert(ctx context.Context, docs []Document) error {
	for _, d := range docs {
		meta, _ := json.Marshal(d.Metadata)
		_, err := s.pool.Exec(ctx,
			`INSERT INTO documents (repo,path,chunk_id,content,embedding,metadata)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (repo,path,chunk_id) DO UPDATE
             SET content=EXCLUDED.content,
                 embedding=EXCLUDED.embedding,
                 metadata=EXCLUDED.metadata`,
			d.Repo, d.Path, d.ChunkID, d.Content, d.Embedding, meta,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// Search returns top similar documents ordered by cosine distance.
func (s *Store) Search(ctx context.Context, vec []float32, limit int) ([]Document, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT repo,path,chunk_id,content,metadata
         FROM documents
         ORDER BY embedding <-> $1
         LIMIT $2`, vec, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []Document
	for rows.Next() {
		var d Document
		var meta []byte
		if err := rows.Scan(&d.Repo, &d.Path, &d.ChunkID, &d.Content, &meta); err != nil {
			return nil, err
		}
		json.Unmarshal(meta, &d.Metadata)
		res = append(res, d)
	}
	return res, rows.Err()
}
