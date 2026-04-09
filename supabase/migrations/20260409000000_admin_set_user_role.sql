-- Defines the admin_set_user_role RPC called by AdminDashboard.
-- SECURITY DEFINER runs as the function owner (service role), bypassing RLS.
-- Callable only with a valid JWT; the caller's admin role is checked in-function.

CREATE OR REPLACE FUNCTION admin_set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate role value
  IF new_role NOT IN ('user', 'team_lead', 'admin') THEN
    RAISE EXCEPTION 'Invalid role "%". Must be one of: user, team_lead, admin', new_role;
  END IF;

  -- Verify the calling user exists and is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: caller does not have admin role';
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', target_user_id;
  END IF;
END;
$$;
