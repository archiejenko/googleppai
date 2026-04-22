-- Sprint 7: Real call recordings for Recall.ai ingestion pipeline

-- ============================================================
-- real_call_recordings
-- ============================================================
CREATE TABLE public.real_call_recordings (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  account_id        uuid          REFERENCES public.simulated_companies(id) ON DELETE SET NULL,
  persona_id        uuid          REFERENCES public.simulated_personas(id) ON DELETE SET NULL,
  recall_bot_id     text,
  transcript        text,
  transcript_ref    text,
  duration_seconds  int,
  meeting_url       text,
  call_type         text          DEFAULT 'real' CHECK (call_type IN ('real')),
  processed         boolean       DEFAULT false,
  recorded_at       timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.real_call_recordings ENABLE ROW LEVEL SECURITY;

-- Authenticated user policies (org-scoped)
DROP POLICY IF EXISTS "real_call_recordings_select" ON public.real_call_recordings;
CREATE POLICY "real_call_recordings_select" ON public.real_call_recordings
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "real_call_recordings_insert" ON public.real_call_recordings;
CREATE POLICY "real_call_recordings_insert" ON public.real_call_recordings
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "real_call_recordings_update" ON public.real_call_recordings;
CREATE POLICY "real_call_recordings_update" ON public.real_call_recordings
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "real_call_recordings_delete" ON public.real_call_recordings;
CREATE POLICY "real_call_recordings_delete" ON public.real_call_recordings
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

-- Service-role bypass for webhook edge function
DROP POLICY IF EXISTS "real_call_recordings_service_insert" ON public.real_call_recordings;
CREATE POLICY "real_call_recordings_service_insert" ON public.real_call_recordings
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "real_call_recordings_service_update" ON public.real_call_recordings;
CREATE POLICY "real_call_recordings_service_update" ON public.real_call_recordings
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "real_call_recordings_service_select" ON public.real_call_recordings;
CREATE POLICY "real_call_recordings_service_select" ON public.real_call_recordings
  FOR SELECT TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_real_call_recordings_org_id
  ON public.real_call_recordings (org_id);
CREATE INDEX IF NOT EXISTS idx_real_call_recordings_org_account
  ON public.real_call_recordings (org_id, account_id);
CREATE INDEX IF NOT EXISTS idx_real_call_recordings_recall_bot
  ON public.real_call_recordings (recall_bot_id);
