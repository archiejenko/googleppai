-- Ensure live_scores table exists with all columns referenced across the codebase.
-- The table may already exist remotely (created via dashboard) but with missing columns.
-- Uses CREATE TABLE IF NOT EXISTS followed by ALTER TABLE ADD COLUMN IF NOT EXISTS
-- to safely converge on the full schema.

CREATE TABLE IF NOT EXISTS public.live_scores (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid          REFERENCES organisations(id),
  rep_id                    uuid          REFERENCES auth.users(id),
  call_id                   text          UNIQUE,
  call_started_at           timestamptz   DEFAULT now(),
  call_ended_at             timestamptz,
  overall_score             numeric,
  prospect_name             text,
  company_name              text,
  next_step_confirmed       boolean,
  pacing_score              numeric
);

-- Add every column that may be missing from an older schema
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS duration_secs integer;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS qualified boolean DEFAULT false;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS discovery_score numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS objection_handling_score numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS objection_score numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS engagement_score numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS talk_ratio_score numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS talk_ratio numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS question_quality_score numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS filler_rate_per_min numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS final_score numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS composite_score numeric;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS rep_talk_pct numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS prospect_talk_pct numeric;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS avg_speech_rate_wpm numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS speech_rate_variance numeric;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS implication_question_rate numeric;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS filler_word_rate numeric;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS filler_word_count integer;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS filler_words_breakdown jsonb;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS next_step_text text;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS next_step_date_mentioned boolean;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS call_stage text;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS deepgram_session_id text;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS transcript text;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS transcript_status text DEFAULT 'pending';

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS snapshot_count integer DEFAULT 0;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS scoring_metadata jsonb;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS computed_at timestamptz;

ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS signals_detected jsonb;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS coaching_events jsonb;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS session_snapshots jsonb;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS sentiment_curve jsonb;
ALTER TABLE public.live_scores ADD COLUMN IF NOT EXISTS objection_log jsonb;

-- Add constraints that may be missing
DO $$ BEGIN
  ALTER TABLE public.live_scores ADD CONSTRAINT live_scores_status_check
    CHECK (status IN ('active', 'completed', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.live_scores ADD CONSTRAINT live_scores_transcript_status_check
    CHECK (transcript_status IN ('pending', 'processing', 'complete', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique constraint on session_id (may already exist)
DO $$ BEGIN
  ALTER TABLE public.live_scores ADD CONSTRAINT live_scores_session_id_key UNIQUE (session_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS: SELECT via user_id for the new column
DROP POLICY IF EXISTS "live_scores_select_user_id" ON public.live_scores;
CREATE POLICY "live_scores_select_user_id" ON public.live_scores
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND public.get_my_role() IN ('team_lead', 'admin'))
  );

-- INSERT: authenticated user can insert own rows
DROP POLICY IF EXISTS "live_scores_insert" ON public.live_scores;
CREATE POLICY "live_scores_insert" ON public.live_scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: authenticated user can update own rows
DROP POLICY IF EXISTS "live_scores_update" ON public.live_scores;
CREATE POLICY "live_scores_update" ON public.live_scores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_scores_user_id ON public.live_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_live_scores_org_id ON public.live_scores (org_id);
CREATE INDEX IF NOT EXISTS idx_live_scores_session_id ON public.live_scores (session_id);
