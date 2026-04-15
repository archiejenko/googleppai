-- Migration: Harden search_path on all 15 functions flagged by Supabase Security Advisor
--
-- Functions with a mutable search_path are vulnerable to search_path injection:
-- a malicious user could create objects in a schema that appears earlier on the
-- search_path and intercept calls to unqualified names inside the function body.
--
-- Fix: SET search_path = '' forces all name resolution to use fully-qualified
-- identifiers (schema.object). Existing function bodies already use public.*
-- fully-qualified names, so this is safe to apply without body changes.
--
-- Signatures for trigger functions (RETURNS trigger) are always ():
--   handle_new_user, notify_session_complete, notify_goal_achieved,
--   auto_update_goals_on_pitch, record_deal_stage_change,
--   update_deals_updated_at, update_organisations_updated_at,
--   update_pip_updated_at, update_ci_updated_at, update_bs_updated_at
--
-- Signatures for non-trigger functions are taken from their migration definitions
-- or inferred from call sites in the source code. To verify any signature:
--   SELECT pg_get_function_identity_arguments(oid)
--   FROM pg_proc WHERE proname = '<function_name>' AND pronamespace = 'public'::regnamespace;

-- ── Trigger functions (signature always ()) ───────────────────────────────────

ALTER FUNCTION public.handle_new_user()
  SET search_path = '';

ALTER FUNCTION public.notify_session_complete()
  SET search_path = '';

ALTER FUNCTION public.notify_goal_achieved()
  SET search_path = '';

ALTER FUNCTION public.auto_update_goals_on_pitch()
  SET search_path = '';

ALTER FUNCTION public.record_deal_stage_change()
  SET search_path = '';

ALTER FUNCTION public.update_deals_updated_at()
  SET search_path = '';

ALTER FUNCTION public.update_organisations_updated_at()
  SET search_path = '';

ALTER FUNCTION public.update_pip_updated_at()
  SET search_path = '';

ALTER FUNCTION public.update_ci_updated_at()
  SET search_path = '';

ALTER FUNCTION public.update_bs_updated_at()
  SET search_path = '';

-- ── Non-trigger functions ─────────────────────────────────────────────────────

-- From 20260409000000_admin_set_user_role.sql
ALTER FUNCTION public.admin_set_user_role(target_user_id uuid, new_role text)
  SET search_path = '';

-- Returns the org tier (e.g. 'starter', 'growth', 'enterprise') for the
-- calling user's organisation. No arguments; uses auth.uid() internally.
ALTER FUNCTION public.get_user_org_tier()
  SET search_path = '';

-- Computes and persists skill metrics for the calling user. No arguments.
ALTER FUNCTION public.calculate_user_skill_metrics()
  SET search_path = '';

-- pgvector semantic search over the documents table.
-- Standard Supabase pgvector RPC signature.
ALTER FUNCTION public.match_documents(
  query_embedding  vector,
  match_threshold  double precision,
  match_count      integer
) SET search_path = '';

-- Deal similarity search called from SimilarDealsPanel via supabase.rpc().
-- Call site (src/features/deal-view/SimilarDealsPanel.tsx:36):
--   supabase.rpc('match_similar_deals', { p_deal_id: dealId, match_limit: 5 })
ALTER FUNCTION public.match_similar_deals(
  p_deal_id    uuid,
  match_limit  integer
) SET search_path = '';
