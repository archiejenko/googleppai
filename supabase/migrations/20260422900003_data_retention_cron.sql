-- Sprint 4.5 — Data retention enforcement cron job
--
-- Runs weekly (Sunday 03:00 UTC) for v1. Can be switched to nightly
-- by changing the schedule. Customers should be able to configure
-- retention per-org in a future sprint.

SELECT cron.schedule(
  'data-retention-weekly',
  '0 3 * * 0',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_functions_url') || '/functions/v1/data-retention',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  )$$
);
