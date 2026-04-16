-- Fix calculate_performance_momentum: jsonb_build_object keys were double-quoted
-- (treated as identifiers, causing SQLSTATE 42703 / 400 from PostgREST).
-- Replace with single-quoted string literals.
CREATE OR REPLACE FUNCTION public.calculate_performance_momentum(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    this_week_count INT;
    last_week_count INT;
    this_week_avg FLOAT;
    last_week_avg FLOAT;
    momentum_score FLOAT;
BEGIN
    -- Current week sessions
    SELECT COUNT(*), COALESCE(AVG(score), 0)
    INTO this_week_count, this_week_avg
    FROM public.training_sessions ts
    JOIN public.pitches p ON p.training_session_id = ts.id
    WHERE ts.user_id = p_user_id
        AND ts.created_at >= date_trunc('week', now());

    -- Previous week sessions
    SELECT COUNT(*), COALESCE(AVG(score), 0)
    INTO last_week_count, last_week_avg
    FROM public.training_sessions ts
    JOIN public.pitches p ON p.training_session_id = ts.id
    WHERE ts.user_id = p_user_id
        AND ts.created_at >= date_trunc('week', now()) - interval '7 days'
        AND ts.created_at < date_trunc('week', now());

    -- Simplified momentum calculation
    momentum_score := (this_week_count * 10) + (this_week_avg - last_week_avg);

    RETURN jsonb_build_object(
        'sessions_this_week', this_week_count,
        'momentum_score', momentum_score,
        'trend', CASE WHEN this_week_avg >= last_week_avg THEN 'up' ELSE 'down' END,
        'score_diff', this_week_avg - last_week_avg
    );
END;
$$;
