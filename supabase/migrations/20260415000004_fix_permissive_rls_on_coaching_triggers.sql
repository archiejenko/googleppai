-- Migration: Fix permissive WITH CHECK on coaching_triggers UPDATE policy
--
-- The policy "team_lead can resolve and snooze" had WITH CHECK (true), which
-- allows any authenticated manager to write any value into any row — even rows
-- in other orgs — as long as the USING clause passed. Replacing WITH CHECK to
-- mirror the USING clause so the post-update row is held to the same org/role
-- constraint as the pre-update row.

DROP POLICY IF EXISTS "team_lead can resolve and snooze" ON public.coaching_triggers;

CREATE POLICY "team_lead can resolve and snooze"
ON public.coaching_triggers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.team_id = coaching_triggers.org_id
    AND p.role = ANY (ARRAY['team_lead'::"Role", 'admin'::"Role"])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.team_id = coaching_triggers.org_id
    AND p.role = ANY (ARRAY['team_lead'::"Role", 'admin'::"Role"])
  )
);
