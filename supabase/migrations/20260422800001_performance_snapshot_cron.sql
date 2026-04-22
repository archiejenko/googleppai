-- Nightly performance-snapshot computation at 02:00 UTC
SELECT cron.schedule(
  'performance-snapshot-nightly',
  '0 2 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_functions_url') || '/functions/v1/performance-snapshot',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  )$$
);
