-- RI benchmarks, win/loss analysis, org columns, and crm_deal_id

-- 1. transfer_gap_benchmarks
CREATE TABLE IF NOT EXISTS transfer_gap_benchmarks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start  timestamptz,
  period_end    timestamptz,
  metric        text        CHECK (metric IN ('delivery_gap', 'readiness_gap', 'talk_ratio_gap', 'discovery_gap', 'meddic_avg', 'win_rate')),
  industry      text,
  company_size  text        CHECK (company_size IN ('smb', 'midmarket', 'enterprise') OR company_size IS NULL),
  p25           numeric,
  p50           numeric,
  p75           numeric,
  p90           numeric,
  sample_size   integer,
  computed_at   timestamptz DEFAULT now(),
  UNIQUE (period_start, period_end, metric, industry, company_size)
);

-- 2. win_loss_analysis
CREATE TABLE IF NOT EXISTS win_loss_analysis (
  id                            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                        uuid        REFERENCES organisations(id),
  user_id                       uuid        REFERENCES auth.users(id),
  period_start                  timestamptz,
  period_end                    timestamptz,
  scope                         text        CHECK (scope IN ('rep', 'team')),
  won_avg_discovery             numeric,
  lost_avg_discovery            numeric,
  won_avg_objection_handling    numeric,
  lost_avg_objection_handling   numeric,
  won_avg_engagement            numeric,
  lost_avg_engagement           numeric,
  won_avg_talk_ratio            numeric,
  lost_avg_talk_ratio           numeric,
  won_avg_meddic                numeric,
  lost_avg_meddic               numeric,
  sample_size_won               integer,
  sample_size_lost              integer,
  computed_at                   timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id, period_start, period_end, scope)
);

-- 3. organisations columns
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS industry text;

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS company_size text
  CHECK (company_size IN ('smb', 'midmarket', 'enterprise') OR company_size IS NULL);

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS meddic_weightings jsonb
  DEFAULT '{"metrics": 1, "economicBuyer": 1, "decisionCriteria": 1, "decisionProcess": 1, "identifyPain": 1, "champion": 1}'::jsonb;

-- 4. deal_outcomes crm_deal_id
ALTER TABLE deal_outcomes
  ADD COLUMN IF NOT EXISTS crm_deal_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_outcomes_crm_unique
  ON deal_outcomes(user_id, crm_deal_id) WHERE crm_deal_id IS NOT NULL;

-- RLS: transfer_gap_benchmarks
ALTER TABLE transfer_gap_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read benchmarks"
  ON transfer_gap_benchmarks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert benchmarks"
  ON transfer_gap_benchmarks FOR INSERT
  WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Service role can update benchmarks"
  ON transfer_gap_benchmarks FOR UPDATE
  USING (current_setting('role') = 'service_role');

-- RLS: win_loss_analysis
ALTER TABLE win_loss_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own win/loss analysis"
  ON win_loss_analysis FOR SELECT
  USING (
    auth.uid() = user_id
    OR org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert win/loss analysis"
  ON win_loss_analysis FOR INSERT
  WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Service role can update win/loss analysis"
  ON win_loss_analysis FOR UPDATE
  USING (current_setting('role') = 'service_role');
