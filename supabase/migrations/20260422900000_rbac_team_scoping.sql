-- Sprint 4.5 — Pillar 1: Role-Based Access Control with Team Scoping
--
-- Extends the existing profiles.role system ('user', 'team_lead', 'admin')
-- with org-scoped teams (many-to-many) and granular RLS on simulation tables.
--
-- Terminology mapping (for documentation, not code):
--   org_rep     = profiles.role = 'user'
--   org_manager = profiles.role = 'team_lead'
--   org_admin   = profiles.role = 'admin'

-- ============================================================
-- 1. org_teams — named groups within an organisation
-- ============================================================
CREATE TABLE public.org_teams (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES auth.users(id),
  UNIQUE (org_id, name)
);

ALTER TABLE public.org_teams ENABLE ROW LEVEL SECURITY;

-- All org members can see teams in their org
CREATE POLICY "org_teams_select" ON public.org_teams
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

-- Only admins can create teams
CREATE POLICY "org_teams_insert" ON public.org_teams
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

-- Only admins can update teams
CREATE POLICY "org_teams_update" ON public.org_teams
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin')
  WITH CHECK (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

-- Only admins can delete teams
CREATE POLICY "org_teams_delete" ON public.org_teams
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

CREATE INDEX idx_org_teams_org_id ON public.org_teams (org_id);

-- ============================================================
-- 2. org_team_members — many-to-many user ↔ team
-- ============================================================
CREATE TABLE public.org_team_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  team_id     uuid        NOT NULL REFERENCES public.org_teams(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, team_id, user_id)
);

ALTER TABLE public.org_team_members ENABLE ROW LEVEL SECURITY;

-- All org members can see membership (for team visibility).
-- IMPORTANT: Do NOT call get_user_team_ids() here — it queries this table, causing recursion.
-- Instead join through org_teams.org_id → user_org_id().
CREATE POLICY "org_team_members_select" ON public.org_team_members
  FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT id FROM public.org_teams WHERE org_id = public.user_org_id())
  );

-- Only admins can add members
CREATE POLICY "org_team_members_insert" ON public.org_team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.user_org_id() AND public.get_my_role() = 'admin'
  );

-- Only admins can remove members
CREATE POLICY "org_team_members_delete" ON public.org_team_members
  FOR DELETE TO authenticated
  USING (
    org_id = public.user_org_id() AND public.get_my_role() = 'admin'
  );

CREATE INDEX idx_org_team_members_team ON public.org_team_members (team_id);
CREATE INDEX idx_org_team_members_user ON public.org_team_members (user_id);
CREATE INDEX idx_org_team_members_org  ON public.org_team_members (org_id);

-- ============================================================
-- 3. RLS helper functions for role and team checks
--    All are SECURITY DEFINER to bypass RLS on the tables they query.
--    All cache results per-transaction via set_config(..., true).
-- ============================================================

