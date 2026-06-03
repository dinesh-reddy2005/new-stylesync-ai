CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.fashion_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT,
  source TEXT,
  embedding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processed', 'failed')),
  embedding vector(1536),
  chunk_index INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES public.fashion_knowledge_base(id) ON DELETE CASCADE,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fashion_knowledge_base TO anon, authenticated;
GRANT ALL ON public.fashion_knowledge_base TO service_role;

CREATE INDEX idx_fkb_category ON public.fashion_knowledge_base (category);
CREATE INDEX idx_fkb_title ON public.fashion_knowledge_base (title);
CREATE INDEX idx_fkb_keywords ON public.fashion_knowledge_base (keywords);
CREATE INDEX idx_fkb_embedding_status ON public.fashion_knowledge_base (embedding_status);
CREATE INDEX idx_fkb_parent ON public.fashion_knowledge_base (parent_id);

CREATE INDEX idx_fkb_content_fts ON public.fashion_knowledge_base
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(keywords,'')));

CREATE INDEX idx_fkb_embedding_hnsw ON public.fashion_knowledge_base
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.fashion_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge base is publicly readable"
  ON public.fashion_knowledge_base
  FOR SELECT
  USING (true);

CREATE TRIGGER trg_fkb_updated_at
  BEFORE UPDATE ON public.fashion_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.match_fashion_knowledge(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  content TEXT,
  keywords TEXT,
  source TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    k.id, k.title, k.category, k.content, k.keywords, k.source,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.fashion_knowledge_base k
  WHERE k.embedding IS NOT NULL
    AND k.embedding_status = 'processed'
    AND (filter_category IS NULL OR k.category = filter_category)
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;