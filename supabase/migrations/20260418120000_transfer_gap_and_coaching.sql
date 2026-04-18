-- Transfer Gap Analysis and AI Revenue Coaching tables
-- Adds transfer_gap_scores, rep_coaching_profiles, and deal_outcomes.live_score_session_id

CREATE TABLE IF NOT EXISTS transfer_gap_scores (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid        REFERENCES organisations(id),
  user_id               uuid        REFERENCES auth.users(id),
  period_start          timestamptz,
  period_end            timestamptz,
  delivery_gap_score    numeric,
  readiness_gap_score   numeric,
  talk_ratio_training   numeric,
  talk_ratio_live       numeric,
  discovery_training    numeric,
  discovery_live        numeric,
  meddic_avg            numeric,
  deal_win_rate         numeric,
  sample_size_live      integer,
  sample_size_training  integer,
  sample_size_deals     integer,
  insufficient_deal_data boolean    DEFAULT false,
  proxy_only            boolean     DEFAULT false,
  computed_at           timestamptz DEFAULT now(),
  UNIQUE (user_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS rep_coaching_profiles (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid        REFERENCES organisations(id),
  user_id                 uuid        REFERENCES auth.users(id),
  generated_at            timestamptz DEFAULT now(),
  delivery_gap_score      numeric,
  readiness_gap_score     numeric,
  primary_gap             text        CHECK (primary_gap IN ('delivery', 'readiness', 'both', 'none')),
  top_recommendation      text,
  recommendations         jsonb,
  based_on_period_start   timestamptz,
  based_on_period_end     timestamptz,
  UNIQUE (user_id, based_on_period_start, based_on_period_end)
);

ALTER TABLE deal_outcomes
  ADD COLUMN IF NOT EXISTS live_score_session_id uuid REFERENCES live_scores(id);

-- RLS: transfer_gap_scores
ALTER TABLE transfer_gap_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transfer gap scores"
  ON transfer_gap_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can read all transfer gap scores in their org"
  ON transfer_gap_scores FOR SELECT
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert transfer gap scores"
  ON transfer_gap_scores FOR INSERT
  WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Service role can update transfer gap scores"
  ON transfer_gap_scores FOR UPDATE
  USING (current_setting('role') = 'service_role');

-- RLS: rep_coaching_profiles
ALTER TABLE rep_coaching_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own coaching profiles"
  ON rep_coaching_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can read all coaching profiles in their org"
  ON rep_coaching_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert coaching profiles"
  ON rep_coaching_profiles FOR INSERT
  WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Service role can update coaching profiles"
  ON rep_coaching_profiles FOR UPDATE
  USING (current_setting('role') = 'service_role');