-- get_user_org_role(check_org_id): returns the user's role if they belong
-- to the given org, NULL otherwise. Maps to org_admin/org_manager/org_rep.
CREATE OR REPLACE FUNCTION public.get_user_org_role(check_org_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached text;
  v_role   text;
BEGIN
  v_cached := current_setting('app.user_org_role', true);
  IF v_cached IS NOT NULL AND v_cached <> '' THEN
    RETURN CASE WHEN v_cached = '__null__' THEN NULL ELSE v_cached END;
  END IF;

  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
    AND org_id = check_org_id;

  PERFORM set_config('app.user_org_role', COALESCE(v_role, '__null__'), true);
  RETURN v_role;
END;
$$;

-- get_user_team_ids(check_org_id): returns array of team IDs the current
-- user belongs to within the given org. Used for team-scoped visibility.
CREATE OR REPLACE FUNCTION public.get_user_team_ids(check_org_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached text;
  v_result uuid[];
BEGIN
  v_cached := current_setting('app.user_team_ids', true);
  IF v_cached IS NOT NULL AND v_cached <> '' THEN
    RETURN CASE WHEN v_cached = '__null__' THEN '{}'::uuid[] ELSE v_cached::uuid[] END;
  END IF;

  SELECT array_agg(team_id) INTO v_result
  FROM public.org_team_members
  WHERE user_id = auth.uid()
    AND org_id = check_org_id;

  v_result := COALESCE(v_result, '{}'::uuid[]);
  PERFORM set_config('app.user_team_ids',
    CASE WHEN array_length(v_result, 1) IS NULL THEN '__null__' ELSE v_result::text END,
    true);
  RETURN v_result;
END;
$$;

-- get_team_member_ids(check_org_id): returns all user IDs in the same
-- team(s) as the current user within the org. Used for manager visibility
-- of their reports' data.
CREATE OR REPLACE FUNCTION public.get_team_member_ids(check_org_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cached  text;
  v_result  uuid[];
  v_my_teams uuid[];
BEGIN
  v_cached := current_setting('app.team_member_ids', true);
  IF v_cached IS NOT NULL AND v_cached <> '' THEN
    RETURN CASE WHEN v_cached = '__null__' THEN '{}'::uuid[] ELSE v_cached::uuid[] END;
  END IF;

  v_my_teams := public.get_user_team_ids(check_org_id);

  IF array_length(v_my_teams, 1) IS NULL THEN
    v_result := '{}'::uuid[];
  ELSE
    SELECT array_agg(DISTINCT otm.user_id) INTO v_result
    FROM public.org_team_members otm
    WHERE otm.team_id = ANY(v_my_teams)
      AND otm.org_id = check_org_id;
    v_result := COALESCE(v_result, '{}'::uuid[]);
  END IF;

  PERFORM set_config('app.team_member_ids',
    CASE WHEN array_length(v_result, 1) IS NULL THEN '__null__' ELSE v_result::text END,
    true);
  RETURN v_result;
END;
$$;

-- ============================================================
-- 4. Rewrite RLS on simulation tables with role granularity
--    Drop all existing permissive policies and recreate with
--    role-differentiated access.
-- ============================================================

-- ── simulated_companies ──────────────────────────────────────
-- SELECT: all roles within org (org_rep, org_manager, org_admin)
-- INSERT/UPDATE/DELETE: org_admin only
DROP POLICY IF EXISTS "simulated_companies_select" ON public.simulated_companies;
CREATE POLICY "simulated_companies_select" ON public.simulated_companies
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_companies_insert" ON public.simulated_companies;
CREATE POLICY "simulated_companies_insert" ON public.simulated_companies
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "simulated_companies_update" ON public.simulated_companies;
CREATE POLICY "simulated_companies_update" ON public.simulated_companies
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin')
  WITH CHECK (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "simulated_companies_delete" ON public.simulated_companies;
CREATE POLICY "simulated_companies_delete" ON public.simulated_companies
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

-- ── simulated_personas ───────────────────────────────────────
-- SELECT: all roles within org
-- INSERT/UPDATE/DELETE: org_admin only
DROP POLICY IF EXISTS "simulated_personas_select" ON public.simulated_personas;
CREATE POLICY "simulated_personas_select" ON public.simulated_personas
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_personas_insert" ON public.simulated_personas;
CREATE POLICY "simulated_personas_insert" ON public.simulated_personas
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "simulated_personas_update" ON public.simulated_personas;
CREATE POLICY "simulated_personas_update" ON public.simulated_personas
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin')
  WITH CHECK (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "simulated_personas_delete" ON public.simulated_personas;
CREATE POLICY "simulated_personas_delete" ON public.simulated_personas
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

-- ── customer_playbooks ───────────────────────────────────────
-- SELECT: all roles within org
-- INSERT/UPDATE/DELETE: org_admin only
DROP POLICY IF EXISTS "customer_playbooks_select" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_select" ON public.customer_playbooks
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "customer_playbooks_insert" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_insert" ON public.customer_playbooks
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "customer_playbooks_update" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_update" ON public.customer_playbooks
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin')
  WITH CHECK (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "customer_playbooks_delete" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_delete" ON public.customer_playbooks
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND public.get_my_role() = 'admin');

-- ── account_states ───────────────────────────────────────────
-- SELECT: org_rep sees own rows only. org_manager sees own rows + rows
--         for users in their team(s). org_admin sees all within org.
-- INSERT: org_rep can create their own (user_id = auth.uid()). No one
--         creates on behalf of others.
-- UPDATE: org_rep updates own. org_admin updates any within org (for resets).
-- DELETE: org_admin only.
DROP POLICY IF EXISTS "account_states_select" ON public.account_states;
CREATE POLICY "account_states_select" ON public.account_states
  FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    AND (
      user_id = auth.uid()
      OR (public.get_my_role() = 'team_lead' AND user_id = ANY(public.get_team_member_ids(org_id)))
      OR public.get_my_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "account_states_insert" ON public.account_states;
CREATE POLICY "account_states_insert" ON public.account_states
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.user_org_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "account_states_update" ON public.account_states;
CREATE POLICY "account_states_update" ON public.account_states
  FOR UPDATE TO authenticated
  USING (
    org_id = public.user_org_id()
    AND (
      user_id = auth.uid()
      OR public.get_my_role() = 'admin'
    )
  )
  WITH CHECK (
    org_id = public.user_org_id()
    AND (
      user_id = auth.uid()
      OR public.get_my_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "account_states_delete" ON public.account_states;
CREATE POLICY "account_states_delete" ON public.account_states
  FOR DELETE TO authenticated
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

-- ── call_summaries ───────────────────────────────────────────
-- SELECT: follows account_states scoping via account_state_id join.
--         org_rep sees summaries for their own accounts. org_manager
--         sees summaries for their team's accounts. org_admin sees all.
-- INSERT: service role only (call-summariser). No authenticated INSERT policy.
-- UPDATE: service role only. No authenticated UPDATE policy.
-- DELETE: org_admin only.
DROP POLICY IF EXISTS "call_summaries_select" ON public.call_summaries;
CREATE POLICY "call_summaries_select" ON public.call_summaries
  FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    AND (
      public.get_my_role() = 'admin'
      OR account_state_id IN (
        SELECT id FROM public.account_states WHERE user_id = auth.uid()
      )
      OR (
        public.get_my_role() = 'team_lead'
        AND account_state_id IN (
          SELECT id FROM public.account_states
          WHERE user_id = ANY(public.get_team_member_ids(org_id))
        )
      )
    )
  );

DROP POLICY IF EXISTS "call_summaries_insert" ON public.call_summaries;
-- No authenticated INSERT policy. call-summariser uses service role.

DROP POLICY IF EXISTS "call_summaries_update" ON public.call_summaries;
-- No authenticated UPDATE policy. call-summariser uses service role.

DROP POLICY IF EXISTS "call_summaries_delete" ON public.call_summaries;
CREATE POLICY "call_summaries_delete" ON public.call_summaries
  FOR DELETE TO authenticated
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

-- ── rep_performance_snapshots ────────────────────────────────
-- Already has correct policies from 20260422800000. Adding comments only.
-- SELECT: org_rep sees own (user_id = auth.uid()). org_manager/org_admin
--         sees all within org. INSERT/UPDATE: service_role only (nightly job).
COMMENT ON POLICY "rep_performance_snapshots_own_select" ON public.rep_performance_snapshots
  IS 'org_rep: see only own performance snapshots';
COMMENT ON POLICY "rep_performance_snapshots_manager_select" ON public.rep_performance_snapshots
  IS 'org_manager/org_admin: see all snapshots within their org';
