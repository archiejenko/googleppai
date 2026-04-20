-- Token allowance columns on organisations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS monthly_token_allowance bigint DEFAULT 4000000;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS token_allowance_override bigint;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS token_overage_enabled boolean DEFAULT false;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS token_warning_sent_75 boolean DEFAULT false;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS token_warning_sent_90 boolean DEFAULT false;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS token_warning_reset_at timestamptz;

-- Token usage warnings table
CREATE TABLE IF NOT EXISTS token_usage_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organisations(id),
  threshold integer NOT NULL CHECK (threshold IN (75, 90, 100)),
  tokens_used bigint NOT NULL,
  tokens_allowed bigint NOT NULL,
  sent_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id)
);

ALTER TABLE token_usage_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_usage_warnings_select_admin"
  ON token_usage_warnings FOR SELECT
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );

CREATE POLICY "token_usage_warnings_insert_service"
  ON token_usage_warnings FOR INSERT
  WITH CHECK (false);

CREATE POLICY "token_usage_warnings_update_admin"
  ON token_usage_warnings FOR UPDATE
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  )
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );
