-- Create custom types
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'team_lead');
CREATE TYPE "ExperienceLevel" AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE "ModuleStatus" AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE "ScenarioType" AS ENUM ('cold_call', 'product_demo', 'objection_handling', 'negotiation', 'closing');

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (extends auth.users)
-- We use a trigger to create this automatically on signup
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role "Role" DEFAULT 'user',
  team_id UUID, -- Foreign key added later
  industry TEXT,
  experience_level "ExperienceLevel" DEFAULT 'beginner',
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TEAMS
CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key to profiles for team_id
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_team 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- INDUSTRIES
CREATE TABLE public.industries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  scenario_templates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TRAINING SESSIONS
CREATE TABLE public.training_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  scenario TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- using text to be flexible or map to enum
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
CREATE TABLE public.pitches (
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ROW LEVEL SECURITY (RLS)

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true); -- Or restrict to authenticated users

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams Policies
CREATE POLICY "Teams viewable by members" 
ON public.teams FOR SELECT USING (
  exists(select 1 from public.profiles where profiles.user_id = auth.uid() and profiles.team_id = teams.id)
  OR 
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- Pitches Policies
CREATE POLICY "Users can view own pitches" 
ON public.pitches FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pitches" 
ON public.pitches FOR INSERT WITH CHECK (user_id = auth.uid());

-- Training Sessions Policies
CREATE POLICY "Users can view own sessions" 
ON public.training_sessions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions" 
ON public.training_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

-- STORAGE POLICIES (Conceptual - applied via dashboard or storage schema)
-- We will create a bucket 'pitch-recordings' via the dashboard usually, 
-- but we can script the policies here if we reference storage.objects

