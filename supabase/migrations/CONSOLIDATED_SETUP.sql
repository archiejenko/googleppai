-- CONSOLIDATED DATABASE SETUP
-- Includes:
-- 1. Initial Schema (Profiles, Teams, Pitches, Training Sessions)
-- 2. Learning Modules Schema
-- 3. Security Remediation (RLS Policies)

-- === PART 1: INITIAL SCHEMA ===

-- Create custom types
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('user', 'admin', 'team_lead');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ModuleStatus" AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScenarioType" AS ENUM ('cold_call', 'product_demo', 'objection_handling', 'negotiation', 'closing');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role "Role" DEFAULT 'user',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  industry TEXT,
  experience_level "ExperienceLevel" DEFAULT 'beginner',
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDUSTRIES
CREATE TABLE IF NOT EXISTS public.industries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  scenario_templates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TRAINING SESSIONS
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  scenario TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  target_persona TEXT,
  pitch_goal TEXT,
  time_limit INTEGER,
  language TEXT DEFAULT 'en',
  industry_id UUID REFERENCES public.industries(id),
  completed BOOLEAN DEFAULT false,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PITCHES
CREATE TABLE IF NOT EXISTS public.pitches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  transcript TEXT,
  analysis JSONB,
  feedback JSONB,
  score INTEGER,
  duration INTEGER,
  sentiment_score FLOAT,
  confidence_score INTEGER,
  pace_score INTEGER,
  clarity_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AUTOMATIC PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- === PART 2: LEARNING MODULES ===

-- LEARNING MODULES
CREATE TABLE IF NOT EXISTS public.learning_modules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_time INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  skills TEXT[],
  prerequisites TEXT[],
  scenario_type TEXT NOT NULL,
  industry TEXT,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER PROGRESS
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE NOT NULL,
  status "ModuleStatus" DEFAULT 'not_started',
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, module_id)
);

-- SKILLS
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER SKILLS
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  level INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, skill_id)
);

-- === PART 3: SECURITY & POLICIES (Consolidated) ===

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- CLEANUP OLD POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teams viewable by members" ON public.teams;
DROP POLICY IF EXISTS "Users can view own pitches" ON public.pitches;
DROP POLICY IF EXISTS "Users can insert own pitches" ON public.pitches;
DROP POLICY IF EXISTS "Admins can view all pitches" ON public.pitches;
DROP POLICY IF EXISTS "Team Leads can view team pitches" ON public.pitches;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Team Leads can view team sessions" ON public.training_sessions;

-- PROFILES POLICIES
CREATE POLICY "Profiles viewable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- TEAMS POLICIES
CREATE POLICY "Teams viewable by members" 
ON public.teams FOR SELECT TO authenticated USING (
  exists(select 1 from public.profiles where profiles.id = auth.uid() and profiles.team_id = teams.id)
  OR 
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- PITCHES POLICIES
CREATE POLICY "Users can view own pitches" 
ON public.pitches FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pitches" 
ON public.pitches FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all pitches"
ON public.pitches FOR SELECT TO authenticated USING (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

CREATE POLICY "Team Leads can view team pitches"
ON public.pitches FOR SELECT TO authenticated USING (
  exists (
    select 1 from public.profiles viewer
    join public.profiles target on target.team_id = viewer.team_id
    where viewer.id = auth.uid() 
      and viewer.role = 'team_lead'
      and target.id = pitches.user_id
  )
);

-- TRAINING SESSIONS POLICIES
CREATE POLICY "Users can view own sessions" 
ON public.training_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions" 
ON public.training_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
ON public.training_sessions FOR SELECT TO authenticated USING (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

CREATE POLICY "Team Leads can view team sessions"
ON public.training_sessions FOR SELECT TO authenticated USING (
  exists (
    select 1 from public.profiles viewer
    join public.profiles target on target.team_id = viewer.team_id
    where viewer.id = auth.uid() 
      and viewer.role = 'team_lead'
      and target.id = training_sessions.user_id
  )
);

-- LEARNING MODULES POLICIES
CREATE POLICY "Enable read access for all users" ON public.learning_modules FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.skills FOR SELECT USING (true);

-- USER PROGRESS POLICIES
CREATE POLICY "Users can view own progress" 
ON public.user_progress FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress" 
ON public.user_progress FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress" 
ON public.user_progress FOR UPDATE USING (user_id = auth.uid());

-- USER SKILLS POLICIES
CREATE POLICY "Users can view own skills" 
ON public.user_skills FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert/update own skills" 
ON public.user_skills FOR ALL USING (user_id = auth.uid());

-- STORAGE (Optional if done via Dashboard)
-- insert into storage.buckets (id, name, public) values ('pitch-recordings', 'pitch-recordings', true) on conflict (id) do nothing;
