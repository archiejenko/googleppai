-- Call consent log: tracks explicit consent/decline for Deepgram recording sessions.

CREATE TABLE IF NOT EXISTS public.call_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS session_id text REFERENCES live_scores(session_id);
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS consent_given boolean NOT NULL DEFAULT false;
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS consent_text text NOT NULL DEFAULT '';
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS consent_version text NOT NULL DEFAULT '';
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS consented_at timestamptz DEFAULT now();
ALTER TABLE public.call_consent_log ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;

ALTER TABLE public.call_consent_log ENABLE ROW LEVEL SECURITY;

-- SELECT: own records or org admin
DROP POLICY IF EXISTS "consent_log_select" ON public.call_consent_log;
CREATE POLICY "consent_log_select" ON public.call_consent_log
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (org_id = public.user_org_id() AND public.get_my_role() IN ('team_lead', 'admin'))
  );

-- INSERT: own records only
DROP POLICY IF EXISTS "consent_log_insert" ON public.call_consent_log;
CREATE POLICY "consent_log_insert" ON public.call_consent_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: service role only (for withdrawn_at) — no authenticated policy
-- DELETE: none

CREATE INDEX IF NOT EXISTS idx_consent_log_session_id ON public.call_consent_log (session_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON public.call_consent_log (user_id);
