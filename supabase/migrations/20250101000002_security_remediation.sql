-- SECURITY REMEDIATION MIGRATION

-- 1. FIX: Profiles should not be public to the whole internet, only authenticated users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

-- 2. FIX: Teams policy had incorrect column reference (user_id instead of id for profiles)
DROP POLICY IF EXISTS "Teams viewable by members" ON public.teams;
CREATE POLICY "Teams viewable by members" 
ON public.teams FOR SELECT TO authenticated USING (
  exists(select 1 from public.profiles where profiles.id = auth.uid() and profiles.team_id = teams.id)
  OR 
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- 3. FIX: Add Admin/TeamLead access to Pitches
-- Current policy: "Users can view own pitches" -> logic: user_id = auth.uid()
-- We need to ADD a policy (policies are ORed) or modify the existing one. Adding is cleaner.
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

-- 4. FIX: Add Admin/TeamLead access to Training Sessions
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

-- 5. STORAGE POLICIES (If utilizing Supabase Storage via SQL)
-- Note: 'storage' schema access requires appropriate permissions.
-- We assume the bucket 'pitch-recordings' exists.

insert into storage.buckets (id, name, public)
values ('pitch-recordings', 'pitch-recordings', true)
on conflict (id) do nothing;

-- Allow authenticated uploads
create policy "Authenticated users can upload pitches"
on storage.objects for insert to authenticated
with check ( bucket_id = 'pitch-recordings' AND auth.uid() = owner );

-- Allow authenticated select
create policy "Authenticated users can select pitches"
on storage.objects for select to authenticated
using ( bucket_id = 'pitch-recordings' );
