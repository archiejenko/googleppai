-- Create user_org_id helper (missing from remote DB)
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS uuid AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public;

-- Add org_id column to deal_outcomes
ALTER TABLE deal_outcomes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);

-- Backfill org_id from profiles
UPDATE deal_outcomes d
SET org_id = p.org_id
FROM profiles p
WHERE p.id = d.user_id
  AND d.org_id IS NULL;

-- Replace SELECT policy with org_id-aware version
DROP POLICY IF EXISTS "Managers read team deal_outcomes" ON public.deal_outcomes;
CREATE POLICY "Managers read team deal_outcomes" ON public.deal_outcomes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id = public.user_org_id() AND public.get_my_role() IN ('team_lead', 'admin'))
  );

-- Replace ALL policy with separate INSERT policy using org_id
DROP POLICY IF EXISTS "Users manage own deal_outcomes" ON public.deal_outcomes;
CREATE POLICY "Users manage own deal_outcomes" ON public.deal_outcomes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (user_id = auth.uid() AND org_id = public.user_org_id());

-- Fix crm_deal_id unique index to use org_id
DROP INDEX IF EXISTS idx_deal_outcomes_crm_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_outcomes_crm_unique
  ON deal_outcomes(org_id, crm_deal_id) WHERE crm_deal_id IS NOT NULL;
