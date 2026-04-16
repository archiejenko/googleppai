-- Migration: Fix notify_session_complete() trigger — wrong FK column name
--
-- The function referenced NEW.session_id but the pitches table uses
-- NEW.training_session_id as the FK column to training_sessions.
-- With the wrong column name PostgreSQL raises
--   "record new has no field session_id"
-- causing the AFTER INSERT trigger to fail and rolling back every pitch INSERT.
-- This silently blocked all score persistence, notifications, and goal updates.

CREATE OR REPLACE FUNCTION public.notify_session_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_scenario text;
BEGIN
  SELECT scenario INTO v_scenario
  FROM public.training_sessions
  WHERE id = NEW.training_session_id
  LIMIT 1;

  INSERT INTO public.notifications (user_id, type, title, body, unread)
  VALUES (
    NEW.user_id,
    'feedback',
    'Session Complete — Score: ' || COALESCE(NEW.score::text, '0') || '/100',
    'Your ' || COALESCE(v_scenario, 'training') || ' session has been scored. View your full analysis.',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
