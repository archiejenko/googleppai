-- Migration: admin action audit log
-- Immutable append-only log of all privileged actions: user deletions,
-- org creation, Stripe subscription events, and future admin operations.
-- Written exclusively by Edge Functions using the service role key.
-- No user-level read or write access.

CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    uuid,                          -- auth.uid() of the performing user; NULL for system events (e.g. Stripe webhooks)
  actor_role  text,                          -- role at time of action ('admin', 'system')
  action      text        NOT NULL,          -- e.g. 'delete_user', 'create_organisation', 'stripe.checkout.session.completed'
  target_type text        NOT NULL,          -- 'user', 'organisation', 'subscription'
  target_id   text        NOT NULL,          -- UUID or Stripe ID of the affected record
  metadata    jsonb       DEFAULT '{}',      -- additional context (company name, tier, event id, etc.)
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- RLS on; no policies added — only the service role key can write.
-- Admins viewing logs should use a dedicated RPC that returns read-only results.
ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

-- Prevent deletion of log rows (immutability enforcement at DB layer)
CREATE RULE admin_action_log_no_delete AS
  ON DELETE TO public.admin_action_log DO INSTEAD NOTHING;

-- Prevent updates to existing log rows
CREATE RULE admin_action_log_no_update AS
  ON UPDATE TO public.admin_action_log DO INSTEAD NOTHING;

-- Index for querying by actor or target
CREATE INDEX admin_action_log_actor_idx  ON public.admin_action_log (actor_id);
CREATE INDEX admin_action_log_target_idx ON public.admin_action_log (target_type, target_id);
CREATE INDEX admin_action_log_action_idx ON public.admin_action_log (action);
CREATE INDEX admin_action_log_time_idx   ON public.admin_action_log (created_at DESC);
