-- Cron job: mark stale pending_consent sessions as abandoned every 30 minutes.
-- Requires pg_cron extension (enabled by default on Supabase).

SELECT cron.schedule(
  'cleanup-stale-consent-sessions',
  '*/30 * * * *',
  $$UPDATE live_scores SET status = 'abandoned' WHERE status = 'pending_consent' AND call_started_at < now() - interval '15 minutes'$$
);
