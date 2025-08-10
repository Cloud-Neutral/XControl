-- 1) 补齐缺失列（幂等）
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_sha TEXT;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS doc_key TEXT
  GENERATED ALWAYS AS (repo || ':' || path || ':' || chunk_id) STORED;

-- 2) 先删除旧的向量索引（若存在，避免定义不一致）
DROP INDEX IF EXISTS documents_embedding_idx;

-- 3) 重建 HNSW 索引（正确顺序：WITH -> WHERE）
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- 4) 元数据/常用索引已存在就跳过（这里仅确保存在）
CREATE INDEX IF NOT EXISTS idx_documents_metadata     ON documents USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_documents_repo         ON documents (repo);
CREATE INDEX IF NOT EXISTS idx_documents_path         ON documents (path);
CREATE INDEX IF NOT EXISTS idx_documents_repo_path    ON documents (repo, path);

-- 5) 全文检索列与索引（若之前没建会自动补齐）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='documents' AND column_name='content_tsv'
  ) THEN
    ALTER TABLE documents ADD COLUMN content_tsv tsvector;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION documents_tsv_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := setweight(to_tsvector('english', coalesce(NEW.content,'')), 'A');
  RETURN NEW;
END$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'documents_tsv_update') THEN
    CREATE TRIGGER documents_tsv_update
    BEFORE INSERT OR UPDATE OF content ON documents
    FOR EACH ROW EXECUTE FUNCTION documents_tsv_trigger();
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_documents_tsv ON documents USING gin (content_tsv);

-- 6) 为 ON CONFLICT 提供唯一约束/索引（两种都可以，有其一即可）
-- 简化做法：建唯一索引（即可满足 ON CONFLICT）
CREATE UNIQUE INDEX IF NOT EXISTS documents_doc_key_uk ON documents (doc_key);
