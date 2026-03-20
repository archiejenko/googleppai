-- ============================================================
-- MIGRATION 001 — Bootstrap triggers, columns, and tables
-- Apply in Supabase SQL Editor or via supabase db push
-- ============================================================

-- ----------------------------------------------------------
-- 1. Auto-create profiles row when a new auth user is created
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, org_id, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user',
    NULL,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------
-- 2. Add onboarding_completed flag to profiles
-- ----------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- ----------------------------------------------------------
-- 3. Add meddic_scores column to pitches
-- ----------------------------------------------------------
ALTER TABLE public.pitches
  ADD COLUMN IF NOT EXISTS meddic_scores jsonb NOT NULL DEFAULT '{}';

-- ----------------------------------------------------------
-- 4. leaderboard_snapshots — for real rank-change tracking
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  org_id      uuid REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  rank        integer NOT NULL,
  avg_score   numeric,
  total_calls integer DEFAULT 0,
  period      text NOT NULL,   -- e.g. '2026-W10', '2026-03'
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lb_snapshots_org_period
  ON public.leaderboard_snapshots (org_id, period);
CREATE INDEX IF NOT EXISTS idx_lb_snapshots_user_period
  ON public.leaderboard_snapshots (user_id, period);

-- ----------------------------------------------------------
-- 5. dispatched_drills — created from pitch analysis CTA
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispatched_drills (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pitch_id             uuid REFERENCES public.pitches(id) ON DELETE SET NULL,
  focus_area           text NOT NULL,
  context              text,
  difficulty           text DEFAULT 'medium',
  drill_type           text,
  weakness_identified  text,
  success_requirement  text,
  completed            boolean DEFAULT false,
  completed_at         timestamptz,
  score                integer,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatched_drills_user
  ON public.dispatched_drills (user_id, completed);

-- ----------------------------------------------------------
-- 6. deployment_requests — for DeploymentRequestForm submissions
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deployment_requests (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,
  company      text NOT NULL,
  email        text NOT NULL,
  industry     text,
  message      text,
  request_type text DEFAULT 'demo',  -- 'demo' | 'feedback'
  created_at   timestamptz DEFAULT now()
);

-- ----------------------------------------------------------
-- 7. prospect_profiles — Revenue Intelligence
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prospect_profiles (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id               uuid REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  company_name         text,
  contact_name         text,
  role                 text,
  engagement_score     integer DEFAULT 0,
  last_interaction_at  timestamptz,
  created_at           timestamptz DEFAULT now()
);

-- ----------------------------------------------------------
-- 8. upgrade_requests — self-service upgrade intent
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  requested_tier text NOT NULL,
  seat_count   integer DEFAULT 1,
  notes        text,
  status       text DEFAULT 'pending',  -- 'pending' | 'contacted' | 'converted'
  created_at   timestamptz DEFAULT now()
);

-- ----------------------------------------------------------
-- 9. Notification triggers
-- ----------------------------------------------------------

-- 9a. Notify on pitch created (session complete)
CREATE OR REPLACE FUNCTION public.notify_session_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_scenario text;
BEGIN
  SELECT scenario INTO v_scenario
  FROM public.training_sessions
  WHERE id = NEW.session_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_pitch_created ON public.pitches;
CREATE TRIGGER on_pitch_created
  AFTER INSERT ON public.pitches
  FOR EACH ROW EXECUTE FUNCTION public.notify_session_complete();

-- 9b. Notify on goal achieved
CREATE OR REPLACE FUNCTION public.notify_goal_achieved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current >= NEW.target AND (OLD.current IS NULL OR OLD.current < OLD.target) THEN
    INSERT INTO public.notifications (user_id, type, title, body, unread)
    VALUES (
      NEW.user_id,
      'goal',
      'Goal Achieved: ' || NEW.title,
      'You hit your target of ' || NEW.target || ' ' || COALESCE(NEW.unit, 'pts') || '. Great work.',
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_goal_updated ON public.user_goals;
CREATE TRIGGER on_goal_updated
  AFTER UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.notify_goal_achieved();

-- 9c. Auto-update Quota/Activity goals when a pitch is saved
CREATE OR REPLACE FUNCTION public.auto_update_goals_on_pitch()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment 'activity' goals (sessions count) by 1
  UPDATE public.user_goals
  SET current = current + 1
  WHERE user_id = NEW.user_id
    AND category = 'activity'
    AND completed = false
    AND current < target;

  -- For quota goals tracking by score threshold (target treated as score to beat)
  UPDATE public.user_goals
  SET current = current + 1
  WHERE user_id = NEW.user_id
    AND category = 'quota'
    AND completed = false
    AND current < target
    AND NEW.score >= 70;

  -- Mark goals as completed where current >= target
  UPDATE public.user_goals
  SET completed = true
  WHERE user_id = NEW.user_id
    AND current >= target
    AND completed = false;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add completed column to user_goals if missing
ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

DROP TRIGGER IF EXISTS on_pitch_created_update_goals ON public.pitches;
CREATE TRIGGER on_pitch_created_update_goals
  AFTER INSERT ON public.pitches
  FOR EACH ROW EXECUTE FUNCTION public.auto_update_goals_on_pitch();

-- ----------------------------------------------------------
-- 10. Avatar URL column on profiles
-- ----------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;
