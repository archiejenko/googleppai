CREATE TABLE IF NOT EXISTS crm_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organisations(id),
  provider text CHECK (provider IN ('hubspot', 'salesforce')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  instance_url text,
  connected_at timestamptz DEFAULT now(),
  connected_by uuid REFERENCES auth.users(id),
  last_synced_at timestamptz,
  sync_error text,
  UNIQUE (org_id, provider)
);

ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;

-- SELECT: org admins only
CREATE POLICY "crm_connections_select_admin"
  ON crm_connections FOR SELECT
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() IN ('admin', 'team_lead')
  );

-- INSERT: org admins only
CREATE POLICY "crm_connections_insert_admin"
  ON crm_connections FOR INSERT
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

-- UPDATE: org admins only
CREATE POLICY "crm_connections_update_admin"
  ON crm_connections FOR UPDATE
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

-- DELETE: org admins only
CREATE POLICY "crm_connections_delete_admin"
  ON crm_connections FOR DELETE
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

-- Add crm_deal_id to deal_outcomes for CRM sync deduplication
ALTER TABLE deal_outcomes ADD COLUMN IF NOT EXISTS crm_deal_id text;
CREATE UNIQUE INDEX IF NOT EXISTS deal_outcomes_crm_deal_id_unique
  ON deal_outcomes (crm_deal_id) WHERE crm_deal_id IS NOT NULL;

-- pg_cron job for deal-outcomes CRM sync at 04:00 UTC daily
SELECT cron.schedule(
  'deal-outcomes-crm-sync',
  '0 4 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/deal-outcomes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"action":"ingest_from_crm"}'::jsonb
  )$$
);
