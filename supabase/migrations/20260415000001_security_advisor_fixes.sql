-- Migration: Fix Supabase Security Advisor errors
-- 1. Convert SECURITY DEFINER views to SECURITY INVOKER
-- 2. Enable RLS on 5 tables that the advisor reports as unprotected
--    (these were covered in 20260412000002 but may not have applied to live)

-- ── SECURITY DEFINER views → SECURITY INVOKER ─────────────────────────────────
-- PostgreSQL 15+ supports ALTER VIEW ... SET (security_invoker = true).
-- This replaces the dashboard-created SECURITY DEFINER property without
-- requiring the full view body to be re-specified.

ALTER VIEW public.stage_conversion_rates SET (security_invoker = true);
ALTER VIEW public.training_correlation    SET (security_invoker = true);

-- ── Enable RLS — idempotent, safe to run even if already enabled ──────────────

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatched_drills     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_requests      ENABLE ROW LEVEL SECURITY;

-- ── Policies ──────────────────────────────────────────────────────────────────
-- leaderboard_snapshots, dispatched_drills, prospect_profiles, upgrade_requests
-- already have policies in 20260412000002. Re-creating with IF NOT EXISTS pattern
-- (DROP IF EXISTS + CREATE) ensures they exist even if that migration was skipped.

-- leaderboard_snapshots ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leaderboard_snapshots_select" ON public.leaderboard_snapshots;
CREATE POLICY "leaderboard_snapshots_select" ON public.leaderboard_snapshots
  FOR SELECT TO authenticated
  USING (org_id = auth.user_org_id());

-- dispatched_drills ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dispatched_drills_select" ON public.dispatched_drills;
CREATE POLICY "dispatched_drills_select" ON public.dispatched_drills
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dispatched_drills_insert" ON public.dispatched_drills;
CREATE POLICY "dispatched_drills_insert" ON public.dispatched_drills
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dispatched_drills_update" ON public.dispatched_drills;
CREATE POLICY "dispatched_drills_update" ON public.dispatched_drills
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dispatched_drills_delete" ON public.dispatched_drills;
CREATE POLICY "dispatched_drills_delete" ON public.dispatched_drills
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- deployment_requests ─────────────────────────────────────────────────────────
-- Public-facing demo/feedback form. No user_id column.
-- Inserts are accepted from anonymous and authenticated visitors.
-- SELECT/UPDATE/DELETE are service-role only (no client policy = implicit deny).
DROP POLICY IF EXISTS "deployment_requests_insert" ON public.deployment_requests;
CREATE POLICY "deployment_requests_insert" ON public.deployment_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- prospect_profiles ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "prospect_profiles_select" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_select" ON public.prospect_profiles
  FOR SELECT TO authenticated
  USING (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "prospect_profiles_insert" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_insert" ON public.prospect_profiles
  FOR INSERT TO authenticated
  WITH CHECK (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "prospect_profiles_update" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_update" ON public.prospect_profiles
  FOR UPDATE TO authenticated
  USING (org_id = auth.user_org_id())
  WITH CHECK (org_id = auth.user_org_id());

DROP POLICY IF EXISTS "prospect_profiles_delete" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_delete" ON public.prospect_profiles
  FOR DELETE TO authenticated
  USING (org_id = auth.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'));

-- upgrade_requests ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "upgrade_requests_select" ON public.upgrade_requests;
CREATE POLICY "upgrade_requests_select" ON public.upgrade_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = auth.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

DROP POLICY IF EXISTS "upgrade_requests_insert" ON public.upgrade_requests;
CREATE POLICY "upgrade_requests_insert" ON public.upgrade_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND org_id = auth.user_org_id());

DROP POLICY IF EXISTS "upgrade_requests_delete" ON public.upgrade_requests;
CREATE POLICY "upgrade_requests_delete" ON public.upgrade_requests
  FOR DELETE TO authenticated
  USING (org_id = auth.user_org_id() AND auth.user_role() = 'admin');
