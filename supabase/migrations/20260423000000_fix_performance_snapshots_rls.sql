-- Fix Check 10: rep_performance_snapshots manager policy is org-wide, not team-scoped.
-- Split the combined manager/admin policy into two: team_lead sees team only, admin sees all.

DROP POLICY IF EXISTS "rep_performance_snapshots_manager_select" ON public.rep_performance_snapshots;

CREATE POLICY "rep_performance_snapshots_teamlead_select" ON public.rep_performance_snapshots
  FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    AND public.get_user_org_role(org_id) = 'team_lead'
    AND user_id = ANY(public.get_team_member_ids(org_id))
  );

CREATE POLICY "rep_performance_snapshots_admin_select" ON public.rep_performance_snapshots
  FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    AND public.get_user_org_role(org_id) = 'admin'
  );
