-- Migration: RLS policies
-- Enables Row Level Security on all public tables and creates comprehensive
-- access policies. Before applying to production, verify current RLS state with:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--   SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- This migration is authoritative — it replaces any dashboard-only policies.

-- ── Helper functions ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Enable RLS on every table ─────────────────────────────────────────────────

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitches               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_outcomes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatched_drills     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_scores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_correlation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_consent_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_requests   ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Users see their own row; team_lead/admin see all rows in their org.
-- Inserts are handled by the on_auth_user_created trigger (SECURITY DEFINER).
-- Updates are own-row only.

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin')
  );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── organisations ─────────────────────────────────────────────────────────────
-- All org members can read their org row.
-- Only admins can update it.

DROP POLICY IF EXISTS "organisations_select" ON public.organisations;
CREATE POLICY "organisations_select" ON public.organisations
  FOR SELECT TO authenticated
  USING (id = public.user_org_id());

DROP POLICY IF EXISTS "organisations_update" ON public.organisations;
CREATE POLICY "organisations_update" ON public.organisations
  FOR UPDATE TO authenticated
  USING (id = public.user_org_id() AND auth.user_role() = 'admin')
  WITH CHECK (id = public.user_org_id() AND auth.user_role() = 'admin');

-- ── pitches ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "pitches_select" ON public.pitches;
CREATE POLICY "pitches_select" ON public.pitches
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

DROP POLICY IF EXISTS "pitches_insert" ON public.pitches;
CREATE POLICY "pitches_insert" ON public.pitches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pitches_update" ON public.pitches;
CREATE POLICY "pitches_update" ON public.pitches
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pitches_delete" ON public.pitches;
CREATE POLICY "pitches_delete" ON public.pitches
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── training_sessions ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "training_sessions_select" ON public.training_sessions;
CREATE POLICY "training_sessions_select" ON public.training_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

DROP POLICY IF EXISTS "training_sessions_insert" ON public.training_sessions;
CREATE POLICY "training_sessions_insert" ON public.training_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "training_sessions_update" ON public.training_sessions;
CREATE POLICY "training_sessions_update" ON public.training_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "training_sessions_delete" ON public.training_sessions;
CREATE POLICY "training_sessions_delete" ON public.training_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── deal_outcomes ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "deal_outcomes_select" ON public.deal_outcomes;
CREATE POLICY "deal_outcomes_select" ON public.deal_outcomes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

DROP POLICY IF EXISTS "deal_outcomes_insert" ON public.deal_outcomes;
CREATE POLICY "deal_outcomes_insert" ON public.deal_outcomes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND org_id = public.user_org_id());

DROP POLICY IF EXISTS "deal_outcomes_update" ON public.deal_outcomes;
CREATE POLICY "deal_outcomes_update" ON public.deal_outcomes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "deal_outcomes_delete" ON public.deal_outcomes;
CREATE POLICY "deal_outcomes_delete" ON public.deal_outcomes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── dispatched_drills ─────────────────────────────────────────────────────────

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

-- ── live_scores ───────────────────────────────────────────────────────────────
-- Written exclusively via service-role Edge Functions (correlation-engine).
-- Users read own rows; managers read org rows.

DROP POLICY IF EXISTS "live_scores_select" ON public.live_scores;
CREATE POLICY "live_scores_select" ON public.live_scores
  FOR SELECT TO authenticated
  USING (
    rep_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

-- INSERT/UPDATE/DELETE: service role only (no client-facing policy needed;
-- service-role key bypasses RLS)

-- ── leaderboard_snapshots ─────────────────────────────────────────────────────
-- Written by service-role. All org members can read.

DROP POLICY IF EXISTS "leaderboard_snapshots_select" ON public.leaderboard_snapshots;
CREATE POLICY "leaderboard_snapshots_select" ON public.leaderboard_snapshots
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

-- ── rep_correlation_snapshots ─────────────────────────────────────────────────
-- Written by service-role correlation-engine. Reps read own; managers read org.

DROP POLICY IF EXISTS "rep_corr_snapshots_select" ON public.rep_correlation_snapshots;
CREATE POLICY "rep_corr_snapshots_select" ON public.rep_correlation_snapshots
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

-- ── prospect_profiles ─────────────────────────────────────────────────────────

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

-- ── upgrade_requests ─────────────────────────────────────────────────────────

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

DROP POLICY IF EXISTS "consent_log_select" ON public.call_consent_log;
CREATE POLICY "consent_log_select" ON public.call_consent_log
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.user_role() IN ('team_lead', 'admin')
        AND user_id IN (
          SELECT id FROM public.profiles WHERE org_id = public.user_org_id()
        ))
  );

DROP POLICY IF EXISTS "consent_log_insert" ON public.call_consent_log;
CREATE POLICY "consent_log_insert" ON public.call_consent_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── deployment_requests ───────────────────────────────────────────────────────
-- Public-facing demo request form — written via service-role only.
-- No authenticated user should be able to read or write this table directly.
-- (Service role bypasses RLS; no client policies needed.)
