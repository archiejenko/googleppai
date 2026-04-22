-- Sprint 4: Add archived_at to call_summaries for soft-delete on account reset
ALTER TABLE public.call_summaries
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT null;

CREATE INDEX IF NOT EXISTS idx_call_summaries_active
  ON public.call_summaries (account_state_id, call_number)
  WHERE archived_at IS NULL;
