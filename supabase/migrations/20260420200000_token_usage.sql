CREATE TABLE IF NOT EXISTS token_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organisations(id),
  user_id uuid REFERENCES auth.users(id),
  function_name text,
  model text,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_usage_log_select_admin"
  ON token_usage_log FOR SELECT
  USING (
    org_id = public.user_org_id()
    AND public.get_my_role() = 'admin'
  );
