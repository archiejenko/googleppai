-- Fix Check 15: data_classification_registry SELECT was open to all authenticated users.
-- Restrict to platform admin only. export-guard.ts uses service role client (bypasses RLS).

DROP POLICY IF EXISTS "dcr_select" ON public.data_classification_registry;

CREATE POLICY "dcr_select" ON public.data_classification_registry
  FOR SELECT TO authenticated
  USING (public.is_admin());
