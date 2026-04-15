-- Migration: Enable RLS on 6 tables reported as unprotected by Supabase Security Advisor
-- All ALTER TABLE and CREATE POLICY statements are idempotent (DROP IF EXISTS + CREATE).
-- Policy pattern follows 20260412000002_rls_policies.sql: org_id = public.user_org_id()
-- and auth.user_role() for role checks.

-- ── leaderboard_snapshots ─────────────────────────────────────────────────────
-- Written by service-role. All org members can read.
-- No user_id column — org-only scope.

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaderboard_snapshots_select" ON public.leaderboard_snapshots;
CREATE POLICY "leaderboard_snapshots_select" ON public.leaderboard_snapshots
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

-- ── dispatched_drills ─────────────────────────────────────────────────────────
-- Reps read/write their own drills. No org_id column.

ALTER TABLE public.dispatched_drills ENABLE ROW LEVEL SECURITY;

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

-- ── deployment_requests ───────────────────────────────────────────────────────
-- Public demo/feedback form. No user_id or org_id column.
-- Inserts accepted from anon and authenticated visitors; reads/updates are
-- service-role only (no client-facing SELECT/UPDATE/DELETE policy = implicit deny).

ALTER TABLE public.deployment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deployment_requests_insert" ON public.deployment_requests;
CREATE POLICY "deployment_requests_insert" ON public.deployment_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ── prospect_profiles ─────────────────────────────────────────────────────────
-- Has org_id, no user_id. Org-scoped policies only.

ALTER TABLE public.prospect_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospect_profiles_select" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_select" ON public.prospect_profiles
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "prospect_profiles_insert" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_insert" ON public.prospect_profiles
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "prospect_profiles_update" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_update" ON public.prospect_profiles
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "prospect_profiles_delete" ON public.prospect_profiles;
CREATE POLICY "prospect_profiles_delete" ON public.prospect_profiles
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'));

-- ── upgrade_requests ──────────────────────────────────────────────────────────
-- Has both org_id and user_id. Reps see own requests; managers see org requests.

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upgrade_requests_select" ON public.upgrade_requests;
CREATE POLICY "upgrade_requests_select" ON public.upgrade_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

DROP POLICY IF EXISTS "upgrade_requests_insert" ON public.upgrade_requests;
CREATE POLICY "upgrade_requests_insert" ON public.upgrade_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND org_id = public.user_org_id());

DROP POLICY IF EXISTS "upgrade_requests_delete" ON public.upgrade_requests;
CREATE POLICY "upgrade_requests_delete" ON public.upgrade_requests
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() = 'admin');

-- ── call_consent_log ──────────────────────────────────────────────────────────
-- Has user_id, no direct org_id column. Org scope is derived via profiles.
-- Two SELECT policies: one user-scoped, one org-scoped for managers.

ALTER TABLE public.call_consent_log ENABLE ROW LEVEL SECURITY;

-- User-scoped: reps read their own consent entries.
DROP POLICY IF EXISTS "consent_log_select_own" ON public.call_consent_log;
CREATE POLICY "consent_log_select_own" ON public.call_consent_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org-scoped: team_lead/admin read all consent entries for users in their org.
DROP POLICY IF EXISTS "consent_log_select_org" ON public.call_consent_log;
CREATE POLICY "consent_log_select_org" ON public.call_consent_log
  FOR SELECT TO authenticated
  USING (
    auth.user_role() IN ('team_lead', 'admin')
    AND user_id IN (
      SELECT id FROM public.profiles WHERE org_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "consent_log_insert" ON public.call_consent_log;
CREATE POLICY "consent_log_insert" ON public.call_consent_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
