package rag

import (
	"context"

	"xcontrol/server/rag/config"
	"xcontrol/server/rag/embed"
	"xcontrol/server/rag/ingest"
	"xcontrol/server/rag/store"
	rsync "xcontrol/server/rag/sync"
)

// Service provides high level RAG operations for syncing data sources
// and querying the vector store.
type Service struct {
	cfg *config.Config
	st  *store.Store
	emb embed.Embedder
}

// New creates a new Service using the provided configuration,
// storage and embedder. Any of the arguments may be nil if the
// corresponding feature is not required by the caller.
func New(cfg *config.Config, st *store.Store, emb embed.Embedder) *Service {
	return &Service{cfg: cfg, st: st, emb: emb}
}

// Sync clones or updates configured repositories, ingests markdown files
// and upserts their embeddings into the store.
func (s *Service) Sync(ctx context.Context) error {
	if s == nil || s.cfg == nil || s.st == nil || s.emb == nil {
		return nil
	}
	for _, repo := range s.cfg.Repos {
		files, err := rsync.Repo(repo)
		if err != nil {
			return err
		}
		for _, f := range files {
			docs, err := ingest.File(repo.URL, f)
			if err != nil {
				continue
			}
			for i := range docs {
				vec, err := s.emb.Embed(ctx, docs[i].Content)
				if err != nil {
					continue
				}
				docs[i].Embedding = vec
			}
			if err := s.st.Upsert(ctx, docs); err != nil {
				return err
			}
		}
	}
	return nil
}

// Query embeds the question and searches the store for similar documents.
// If the service is not fully configured, Query returns nil without error.
func (s *Service) Query(ctx context.Context, question string, limit int) ([]store.Document, error) {
	if s == nil || s.st == nil || s.emb == nil {
		return nil, nil
	}
	vec, err := s.emb.Embed(ctx, question)
	if err != nil {
		return nil, err
	}
	return s.st.Search(ctx, vec, limit)
}
