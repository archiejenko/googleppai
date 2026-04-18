-- Migration: Cache role and team_id lookups in RLS helper functions
--
-- get_my_role(), is_admin(), and get_my_team_id() all query public.profiles
-- on every call. Because RLS evaluates all permissive policies per command and
-- ORs the results, a single profiles SELECT triggers these helpers multiple
-- times within the same transaction, adding 2-3 extra round-trips to profiles
-- per request.
--
-- Fix: use set_config/current_setting with transaction-local scope (third arg
-- true) to cache the result after the first lookup. The '__null__' sentinel
-- prevents a second DB query for users with null role or null team_id.
-- set_config(..., true) resets at transaction end so there is no cross-request
-- leakage.
--
-- is_admin() is rewritten to delegate to get_my_role() so it gets the cache
-- for free and does not issue its own query.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := current_setting('app.current_user_role', true);
  IF v_role IS NOT NULL AND v_role <> '' THEN
    RETURN CASE WHEN v_role = '__null__' THEN NULL ELSE v_role END;
  END IF;

  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  PERFORM set_config('app.current_user_role', COALESCE(v_role, '__null__'), true);
  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(public.get_my_role() = 'admin', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id text;
BEGIN
  v_team_id := current_setting('app.current_user_team_id', true);
  IF v_team_id IS NOT NULL AND v_team_id <> '' THEN
    RETURN CASE WHEN v_team_id = '__null__' THEN NULL ELSE v_team_id::uuid END;
  END IF;

  SELECT team_id::text INTO v_team_id
  FROM public.profiles
  WHERE id = auth.uid();

  PERFORM set_config('app.current_user_team_id', COALESCE(v_team_id, '__null__'), true);
  RETURN v_team_id::uuid;
END;
$$;
