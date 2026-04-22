-- Sprint 8: Transfer Gap v2 performance snapshots and Win/Loss event emission

-- ============================================================
-- 1. rep_performance_snapshots
-- ============================================================
CREATE TABLE public.rep_performance_snapshots (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id       uuid          NOT NULL REFERENCES auth.users(id),
  period_type   text          NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly')),
  period_start  date          NOT NULL,
  period_end    date          NOT NULL,
  scores        jsonb         NOT NULL,
  account_count int           NOT NULL,
  call_count    int           NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id, period_type, period_start)
);

ALTER TABLE public.rep_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Reps see their own snapshots
DROP POLICY IF EXISTS "rep_performance_snapshots_own_select" ON public.rep_performance_snapshots;
CREATE POLICY "rep_performance_snapshots_own_select" ON public.rep_performance_snapshots
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins and team leads see all within org
DROP POLICY IF EXISTS "rep_performance_snapshots_manager_select" ON public.rep_performance_snapshots;
CREATE POLICY "rep_performance_snapshots_manager_select" ON public.rep_performance_snapshots
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'team_lead')
    )
  );

-- Service-role write policies for nightly job
DROP POLICY IF EXISTS "rep_performance_snapshots_service_insert" ON public.rep_performance_snapshots;
CREATE POLICY "rep_performance_snapshots_service_insert" ON public.rep_performance_snapshots
  FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "rep_performance_snapshots_service_update" ON public.rep_performance_snapshots;
CREATE POLICY "rep_performance_snapshots_service_update" ON public.rep_performance_snapshots
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rep_performance_snapshots_org_user
  ON public.rep_performance_snapshots (org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rep_performance_snapshots_period
  ON public.rep_performance_snapshots (org_id, period_type, period_start);

-- ============================================================
-- 2. win_loss_events
-- ============================================================
CREATE TABLE public.win_loss_events (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid          NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id           uuid          NOT NULL REFERENCES auth.users(id),
  account_state_id  uuid          NOT NULL REFERENCES public.account_states(id) ON DELETE CASCADE,
  outcome           text          NOT NULL CHECK (outcome IN ('won', 'lost', 'ghosted')),
  trajectory        jsonb         NOT NULL,
  total_calls       int,
  total_duration_days int,
  final_sentiment   numeric,
  final_credibility numeric,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (account_state_id)
);

ALTER TABLE public.win_loss_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "win_loss_events_select" ON public.win_loss_events;
CREATE POLICY "win_loss_events_select" ON public.win_loss_events
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "win_loss_events_insert" ON public.win_loss_events;
CREATE POLICY "win_loss_events_insert" ON public.win_loss_events
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

-- Service-role insert for call-summariser emission
DROP POLICY IF EXISTS "win_loss_events_service_insert" ON public.win_loss_events;
CREATE POLICY "win_loss_events_service_insert" ON public.win_loss_events
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_win_loss_events_org
  ON public.win_loss_events (org_id);
CREATE INDEX IF NOT EXISTS idx_win_loss_events_org_outcome
  ON public.win_loss_events (org_id, outcome);
