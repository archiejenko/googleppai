-- Migration: Per-org AI usage tracking and configurable daily limits
--
-- Two tables:
--   org_ai_limits  — configurable per-org call and token ceilings
--   org_ai_usage   — rolling daily counters, one row per org+function+day
--
-- One function:
--   check_org_ai_limit — atomic read-then-increment; rejected calls do not
--   consume budget. Slight race window between SELECT and INSERT is acceptable
--   for a daily org budget (±2 calls at limit is not a safety concern).
--
-- This system sits alongside the existing check_rate_limit_hardened (user/IP
-- burst+sustained limits, dashboard-created) and does not replace it.

-- ── org_ai_limits ─────────────────────────────────────────────────────────────
-- Managed per-org via admin dashboard or Supabase SQL. If no row exists for an
-- org, the function falls back to the hardcoded defaults (500 calls, 500k tokens).

CREATE TABLE IF NOT EXISTS public.org_ai_limits (
  org_id            uuid    NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  daily_call_limit  integer NOT NULL DEFAULT 500,
  daily_token_limit integer NOT NULL DEFAULT 500000,
  PRIMARY KEY (org_id)
);

ALTER TABLE public.org_ai_limits ENABLE ROW LEVEL SECURITY;

-- Admins can read and update their own org's limits; service role manages inserts
DROP POLICY IF EXISTS "org_ai_limits_select" ON public.org_ai_limits;
CREATE POLICY "org_ai_limits_select" ON public.org_ai_limits
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() = 'admin');

DROP POLICY IF EXISTS "org_ai_limits_update" ON public.org_ai_limits;
CREATE POLICY "org_ai_limits_update" ON public.org_ai_limits
  FOR UPDATE TO authenticated
  USING  (org_id = public.user_org_id() AND auth.user_role() = 'admin')
  WITH CHECK (org_id = public.user_org_id() AND auth.user_role() = 'admin');

-- ── org_ai_usage ──────────────────────────────────────────────────────────────
-- One row per (org, function, UTC calendar day). Upserted by check_org_ai_limit.
-- window_start is the UTC date the window opened.

CREATE TABLE IF NOT EXISTS public.org_ai_usage (
  org_id        uuid    NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  function_name text    NOT NULL,
  window_start  date    NOT NULL,
  call_count    integer NOT NULL DEFAULT 0,
  token_count   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, function_name, window_start)
);

CREATE INDEX IF NOT EXISTS idx_org_ai_usage_org_day
  ON public.org_ai_usage (org_id, window_start);

ALTER TABLE public.org_ai_usage ENABLE ROW LEVEL SECURITY;

-- Admins can inspect their org's usage
DROP POLICY IF EXISTS "org_ai_usage_select" ON public.org_ai_usage;
CREATE POLICY "org_ai_usage_select" ON public.org_ai_usage
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id() AND auth.user_role() IN ('team_lead', 'admin'));

-- ── check_org_ai_limit ────────────────────────────────────────────────────────
-- Returns jsonb: { allowed, daily_calls, daily_tokens, call_limit, token_limit }
-- Rejected calls (allowed=false) do NOT increment the counters.

CREATE OR REPLACE FUNCTION public.check_org_ai_limit(
  p_org_id        uuid,
  p_function_name text,
  p_tokens        integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_call_limit  integer;
  v_token_limit integer;
  v_calls       integer := 0;
  v_tokens      integer := 0;
  v_today       date    := CURRENT_DATE;
BEGIN
  -- Resolve limits: per-org row or system defaults
  SELECT daily_call_limit, daily_token_limit
  INTO   v_call_limit, v_token_limit
  FROM   public.org_ai_limits
  WHERE  org_id = p_org_id;

  IF NOT FOUND THEN
    v_call_limit  := 500;
    v_token_limit := 500000;
  END IF;

  -- Read today's current usage before deciding
  SELECT call_count, token_count
  INTO   v_calls, v_tokens
  FROM   public.org_ai_usage
  WHERE  org_id = p_org_id
    AND  function_name = p_function_name
    AND  window_start  = v_today;

  IF NOT FOUND THEN
    v_calls  := 0;
    v_tokens := 0;
  END IF;

  -- Reject without incrementing if either ceiling would be breached
  IF v_calls >= v_call_limit OR v_tokens + p_tokens > v_token_limit THEN
    RETURN jsonb_build_object(
      'allowed',      false,
      'daily_calls',  v_calls,
      'daily_tokens', v_tokens,
      'call_limit',   v_call_limit,
      'token_limit',  v_token_limit
    );
  END IF;

  -- Authorised: commit the increment
  INSERT INTO public.org_ai_usage
    (org_id, function_name, window_start, call_count, token_count)
  VALUES
    (p_org_id, p_function_name, v_today, 1, p_tokens)
  ON CONFLICT (org_id, function_name, window_start)
  DO UPDATE SET
    call_count  = org_ai_usage.call_count  + 1,
    token_count = org_ai_usage.token_count + EXCLUDED.token_count;

  RETURN jsonb_build_object(
    'allowed',      true,
    'daily_calls',  v_calls + 1,
    'daily_tokens', v_tokens + p_tokens,
    'call_limit',   v_call_limit,
    'token_limit',  v_token_limit
  );
END;
$$;
