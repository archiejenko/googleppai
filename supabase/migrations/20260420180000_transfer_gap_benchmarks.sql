CREATE TABLE IF NOT EXISTS transfer_gap_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start timestamptz,
  period_end timestamptz,
  metric text CHECK (metric IN ('delivery_gap', 'readiness_gap', 'talk_ratio_gap', 'discovery_gap', 'meddic_avg', 'win_rate')),
  industry text,
  company_size text CHECK (company_size IN ('smb', 'midmarket', 'enterprise') OR company_size IS NULL),
  p25 numeric,
  p50 numeric,
  p75 numeric,
  p90 numeric,
  sample_size integer,
  computed_at timestamptz DEFAULT now(),
  UNIQUE (period_start, period_end, metric, industry, company_size)
);

ALTER TABLE transfer_gap_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfer_gap_benchmarks_select_authenticated"
  ON transfer_gap_benchmarks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS win_loss_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organisations(id),
  user_id uuid REFERENCES auth.users(id),
  period_start timestamptz,
  period_end timestamptz,
  scope text CHECK (scope IN ('rep', 'team')),
  won_avg_discovery numeric,
  lost_avg_discovery numeric,
  won_avg_objection_handling numeric,
  lost_avg_objection_handling numeric,
  won_avg_engagement numeric,
  lost_avg_engagement numeric,
  won_avg_talk_ratio numeric,
  lost_avg_talk_ratio numeric,
  won_avg_meddic numeric,
  lost_avg_meddic numeric,
  sample_size_won integer,
  sample_size_lost integer,
  computed_at timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id, period_start, period_end, scope)
);

ALTER TABLE win_loss_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "win_loss_analysis_select_own_or_admin"
  ON win_loss_analysis FOR SELECT
  USING (
    auth.uid() = user_id
    OR (org_id = public.user_org_id() AND public.get_my_role() IN ('admin', 'team_lead'))
  );

-- pg_cron job for benchmark-aggregator at 03:30 UTC daily (03:00 is deal-risk-engine)
SELECT cron.schedule(
  'benchmark-aggregator-daily',
  '30 3 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/benchmark-aggregator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )$$
);
