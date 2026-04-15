-- Migration: Recreate SECURITY DEFINER views as plain (security invoker) views
--
-- The Supabase Security Advisor flagged both views as SECURITY DEFINER, meaning
-- queries execute with the view owner's privileges rather than the querying user's.
-- This bypasses RLS and leaks data across orgs.
--
-- Fix: DROP and re-CREATE each view using CREATE OR REPLACE VIEW with no
-- security_definer option. PostgreSQL views are SECURITY INVOKER by default,
-- so the recreated views will respect the caller's RLS context.
--
-- View bodies are reconstructed from TypeScript interface definitions
-- (src/hooks/usePipelineConversion.ts, src/hooks/useWinLoss.ts) and known
-- table schemas. To verify against the live definition before applying:
--   SELECT pg_get_viewdef('public.stage_conversion_rates'::regclass, true);
--   SELECT pg_get_viewdef('public.training_correlation'::regclass, true);
--
-- The previous migration (20260415000001) applied ALTER VIEW ... SET
-- (security_invoker = true) as a first-pass fix. This migration replaces
-- the view entirely so the definition in migrations matches the live DB.

-- ── stage_conversion_rates ────────────────────────────────────────────────────
-- Columns (from ConversionRow interface): rep_id, from_stage, total_exits,
-- advanced_count, conversion_rate_pct.
-- Source: deal_stage_changes — written by record_deal_stage_change() trigger
-- when a deal's stage column is updated. 'advanced' is true when the deal
-- moved forward along the canonical pipeline order.

DROP VIEW IF EXISTS public.stage_conversion_rates;

CREATE OR REPLACE VIEW public.stage_conversion_rates AS
SELECT
    dsc.rep_id,
    dsc.from_stage,
    COUNT(*)::integer                                                      AS total_exits,
    COUNT(*) FILTER (WHERE dsc.advanced)::integer                         AS advanced_count,
    CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE ROUND(
            COUNT(*) FILTER (WHERE dsc.advanced) * 100.0 / COUNT(*), 2
        )
    END                                                                    AS conversion_rate_pct
FROM public.deal_stage_changes dsc
GROUP BY dsc.rep_id, dsc.from_stage;

-- ── training_correlation ──────────────────────────────────────────────────────
-- Columns (from CorrelationRow interface): outcome_id, user_id, outcome,
-- deal_value, close_date, deal_session_id, was_prepped, avg_training_score,
-- related_metrics_count, created_at.
-- Source: deal_outcomes LEFT-joined to pitches on the owning user, within a
-- 90-day window before the close date, to attribute training activity to deals.

DROP VIEW IF EXISTS public.training_correlation;

CREATE OR REPLACE VIEW public.training_correlation AS
SELECT
    do.id                                                                  AS outcome_id,
    do.user_id,
    do.outcome,
    do.deal_value,
    do.close_date,
    do.deal_session_id,
    (do.deal_session_id IS NOT NULL)                                       AS was_prepped,
    AVG(p.score)                                                           AS avg_training_score,
    COUNT(p.id)::integer                                                   AS related_metrics_count,
    do.created_at
FROM public.deal_outcomes do
LEFT JOIN public.pitches p
    ON  p.user_id    = do.user_id
    AND p.created_at BETWEEN
            COALESCE(do.close_date::timestamptz, do.created_at) - INTERVAL '90 days'
        AND COALESCE(do.close_date::timestamptz, do.created_at)
GROUP BY
    do.id, do.user_id, do.outcome, do.deal_value,
    do.close_date, do.deal_session_id, do.created_at;
