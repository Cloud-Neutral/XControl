-- ================================================
-- init.sql  (idempotent / repeatable)
-- Vector RAG schema for BGE-M3 (1024 dims)
-- ================================================

-- 可选，但建议：避免长时间阻塞
SET lock_timeout = '5s';
SET statement_timeout = '0';

-- 1) 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) 表（如果不存在则创建最小骨架）
CREATE TABLE IF NOT EXISTS public.documents (
    id          BIGSERIAL PRIMARY KEY,
    repo        TEXT        NOT NULL,
    path        TEXT        NOT NULL,
    chunk_id    INT         NOT NULL,
    content     TEXT        NOT NULL,
    embedding   VECTOR(1024),
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.1) 幂等补列：content_sha
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_sha TEXT;

-- 2.2) 幂等补列：content_tsv
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_tsv tsvector;

-- 2.3) 幂等补列：doc_key（优先创建为生成列表达式；若已存在普通列也可共存）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='documents' AND column_name='doc_key'
  ) THEN
    EXECUTE $SQL$
      ALTER TABLE public.documents
      ADD COLUMN doc_key TEXT GENERATED ALWAYS AS (repo || ':' || path || ':' || chunk_id) STORED
    $SQL$;
  END IF;
END$$;

-- 2.4) 兜底触发器：若 doc_key 不是生成列或存在旧脏数据，则在写入时自动修正
CREATE OR REPLACE FUNCTION public.documents_doc_key_fill()
RETURNS trigger AS $$
BEGIN
  IF NEW.doc_key IS NULL OR NEW.doc_key <> (NEW.repo || ':' || NEW.path || ':' || NEW.chunk_id) THEN
    NEW.doc_key := (NEW.repo || ':' || NEW.path || ':' || NEW.chunk_id);
  END IF;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_documents_doc_key_fill') THEN
    CREATE TRIGGER trg_documents_doc_key_fill
    BEFORE INSERT OR UPDATE OF repo, path, chunk_id
    ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.documents_doc_key_fill();
  END IF;
END$$;

-- 3) 唯一约束 / 唯一索引（满足 ON CONFLICT (doc_key)）
-- 用唯一索引实现，幂等
CREATE UNIQUE INDEX IF NOT EXISTS documents_doc_key_uk
  ON public.documents (doc_key);

-- 4) HNSW 索引（cosine 距离 + 仅索引非空向量）
-- 某些 pgvector 旧版不支持 WITH(m, ef_construction)，做兼容回退
DO $$
BEGIN
  -- 先尝试带参数版本
  BEGIN
    EXECUTE $SQL$
      CREATE INDEX IF NOT EXISTS documents_embedding_idx
      ON public.documents
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
      WHERE embedding IS NOT NULL
    $SQL$;
  EXCEPTION WHEN others THEN
    -- 参数不支持则退化为无参数版本
    PERFORM 1;
    EXECUTE 'DROP INDEX IF EXISTS documents_embedding_idx';
    EXECUTE $SQL$
      CREATE INDEX IF NOT EXISTS documents_embedding_idx
      ON public.documents
      USING hnsw (embedding vector_cosine_ops)
      WHERE embedding IS NOT NULL
    $SQL$;
  END;
END$$;

-- 5) 元数据 & 常用过滤索引
CREATE INDEX IF NOT EXISTS idx_documents_metadata
  ON public.documents USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_documents_repo
  ON public.documents (repo);

CREATE INDEX IF NOT EXISTS idx_documents_path
  ON public.documents (path);

CREATE INDEX IF NOT EXISTS idx_documents_repo_path
  ON public.documents (repo, path);

-- 6) 全文检索（英文示例；中文可换词典/外部分词）
CREATE OR REPLACE FUNCTION public.documents_tsv_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.content_tsv := setweight(to_tsvector('english', coalesce(NEW.content,'')), 'A');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='documents_tsv_update') THEN
    CREATE TRIGGER documents_tsv_update
    BEFORE INSERT OR UPDATE OF content
    ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.documents_tsv_trigger();
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_documents_tsv
  ON public.documents USING gin (content_tsv);

-- 7) updated_at 自动维护
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_documents_set_updated_at') THEN
    CREATE TRIGGER trg_documents_set_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 8) 可选：一次性回填已有行的 content_tsv / doc_key（首次迁移时执行，之后可注释掉）
-- UPDATE public.documents
--   SET content_tsv = setweight(to_tsvector('english', coalesce(content,'')), 'A'),
--       doc_key = (repo || ':' || path || ':' || chunk_id)
-- WHERE content_tsv IS NULL OR doc_key IS NULL;
