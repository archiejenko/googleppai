-- Schedule benchmark-aggregator to run daily at 03:00 UTC
SELECT cron.schedule(
  'benchmark-aggregator-daily',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/benchmark-aggregator',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  )$$
);
