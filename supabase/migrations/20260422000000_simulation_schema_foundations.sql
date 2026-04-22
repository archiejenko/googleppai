-- Sprint 1: Schema foundations for company-specific simulations
-- Tables: industry_profiles, simulated_companies, simulated_personas,
--         account_states, call_summaries, customer_playbooks

-- ============================================================
-- 1. industry_profiles (shared, NOT org-scoped)
-- ============================================================
CREATE TABLE public.industry_profiles (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                        text          UNIQUE NOT NULL,
  display_name                text          NOT NULL,
  buyer_personas              jsonb         NOT NULL,
  vocabulary                  jsonb         NOT NULL,
  objection_patterns          jsonb         NOT NULL,
  discovery_frameworks        jsonb         NOT NULL,
  compliance_flags            jsonb         NOT NULL,
  call_stage_behaviours       jsonb         NOT NULL,
  pricing_sensitivity_profile jsonb         NOT NULL,
  buying_committee_structure  jsonb         NOT NULL,
  created_at                  timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "industry_profiles_select" ON public.industry_profiles;
CREATE POLICY "industry_profiles_select" ON public.industry_profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "industry_profiles_insert" ON public.industry_profiles;
CREATE POLICY "industry_profiles_insert" ON public.industry_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "industry_profiles_update" ON public.industry_profiles;
CREATE POLICY "industry_profiles_update" ON public.industry_profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "industry_profiles_delete" ON public.industry_profiles;
CREATE POLICY "industry_profiles_delete" ON public.industry_profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 2. simulated_companies (org-scoped)
-- ============================================================
CREATE TABLE public.simulated_companies (
  id                           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                       uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  industry_slug                text          NOT NULL REFERENCES public.industry_profiles(slug),
  name                         text          NOT NULL,
  size                         text          NOT NULL,
  stage                        text          NOT NULL,
  tech_stack                   jsonb         DEFAULT '[]'::jsonb,
  strategic_priorities         jsonb         DEFAULT '[]'::jsonb,
  recent_events                jsonb         DEFAULT '[]'::jsonb,
  pain_points                  jsonb         DEFAULT '[]'::jsonb,
  competitive_landscape        jsonb         DEFAULT '{}'::jsonb,
  override_vocabulary          jsonb         DEFAULT null,
  override_objection_patterns  jsonb         DEFAULT null,
  override_compliance_flags    jsonb         DEFAULT null,
  override_buying_committee    jsonb         DEFAULT null,
  difficulty_tier              text          DEFAULT 'medium' CHECK (difficulty_tier IN ('easy', 'medium', 'hard', 'nightmare')),
  source                       text          DEFAULT 'manual' CHECK (source IN ('manual', 'crm_sync', 'uploaded')),
  created_at                   timestamptz   NOT NULL DEFAULT now(),
  created_by                   uuid          REFERENCES auth.users(id)
);

ALTER TABLE public.simulated_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "simulated_companies_select" ON public.simulated_companies;
CREATE POLICY "simulated_companies_select" ON public.simulated_companies
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_companies_insert" ON public.simulated_companies;
CREATE POLICY "simulated_companies_insert" ON public.simulated_companies
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_companies_update" ON public.simulated_companies;
CREATE POLICY "simulated_companies_update" ON public.simulated_companies
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_companies_delete" ON public.simulated_companies;
CREATE POLICY "simulated_companies_delete" ON public.simulated_companies
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

CREATE INDEX IF NOT EXISTS idx_simulated_companies_org_id
  ON public.simulated_companies (org_id);
CREATE INDEX IF NOT EXISTS idx_simulated_companies_org_industry
  ON public.simulated_companies (org_id, industry_slug);

-- ============================================================
-- 3. simulated_personas (org-scoped)
-- ============================================================
CREATE TABLE public.simulated_personas (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  company_id            uuid          NOT NULL REFERENCES public.simulated_companies(id) ON DELETE CASCADE,
  name                  text          NOT NULL,
  title                 text          NOT NULL,
  seniority             text          NOT NULL,
  personality_profile   jsonb         NOT NULL,
  priorities            jsonb         DEFAULT '[]'::jsonb,
  skepticisms           jsonb         DEFAULT '[]'::jsonb,
  triggers              jsonb         DEFAULT '[]'::jsonb,
  reports_to            text,
  direct_reports_count  int           DEFAULT 0,
  tenure_at_company     text,
  background            text,
  source                text          DEFAULT 'manual' CHECK (source IN ('manual', 'crm_sync', 'uploaded')),
  created_at            timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.simulated_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "simulated_personas_select" ON public.simulated_personas;
CREATE POLICY "simulated_personas_select" ON public.simulated_personas
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_personas_insert" ON public.simulated_personas;
CREATE POLICY "simulated_personas_insert" ON public.simulated_personas
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_personas_update" ON public.simulated_personas;
CREATE POLICY "simulated_personas_update" ON public.simulated_personas
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "simulated_personas_delete" ON public.simulated_personas;
CREATE POLICY "simulated_personas_delete" ON public.simulated_personas
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

CREATE INDEX IF NOT EXISTS idx_simulated_personas_org_id
  ON public.simulated_personas (org_id);
CREATE INDEX IF NOT EXISTS idx_simulated_personas_org_company
  ON public.simulated_personas (org_id, company_id);

-- ============================================================
-- 4. account_states (org-scoped)
-- ============================================================
CREATE TABLE public.account_states (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id                   uuid          NOT NULL REFERENCES auth.users(id),
  company_id                uuid          NOT NULL REFERENCES public.simulated_companies(id) ON DELETE CASCADE,
  persona_id                uuid          NOT NULL REFERENCES public.simulated_personas(id) ON DELETE CASCADE,
  current_stage             text          DEFAULT 'cold' CHECK (current_stage IN ('cold', 'discovery', 'evaluation', 'negotiation', 'closed_won', 'closed_lost', 'ghosted')),
  sentiment_score           numeric       DEFAULT 50 CHECK (sentiment_score BETWEEN 0 AND 100),
  relationship_notes        jsonb         DEFAULT '{}'::jsonb,
  call_count                int           DEFAULT 0,
  last_interaction_at       timestamptz,
  next_scheduled_touchpoint timestamptz,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, company_id, persona_id)
);

ALTER TABLE public.account_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_states_select" ON public.account_states;
CREATE POLICY "account_states_select" ON public.account_states
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "account_states_insert" ON public.account_states;
CREATE POLICY "account_states_insert" ON public.account_states
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "account_states_update" ON public.account_states;
CREATE POLICY "account_states_update" ON public.account_states
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "account_states_delete" ON public.account_states;
CREATE POLICY "account_states_delete" ON public.account_states
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

CREATE INDEX IF NOT EXISTS idx_account_states_org_user
  ON public.account_states (org_id, user_id);

-- ============================================================
-- 5. call_summaries (org-scoped)
-- ============================================================
CREATE TABLE public.call_summaries (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  account_state_id      uuid          NOT NULL REFERENCES public.account_states(id) ON DELETE CASCADE,
  call_number           int           NOT NULL,
  call_type             text          DEFAULT 'simulated' CHECK (call_type IN ('simulated', 'real')),
  transcript_ref        text,
  duration_seconds      int,
  commitments_made      jsonb         DEFAULT '[]'::jsonb,
  objections_raised     jsonb         DEFAULT '[]'::jsonb,
  sentiment_delta       numeric       DEFAULT 0,
  stage_transition      text          DEFAULT null,
  credibility_events    jsonb         DEFAULT '[]'::jsonb,
  key_takeaways         text[],
  call_quality_signals  jsonb         DEFAULT '{}'::jsonb,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.call_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_summaries_select" ON public.call_summaries;
CREATE POLICY "call_summaries_select" ON public.call_summaries
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "call_summaries_insert" ON public.call_summaries;
CREATE POLICY "call_summaries_insert" ON public.call_summaries
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "call_summaries_update" ON public.call_summaries;
CREATE POLICY "call_summaries_update" ON public.call_summaries
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "call_summaries_delete" ON public.call_summaries;
CREATE POLICY "call_summaries_delete" ON public.call_summaries
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

CREATE INDEX IF NOT EXISTS idx_call_summaries_org_account
  ON public.call_summaries (org_id, account_state_id);
CREATE INDEX IF NOT EXISTS idx_call_summaries_org_account_num
  ON public.call_summaries (org_id, account_state_id, call_number);

-- ============================================================
-- 6. customer_playbooks (org-scoped)
-- ============================================================
CREATE TABLE public.customer_playbooks (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name                  text          NOT NULL,
  icp_definition        jsonb         DEFAULT '{}'::jsonb,
  messaging_framework   jsonb         DEFAULT '{}'::jsonb,
  objection_responses   jsonb         DEFAULT '[]'::jsonb,
  discovery_questions   jsonb         DEFAULT '[]'::jsonb,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_playbooks_select" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_select" ON public.customer_playbooks
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "customer_playbooks_insert" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_insert" ON public.customer_playbooks
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "customer_playbooks_update" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_update" ON public.customer_playbooks
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

DROP POLICY IF EXISTS "customer_playbooks_delete" ON public.customer_playbooks;
CREATE POLICY "customer_playbooks_delete" ON public.customer_playbooks
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

CREATE INDEX IF NOT EXISTS idx_customer_playbooks_org_id
  ON public.customer_playbooks (org_id);
