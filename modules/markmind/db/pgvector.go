package db

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"xcontrol/modules/markmind/ingest"
)

// Store wraps a pgx connection for vector operations.
type Store struct {
	Conn *pgx.Conn
}

// NewStore connects to Postgres using the given DSN.
func NewStore(ctx context.Context, dsn string) (*Store, error) {
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		return nil, err
	}
	return &Store{Conn: conn}, nil
}

// InsertChunk writes a chunk and its vector to the database.
func (s *Store) InsertChunk(ctx context.Context, c ingest.Chunk, vec []float32) error {
	meta, _ := json.Marshal(c.Meta)
	_, err := s.Conn.Exec(ctx,
		"INSERT INTO chunks (doc_id, content, vector, metadata) VALUES ($1,$2,$3,$4)",
		c.DocID, c.Content, vec, meta,
	)
	return err
}

// SearchSimilar returns chunks sorted by vector similarity.
func (s *Store) SearchSimilar(ctx context.Context, vec []float32, limit int) ([]ingest.Chunk, error) {
	rows, err := s.Conn.Query(ctx,
		"SELECT doc_id, content, metadata FROM chunks ORDER BY vector <-> $1 LIMIT $2",
		vec, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []ingest.Chunk
	for rows.Next() {
		var c ingest.Chunk
		var metaBytes []byte
		if err := rows.Scan(&c.DocID, &c.Content, &metaBytes); err != nil {
			return nil, err
		}
		json.Unmarshal(metaBytes, &c.Meta)
		res = append(res, c)
	}
	return res, rows.Err()
}
