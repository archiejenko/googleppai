-- Sprint 4.5 — Pillar 3: Immutable Audit Logging
--
-- Append-only log of all user and system mutations. Org-scoped, visible
-- to org_admin only. No FK constraints — audit rows survive deletion of
-- the records they reference. They are historical facts, not relational data.
--
-- Coexists with admin_action_log (system-level events like Stripe webhooks).
-- This table covers org-level operational auditing.

-- ============================================================
-- 1. audit_log table
-- ============================================================
CREATE TABLE public.audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL,          -- no FK: survives org deletion
  user_id       uuid,                          -- no FK: auth.uid() or NULL for system events
  action        text        NOT NULL,          -- e.g. 'company.create', 'call.summarised', 'retention.deleted'
  resource_type text,                          -- e.g. 'simulated_company', 'call_summary', 'account_state'
  resource_id   uuid,                          -- no FK: survives resource deletion
  metadata      jsonb       NOT NULL DEFAULT '{}',
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Immutability enforcement
-- ============================================================
-- Same pattern as admin_action_log: rules silently discard mutations
CREATE RULE audit_log_no_delete AS
  ON DELETE TO public.audit_log DO INSTEAD NOTHING;

CREATE RULE audit_log_no_update AS
  ON UPDATE TO public.audit_log DO INSTEAD NOTHING;

-- ============================================================
-- 3. Row Level Security
-- ============================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- org_admin can read audit logs for their organisation.
-- org_manager and org_rep cannot read audit logs.
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

-- No INSERT/UPDATE/DELETE policies for authenticated role.
-- Audit writes use the service role client which bypasses RLS.

-- ============================================================
-- 4. Indexes for common query patterns
-- ============================================================
-- Time-range queries (audit log viewer default sort)
CREATE INDEX idx_audit_log_org_time
  ON public.audit_log (org_id, created_at DESC);

-- Action-type filtering
CREATE INDEX idx_audit_log_org_action
  ON public.audit_log (org_id, action);

-- Resource-specific lookups (e.g. "show me all events for company X")
CREATE INDEX idx_audit_log_org_resource
  ON public.audit_log (org_id, resource_type, resource_id);
