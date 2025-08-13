-- init.sql - minimal schema for vector RAG (1024 dims)
SET lock_timeout = '5s';
SET statement_timeout = '0';

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.documents (
    id          BIGSERIAL PRIMARY KEY,
    repo        TEXT        NOT NULL,
    path        TEXT        NOT NULL,
    chunk_id    INT         NOT NULL,
    content     TEXT        NOT NULL,
    embedding   VECTOR(1024),
    metadata    JSONB,
    content_sha TEXT       NOT NULL,
    content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (repo, path, chunk_id)
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON public.documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS documents_content_tsv_idx
  ON public.documents USING gin (content_tsv);
