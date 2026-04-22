-- Sprint 4.5 — Pillar 2: Data Sensitivity Classification
--
-- System-level registry classifying every table and sensitive column.
-- Used by export-guard.ts and data-retention edge function.
-- Not org-scoped — this is platform-level metadata.

-- ============================================================
-- 1. data_classification_registry
-- ============================================================
CREATE TABLE public.data_classification_registry (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      text        NOT NULL,
  column_name     text,                       -- NULL = entire table classification
  classification  text        NOT NULL CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
  retention_days  int,                        -- NULL = indefinite retention
  exportable      boolean     NOT NULL DEFAULT true,
  pii             boolean     NOT NULL DEFAULT false,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, column_name)
);

ALTER TABLE public.data_classification_registry ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (needed by export-guard at query time)
CREATE POLICY "dcr_select" ON public.data_classification_registry
  FOR SELECT TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated role.
-- Only service role can write. This is a system-administered table.

-- ============================================================
-- 2. Seed classifications
-- ============================================================

-- ── PUBLIC ────────────────────────────────────────────────────
INSERT INTO public.data_classification_registry (table_name, column_name, classification, description) VALUES
  ('industry_profiles', NULL, 'public', 'Shared industry reference data, no org-specific content');

-- ── INTERNAL ─────────────────────────────────────────────────
INSERT INTO public.data_classification_registry (table_name, column_name, classification, description) VALUES
  ('simulated_companies', 'name',            'internal', 'Company display name'),
  ('simulated_companies', 'size',            'internal', 'Company size category'),
  ('simulated_companies', 'stage',           'internal', 'Company growth stage'),
  ('simulated_companies', 'industry_slug',   'internal', 'Industry reference key'),
  ('simulated_companies', 'difficulty_tier', 'internal', 'Simulation difficulty setting'),
  ('simulated_personas',  'name',            'internal', 'Persona display name'),
  ('simulated_personas',  'title',           'internal', 'Persona job title'),
  ('simulated_personas',  'seniority',       'internal', 'Persona seniority level'),
  ('customer_playbooks',  'name',            'internal', 'Playbook display name');

-- ── CONFIDENTIAL ─────────────────────────────────────────────
-- Simulated company sensitive fields (may contain real business intelligence if sourced from CRM)
INSERT INTO public.data_classification_registry (table_name, column_name, classification, description) VALUES
  ('simulated_companies', 'tech_stack',              'confidential', 'Technology stack — may reflect real company data via CRM sync'),
  ('simulated_companies', 'strategic_priorities',    'confidential', 'Strategic priorities — may reflect real company data'),
  ('simulated_companies', 'pain_points',             'confidential', 'Pain points — may reflect real company data'),
  ('simulated_companies', 'competitive_landscape',   'confidential', 'Competitive landscape — may reflect real company data'),
  ('simulated_companies', 'recent_events',           'confidential', 'Recent events — may reflect real company data');

-- Simulated persona sensitive fields
INSERT INTO public.data_classification_registry (table_name, column_name, classification, description) VALUES
  ('simulated_personas', 'personality_profile', 'confidential', 'Detailed personality model'),
  ('simulated_personas', 'priorities',          'confidential', 'Persona buying priorities'),
  ('simulated_personas', 'skepticisms',         'confidential', 'Persona skepticisms and blockers'),
  ('simulated_personas', 'triggers',            'confidential', 'Persona emotional/topic triggers'),
  ('simulated_personas', 'background',          'confidential', 'Persona background narrative');

-- Entire tables classified as confidential
INSERT INTO public.data_classification_registry (table_name, column_name, classification, retention_days, description) VALUES
  ('account_states',              NULL, 'confidential', NULL, 'Reveals rep performance per simulated account'),
  ('call_summaries',              NULL, 'confidential', 365, 'Contains call analysis and extracted insights'),
  ('rep_performance_snapshots',   NULL, 'confidential', NULL, 'Aggregated rep performance metrics'),
  ('org_teams',                   NULL, 'confidential', NULL, 'Org team structure'),
  ('org_team_members',            NULL, 'confidential', NULL, 'Team membership data'),
  ('audit_log',                   NULL, 'confidential', NULL, 'Immutable audit trail of all mutations'),
  ('pitches',                     NULL, 'confidential', NULL, 'Training session transcripts and analysis'),
  ('training_sessions',           NULL, 'confidential', NULL, 'Training session metadata'),
  ('win_loss_events',             NULL, 'confidential', NULL, 'Win/loss outcome tracking'),
  ('deal_outcomes',               NULL, 'confidential', NULL, 'Deal pipeline outcomes'),
  ('live_scores',                 NULL, 'confidential', NULL, 'Real-time call scoring data'),
  ('rep_correlation_snapshots',   NULL, 'confidential', NULL, 'Training-to-performance correlation data'),
  ('transfer_gap_scores',         NULL, 'confidential', NULL, 'Transfer gap analysis scores'),
  ('rep_coaching_profiles',       NULL, 'confidential', NULL, 'AI coaching profile data'),
  ('coaching_triggers',           NULL, 'confidential', NULL, 'Coaching alert triggers'),
  ('win_loss_analysis',           NULL, 'confidential', NULL, 'Win/loss analysis aggregates'),
  ('customer_playbooks',          NULL, 'confidential', NULL, 'Sales playbook content'),
  ('call_transcript_chunks',      NULL, 'confidential', NULL, 'Embedded transcript segments');

