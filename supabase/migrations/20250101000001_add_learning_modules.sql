-- LEARNING MODULES
CREATE TABLE public.learning_modules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_time INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  skills TEXT[],
  prerequisites TEXT[], -- Array of module IDs
  scenario_type TEXT NOT NULL,
  industry TEXT,
  "order" INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER PROGRESS
-- Tracks progress on modules
CREATE TABLE public.user_progress (
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
CREATE TABLE public.skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USER SKILLS
CREATE TABLE public.user_skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  level INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, skill_id)
);

-- RLS
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Read policies (everyone can read modules/skills)
CREATE POLICY "Enable read access for all users" ON public.learning_modules FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.skills FOR SELECT USING (true);

-- User Progress policies
CREATE POLICY "Users can view own progress" 
ON public.user_progress FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress" 
ON public.user_progress FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress" 
ON public.user_progress FOR UPDATE USING (user_id = auth.uid());

-- User Skills policies
CREATE POLICY "Users can view own skills" 
ON public.user_skills FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert/update own skills" 
ON public.user_skills FOR ALL USING (user_id = auth.uid());
