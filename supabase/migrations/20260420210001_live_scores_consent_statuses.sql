-- Expand live_scores status constraint to include consent-related statuses.

ALTER TABLE public.live_scores DROP CONSTRAINT IF EXISTS live_scores_status_check;
ALTER TABLE public.live_scores ADD CONSTRAINT live_scores_status_check
  CHECK (status IN ('pending_consent', 'active', 'completed', 'abandoned', 'failed'));