-- ── RESTRICTED ───────────────────────────────────────────────
INSERT INTO public.data_classification_registry (table_name, column_name, classification, exportable, pii, description) VALUES
  ('crm_connections', 'encrypted_access_token',  'restricted', false, false, 'Encrypted OAuth access token — never export'),
  ('crm_connections', 'encrypted_refresh_token', 'restricted', false, false, 'Encrypted OAuth refresh token — never export');

INSERT INTO public.data_classification_registry (table_name, column_name, classification, retention_days, exportable, description) VALUES
  ('real_call_recordings', 'transcript', 'restricted', 180, false, 'Real customer call transcripts — 180-day retention');

-- PII-flagged: update the earlier 'internal' row for simulated_personas.name
UPDATE public.data_classification_registry
  SET pii = true, description = 'Persona display name — PII when sourced from CRM'
  WHERE table_name = 'simulated_personas' AND column_name = 'name';

-- Additional system tables (internal, no special restrictions)
INSERT INTO public.data_classification_registry (table_name, column_name, classification, description) VALUES
  ('profiles',              NULL, 'confidential', 'User profile data including role and org membership'),
  ('organisations',         NULL, 'confidential', 'Organisation metadata and billing info'),
  ('admin_action_log',      NULL, 'confidential', 'System-level admin action audit trail'),
  ('erasure_audit_log',     NULL, 'confidential', 'GDPR erasure proof records'),
  ('org_ai_limits',         NULL, 'internal',     'Per-org AI usage limits'),
  ('org_ai_usage',          NULL, 'internal',     'Per-org AI usage tracking'),
  ('token_usage_log',       NULL, 'internal',     'Token usage tracking'),
  ('token_usage_warnings',  NULL, 'internal',     'Token usage warning records'),
  ('leaderboard_snapshots', NULL, 'internal',     'Periodic leaderboard rankings'),
  ('dispatched_drills',     NULL, 'internal',     'AI-dispatched practice drills'),
  ('prospect_profiles',     NULL, 'internal',     'Revenue intelligence prospect data'),
  ('upgrade_requests',      NULL, 'internal',     'Self-service upgrade requests'),
  ('call_consent_log',      NULL, 'internal',     'Call recording consent records'),
  ('deployment_requests',   NULL, 'internal',     'Demo/deployment request submissions'),
  ('meeting_sessions',      NULL, 'internal',     'Meeting session metadata'),
  ('transfer_gap_alerts',   NULL, 'internal',     'Transfer gap alert records'),
  ('transfer_gap_benchmarks', NULL, 'public',     'Anonymised industry benchmarks'),
  ('data_classification_registry', NULL, 'internal', 'This table — system metadata');

-- PII fields on other tables
INSERT INTO public.data_classification_registry (table_name, column_name, classification, pii, description) VALUES
  ('profiles',             'email',  'confidential', true, 'User email address'),
  ('deployment_requests',  'email',  'confidential', true, 'Requester email address'),
  ('deployment_requests',  'name',   'confidential', true, 'Requester name');

-- ============================================================
-- 3. Add deleted_at columns for soft-delete support
--    call_summaries already has archived_at — reuse that.
-- ============================================================
ALTER TABLE public.account_states
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.real_call_recordings
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.call_transcript_chunks
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Update RLS SELECT policies to exclude soft-deleted rows for non-admin users.
-- Admin users can still see deleted rows for audit/recovery purposes.

-- account_states: update the SELECT policy from the RBAC migration
-- (this migration runs after 20260422900000, so the policy exists)
DROP POLICY IF EXISTS "account_states_select" ON public.account_states;
CREATE POLICY "account_states_select" ON public.account_states
  FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    AND (deleted_at IS NULL OR public.get_my_role() = 'admin')
    AND (
      user_id = auth.uid()
      OR (public.get_my_role() = 'team_lead' AND user_id = ANY(public.get_team_member_ids(org_id)))
      OR public.get_my_role() = 'admin'
    )
  );

-- call_summaries: exclude rows whose parent account_state is soft-deleted,
-- and also handle call_summaries' own archived_at
DROP POLICY IF EXISTS "call_summaries_select" ON public.call_summaries;
CREATE POLICY "call_summaries_select" ON public.call_summaries
  FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    AND (archived_at IS NULL OR public.get_my_role() = 'admin')
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

CREATE INDEX IF NOT EXISTS idx_account_states_deleted_at
  ON public.account_states (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_summaries_archived_at
  ON public.call_summaries (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_real_call_recordings_deleted_at
  ON public.real_call_recordings (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_transcript_chunks_deleted_at
  ON public.call_transcript_chunks (deleted_at) WHERE deleted_at IS NOT NULL;
