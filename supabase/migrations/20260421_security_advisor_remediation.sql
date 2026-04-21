-- ============================================================
-- SECTION 1: Harden SECURITY DEFINER views
-- These views are intentionally SECURITY DEFINER to prevent
-- RLS infinite recursion. We restrict access to authenticated only.
-- ============================================================

REVOKE ALL ON public.stage_conversion_rates FROM anon, public;
GRANT SELECT ON public.stage_conversion_rates TO authenticated;

REVOKE ALL ON public.training_correlation FROM anon, public;
GRANT SELECT ON public.training_correlation TO authenticated;

-- ============================================================
-- SECTION 2: Enable RLS and add policies on 5 public tables
-- ============================================================

-- 2a. leaderboard_snapshots
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read leaderboard_snapshots"
  ON public.leaderboard_snapshots FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "team_lead/admin can insert leaderboard_snapshots"
  ON public.leaderboard_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('team_lead'::public."Role", 'admin'::public."Role"))
  );

CREATE POLICY "team_lead/admin can update leaderboard_snapshots"
  ON public.leaderboard_snapshots FOR UPDATE TO authenticated
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('team_lead'::public."Role", 'admin'::public."Role"))
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('team_lead'::public."Role", 'admin'::public."Role"))
  );

CREATE POLICY "team_lead/admin can delete leaderboard_snapshots"
  ON public.leaderboard_snapshots FOR DELETE TO authenticated
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('team_lead'::public."Role", 'admin'::public."Role"))
  );

-- 2b. dispatched_drills
ALTER TABLE public.dispatched_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own drills, leads/admins see org drills"
  ON public.dispatched_drills FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles drill_owner
        WHERE drill_owner.id = dispatched_drills.user_id
          AND drill_owner.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid()
          AND role IN ('team_lead'::public."Role", 'admin'::public."Role")
      )
    )
  );

-- 2c. deployment_requests
ALTER TABLE public.deployment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read deployment_requests"
  ON public.deployment_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::public."Role"));

-- 2d. prospect_profiles
ALTER TABLE public.prospect_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read prospect_profiles"
  ON public.prospect_profiles FOR SELECT TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org members can insert prospect_profiles"
  ON public.prospect_profiles FOR INSERT TO authenticated
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org members can update prospect_profiles"
  ON public.prospect_profiles FOR UPDATE TO authenticated
  USING (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "team_lead/admin can delete prospect_profiles"
  ON public.prospect_profiles FOR DELETE TO authenticated
  USING (
    org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('team_lead'::public."Role", 'admin'::public."Role"))
  );

-- 2e. upgrade_requests
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read upgrade_requests"
  ON public.upgrade_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'::public."Role"));

-- ============================================================
-- SECTION 3: Fix always-true WITH CHECK on coaching_triggers
-- ============================================================

DROP POLICY IF EXISTS "team_lead can resolve and snooze" ON public.coaching_triggers;

CREATE POLICY "team_lead can resolve and snooze" ON public.coaching_triggers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.team_id = coaching_triggers.org_id
        AND p.role IN ('team_lead'::public."Role", 'admin'::public."Role")
    )
  )
  WITH CHECK (org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================
-- SECTION 4: Set search_path on 14 functions
-- ============================================================

ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.calculate_user_skill_metrics(u_id uuid, s_id text) SET search_path = '';
ALTER FUNCTION public.admin_set_user_role(target_user_id uuid, new_role text) SET search_path = '';
ALTER FUNCTION public.notify_goal_achieved() SET search_path = '';
ALTER FUNCTION public.auto_update_goals_on_pitch() SET search_path = '';
ALTER FUNCTION public.update_pip_updated_at() SET search_path = '';
ALTER FUNCTION public.update_ci_updated_at() SET search_path = '';
ALTER FUNCTION public.update_organisations_updated_at() SET search_path = '';
ALTER FUNCTION public.match_documents(query_embedding extensions.vector, match_threshold double precision, match_count integer) SET search_path = '';
ALTER FUNCTION public.match_similar_deals(p_deal_id uuid, match_limit integer) SET search_path = '';
ALTER FUNCTION public.update_deals_updated_at() SET search_path = '';
ALTER FUNCTION public.record_deal_stage_change() SET search_path = '';
ALTER FUNCTION public.get_user_org_tier(p_user_id uuid) SET search_path = '';
ALTER FUNCTION public.update_bs_updated_at() SET search_path = '';
