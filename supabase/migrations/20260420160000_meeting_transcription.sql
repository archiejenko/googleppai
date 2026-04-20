CREATE TABLE IF NOT EXISTS meeting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  org_id uuid REFERENCES organisations(id),
  type text,
  platform text,
  prospect_name text,
  company_name text,
  started_at timestamptz DEFAULT now(),
  duration_seconds integer,
  overall_score numeric,
  meddic_score numeric,
  talk_ratio numeric,
  presence_score numeric,
  status text DEFAULT 'processing',
  scores jsonb,
  created_at timestamptz DEFAULT now(),
  transcript text,
  transcript_status text CHECK (transcript_status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending',
  action_items jsonb,
  summary text
);

ALTER TABLE meeting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_sessions_select_own"
  ON meeting_sessions FOR SELECT
  USING (user_id = auth.uid() OR org_id = public.user_org_id());

CREATE POLICY "meeting_sessions_insert_own"
  ON meeting_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "meeting_sessions_update_own"
  ON meeting_sessions FOR UPDATE
  USING (user_id = auth.uid());
