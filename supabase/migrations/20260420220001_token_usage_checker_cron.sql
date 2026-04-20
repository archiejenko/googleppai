SELECT cron.schedule(
  'token-usage-checker-daily',
  '0 6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_functions_url') || '/functions/v1/token-usage-checker',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  )$$
);
