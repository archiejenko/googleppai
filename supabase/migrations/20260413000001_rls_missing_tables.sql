-- Migration: RLS for previously unprotected tables
-- Creates the six tables that existed only in dashboard or were referenced without
-- a migration, enables RLS on each, and applies org-scoped policies matching the
-- standard OAST pattern established in 20260412000002_rls_policies.sql.
--
-- All CREATE TABLE statements use IF NOT EXISTS so this migration is idempotent
-- whether or not the tables were created manually.

-- ── coaching_triggers ─────────────────────────────────────────────────────────
-- Written by service-role functions (correlation-engine, future webhooks).
-- Reps read own triggers; team_lead/admin read and manage their org's queue.

CREATE TABLE IF NOT EXISTS public.coaching_triggers (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  rep_id                uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id            uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  trigger_type          text        NOT NULL,
  skill_name            text,
  severity              text        NOT NULL DEFAULT 'warning',
  trigger_data          jsonb       NOT NULL DEFAULT '{}',
  recommended_module_id uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz,
  snoozed_until         timestamptz
);

ALTER TABLE public.coaching_triggers ENABLE ROW LEVEL SECURITY;

-- SELECT: rep sees own triggers; managers see their whole org
DROP POLICY IF EXISTS "coaching_triggers_select" ON public.coaching_triggers;
CREATE POLICY "coaching_triggers_select" ON public.coaching_triggers
  FOR SELECT TO authenticated
  USING (
    rep_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

-- INSERT: service-role only — no authenticated INSERT policy
-- (service-role key bypasses RLS; correlation-engine writes triggers)

-- UPDATE: rep can snooze/resolve own trigger; managers can manage their org's triggers
DROP POLICY IF EXISTS "coaching_triggers_update" ON public.coaching_triggers;
CREATE POLICY "coaching_triggers_update" ON public.coaching_triggers
  FOR UPDATE TO authenticated
  USING (
    rep_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  )
  WITH CHECK (
    rep_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

-- DELETE: admin only
DROP POLICY IF EXISTS "coaching_triggers_delete" ON public.coaching_triggers;
CREATE POLICY "coaching_triggers_delete" ON public.coaching_triggers
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() = 'admin');

-- ── training_attempts ─────────────────────────────────────────────────────────
-- No direct org_id column — org is derived via rep_id → profiles.org_id.
-- Reps read own attempts; team_lead/admin read all attempts in their org
-- (needed for scenario difficulty analytics in useScenarioDifficulty).
-- Writes are via service-role (training-api, drill-analysis); no INSERT policy needed.

CREATE TABLE IF NOT EXISTS public.training_attempts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id    uuid        NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  rep_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number integer     NOT NULL DEFAULT 1,
  score          numeric,
  fail_point     text,
  passed         boolean     NOT NULL DEFAULT false,
  attempted_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_attempts ENABLE ROW LEVEL SECURITY;

-- SELECT: own attempts, OR manager/admin sees all reps in their org
DROP POLICY IF EXISTS "training_attempts_select" ON public.training_attempts;
CREATE POLICY "training_attempts_select" ON public.training_attempts
  FOR SELECT TO authenticated
  USING (
    rep_id = auth.uid()
    OR (
      auth.user_role() IN ('team_lead', 'admin')
      AND rep_id IN (
        SELECT id FROM public.profiles WHERE org_id = public.user_org_id()
      )
    )
  );

-- INSERT/UPDATE/DELETE: service-role only (no authenticated policies)

-- ── objection_entries ─────────────────────────────────────────────────────────
-- User-created objection library entries; semantic search is a planned feature.
-- Reps manage their own entries; managers see the full org library.

CREATE TABLE IF NOT EXISTS public.objection_entries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.objection_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "objection_entries_select" ON public.objection_entries;
CREATE POLICY "objection_entries_select" ON public.objection_entries
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  );

DROP POLICY IF EXISTS "objection_entries_insert" ON public.objection_entries;
CREATE POLICY "objection_entries_insert" ON public.objection_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND org_id = public.user_org_id());

DROP POLICY IF EXISTS "objection_entries_update" ON public.objection_entries;
CREATE POLICY "objection_entries_update" ON public.objection_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "objection_entries_delete" ON public.objection_entries;
CREATE POLICY "objection_entries_delete" ON public.objection_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── missed_opportunities ──────────────────────────────────────────────────────
-- Written by service-role (revenue-intelligence pipeline).
-- All org members can read; managers can update; only admin can delete.

CREATE TABLE IF NOT EXISTS public.missed_opportunities (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  company_name         text        NOT NULL,
  deal_value_gbp       numeric,
  recovery_score       numeric,
  lost_reason_category text,
  contact_name         text,
  last_signal_date     timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.missed_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missed_opportunities_select" ON public.missed_opportunities;
CREATE POLICY "missed_opportunities_select" ON public.missed_opportunities
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "missed_opportunities_update" ON public.missed_opportunities;
CREATE POLICY "missed_opportunities_update" ON public.missed_opportunities
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  WITH CHECK (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'));

DROP POLICY IF EXISTS "missed_opportunities_delete" ON public.missed_opportunities;
CREATE POLICY "missed_opportunities_delete" ON public.missed_opportunities
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() = 'admin');

-- ── competitor_profiles ───────────────────────────────────────────────────────
-- Written by service-role. All org members read; managers update; admin deletes.

CREATE TABLE IF NOT EXISTS public.competitor_profiles (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  competitor_name    text        NOT NULL,
  mention_count      integer     NOT NULL DEFAULT 0,
  win_rate           numeric,
  loss_rate          numeric,
  common_objections  text[],
  battlecard_notes   text,
  last_mentioned_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitor_profiles_select" ON public.competitor_profiles;
CREATE POLICY "competitor_profiles_select" ON public.competitor_profiles
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "competitor_profiles_update" ON public.competitor_profiles;
CREATE POLICY "competitor_profiles_update" ON public.competitor_profiles
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  WITH CHECK (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'));

DROP POLICY IF EXISTS "competitor_profiles_delete" ON public.competitor_profiles;
CREATE POLICY "competitor_profiles_delete" ON public.competitor_profiles
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() = 'admin');

-- ── business_synergies ────────────────────────────────────────────────────────
-- Written by service-role. All org members read; managers update; admin deletes.

CREATE TABLE IF NOT EXISTS public.business_synergies (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid        NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  account_a          text        NOT NULL,
  account_b          text        NOT NULL,
  opportunity_type   text,
  confidence_score   numeric,
  recommended_action text,
  detected_at        timestamptz NOT NULL DEFAULT now(),
  status             text        NOT NULL DEFAULT 'active'
);

ALTER TABLE public.business_synergies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_synergies_select" ON public.business_synergies;
CREATE POLICY "business_synergies_select" ON public.business_synergies
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "business_synergies_update" ON public.business_synergies;
CREATE POLICY "business_synergies_update" ON public.business_synergies
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'))
  WITH CHECK (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'));

DROP POLICY IF EXISTS "business_synergies_delete" ON public.business_synergies;
CREATE POLICY "business_synergies_delete" ON public.business_synergies
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() = 'admin');
