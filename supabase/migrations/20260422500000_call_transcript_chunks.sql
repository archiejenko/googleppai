-- Sprint 5: pgvector-backed transcript chunks for semantic retrieval
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- call_transcript_chunks
-- ============================================================
CREATE TABLE public.call_transcript_chunks (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  call_summary_id uuid          NOT NULL REFERENCES public.call_summaries(id) ON DELETE CASCADE,
  chunk_index     int           NOT NULL,
  chunk_text      text          NOT NULL,
  embedding       extensions.vector(1536),
  created_at      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.call_transcript_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_transcript_chunks_select" ON public.call_transcript_chunks;
CREATE POLICY "call_transcript_chunks_select" ON public.call_transcript_chunks
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "call_transcript_chunks_insert" ON public.call_transcript_chunks;
CREATE POLICY "call_transcript_chunks_insert" ON public.call_transcript_chunks
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "call_transcript_chunks_update" ON public.call_transcript_chunks;
CREATE POLICY "call_transcript_chunks_update" ON public.call_transcript_chunks
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "call_transcript_chunks_delete" ON public.call_transcript_chunks;
CREATE POLICY "call_transcript_chunks_delete" ON public.call_transcript_chunks
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

CREATE INDEX IF NOT EXISTS idx_call_transcript_chunks_org_summary
  ON public.call_transcript_chunks (org_id, call_summary_id);

CREATE INDEX IF NOT EXISTS idx_call_transcript_chunks_embedding
  ON public.call_transcript_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

-- ============================================================
-- RPC: match_transcript_chunks
-- Uses public.user_org_id() for tenant isolation regardless of
-- the p_org_id parameter (kept for caller ergonomics only).
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_transcript_chunks(
  query_embedding   extensions.vector(1536),
  p_org_id          uuid,
  p_account_state_id uuid,
  match_count       int DEFAULT 3
)
RETURNS TABLE (
  id              uuid,
  chunk_text      text,
  chunk_index     int,
  call_summary_id uuid,
  similarity      float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT
    c.id,
    c.chunk_text,
    c.chunk_index,
    c.call_summary_id,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.call_transcript_chunks c
  INNER JOIN public.call_summaries cs
    ON cs.id = c.call_summary_id
   AND cs.account_state_id = p_account_state_id
   AND cs.archived_at IS NULL
  WHERE c.org_id = public.user_org_id()
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
