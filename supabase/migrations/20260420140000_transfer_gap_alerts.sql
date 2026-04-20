CREATE TABLE IF NOT EXISTS transfer_gap_alerts (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                 uuid        REFERENCES organisations(id),
  user_id                uuid        REFERENCES auth.users(id),
  alert_type             text        CHECK (alert_type IN ('delivery_gap_widened', 'readiness_gap_widened', 'both_widened')),
  previous_delivery_gap  numeric,
  current_delivery_gap   numeric,
  previous_readiness_gap numeric,
  current_readiness_gap  numeric,
  delta_delivery         numeric,
  delta_readiness        numeric,
  created_at             timestamptz DEFAULT now(),
  notified_at            timestamptz
);

ALTER TABLE transfer_gap_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alerts"
  ON transfer_gap_alerts FOR SELECT
  USING (
    auth.uid() = user_id
    OR org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert alerts"
  ON transfer_gap_alerts FOR INSERT
  WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Service role can update alerts"
  ON transfer_gap_alerts FOR UPDATE
  USING (current_setting('role') = 'service_role');

-- Allow users to dismiss their own alerts (set notified_at)
CREATE POLICY "Users can update own alert notified_at"
  ON transfer_gap_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Schedule daily at 07:00 UTC
SELECT cron.schedule(
  'transfer-gap-alerts-daily',
  '0 7 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/transfer-gap-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  )$$
);
