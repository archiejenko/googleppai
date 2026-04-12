-- Migration: call_consent_log
-- Creates an audit table recording when a sales rep confirmed prospect consent
-- before a live call recording session began. Required for GDPR Article 6 compliance
-- when processing third-party (prospect) voice data.

CREATE TABLE IF NOT EXISTS public.call_consent_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  call_id       uuid,
  consented_at  timestamptz DEFAULT now() NOT NULL,
  consent_text  text NOT NULL,
  session_type  text
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON public.call_consent_log (user_id);

COMMENT ON TABLE public.call_consent_log IS
  'Audit log of rep confirmations that call participants were informed of AI analysis. GDPR Art. 6 evidence.';
