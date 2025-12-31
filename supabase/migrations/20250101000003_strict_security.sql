-- SECURITY REMEDIATION MIGRATION (FINAL)
-- Compliant with Security Architecture v1.0 ("Highest Grade")

-- 1. ZERO TRUST BASELINE
REVOKE ALL ON SCHEMA public FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- 2. EXPLICIT GRANTS & RESTRICTIONS

-- PROFILES: Read-Only (RLS filters rows). Update specific columns only.
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (name, industry, experience_level, total_xp) ON public.profiles TO authenticated;

-- TEAMS: Read-Only (RLS filters). Insert Allowed (Creation). Update (RLS Restriction).
GRANT SELECT, INSERT, UPDATE ON public.teams TO authenticated;

-- PITCHES: **REVOKE INSERT** for Users. 
-- Users cannot write directly to 'pitches'. They must use the Edge Function (which uses Service Role).
-- They can SELECT their own pitches (RLS).
GRANT SELECT ON public.pitches TO authenticated;
GRANT DELETE ON public.pitches TO authenticated; 
-- Note: schema.prisma might want to update pitches? 
-- If the UI allows "Save Note on Pitch", we might need UPDATE permission on specific columns.
-- Assuming 'feedback' field updates:
GRANT UPDATE (feedback) ON public.pitches TO authenticated;
-- BUT INSERT IS REVOKED.

-- TRAINING SESSIONS: Full access (User owned data).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;

-- PROGRESS & SKILLS: Full access (User owned data).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_skills TO authenticated;

-- STATIC DATA: Read-Only Public
GRANT SELECT ON public.industries TO authenticated, anon;
GRANT SELECT ON public.skills TO authenticated, anon;
GRANT SELECT ON public.learning_modules TO authenticated, anon;

-- 3. STRICT RLS POLICIES (Re-applying for safety)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Profile Self-Update Policy
DROP POLICY IF EXISTS "Strict user update own profile" ON public.profiles;
CREATE POLICY "Strict user update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. STORAGE SECURITY
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pitch-recordings', 'pitch-recordings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Auth users can upload pitch" ON storage.objects;
CREATE POLICY "Auth users can upload pitch"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pitch-recordings' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Auth users can read own pitch" ON storage.objects;
CREATE POLICY "Auth users can read own pitch"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pitch-recordings' AND auth.uid() = owner);
