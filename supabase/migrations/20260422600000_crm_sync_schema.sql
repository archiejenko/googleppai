-- Sprint 6: CRM Ingestion schema — encryption, external IDs, upsert helpers
-- Requires: app.settings.crm_encryption_key set via Supabase dashboard

-- ── pgcrypto extension ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Token encrypt / decrypt helpers ────────────────────────────────────────────
-- SECURITY DEFINER: callers never see the raw encryption key.

CREATE OR REPLACE FUNCTION public.encrypt_token(plain_text text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(plain_text, current_setting('app.settings.crm_encryption_key')),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_token(cipher_text text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(cipher_text, 'base64'),
    current_setting('app.settings.crm_encryption_key')
  );
END;
$$;

-- ── Alter crm_connections: encrypt existing tokens, add sync metadata ──────────

ALTER TABLE crm_connections
  ADD COLUMN IF NOT EXISTS encrypted_access_token text,
  ADD COLUMN IF NOT EXISTS encrypted_refresh_token text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'syncing', 'complete', 'error')),
  ADD COLUMN IF NOT EXISTS scopes text[],
  ADD COLUMN IF NOT EXISTS field_mappings jsonb DEFAULT '{}'::jsonb;

UPDATE crm_connections
SET encrypted_access_token = public.encrypt_token(access_token),
    encrypted_refresh_token = public.encrypt_token(refresh_token)
WHERE access_token IS NOT NULL;

ALTER TABLE crm_connections DROP COLUMN IF EXISTS access_token;
ALTER TABLE crm_connections DROP COLUMN IF EXISTS refresh_token;

ALTER TABLE crm_connections RENAME COLUMN encrypted_access_token TO access_token;
ALTER TABLE crm_connections RENAME COLUMN encrypted_refresh_token TO refresh_token;

ALTER TABLE crm_connections ALTER COLUMN org_id SET NOT NULL;

-- ── External ID tracking on simulation tables ──────────────────────────────────

ALTER TABLE public.simulated_companies
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_provider text
    CHECK (external_provider IN ('hubspot', 'salesforce'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_companies_external
  ON public.simulated_companies (org_id, external_provider, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.simulated_personas
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_provider text
    CHECK (external_provider IN ('hubspot', 'salesforce'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_personas_external
  ON public.simulated_personas (org_id, external_provider, external_id)
  WHERE external_id IS NOT NULL;

-- ── Upsert helpers for CRM sync (partial unique index needs raw SQL) ───────────

CREATE OR REPLACE FUNCTION public.upsert_crm_company(
  p_org_id uuid,
  p_external_id text,
  p_external_provider text,
  p_name text,
  p_industry_slug text,
  p_size text,
  p_stage text,
  p_tech_stack jsonb DEFAULT '[]'::jsonb,
  p_strategic_priorities jsonb DEFAULT '[]'::jsonb,
  p_pain_points jsonb DEFAULT '[]'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result_id uuid;
  v_slug text;
BEGIN
  -- Resolve industry slug: fall back to 'saas' if provided slug doesn't exist
  SELECT slug INTO v_slug
  FROM public.industry_profiles
  WHERE slug = p_industry_slug;

  IF v_slug IS NULL THEN
    v_slug := 'saas';
  END IF;

  INSERT INTO public.simulated_companies (
    org_id, external_id, external_provider, name, industry_slug,
    size, stage, tech_stack, strategic_priorities, pain_points, source
  ) VALUES (
    p_org_id, p_external_id, p_external_provider, p_name, v_slug,
    p_size, p_stage, p_tech_stack, p_strategic_priorities, p_pain_points, 'crm_sync'
  )
  ON CONFLICT (org_id, external_provider, external_id)
    WHERE external_id IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    industry_slug = EXCLUDED.industry_slug,
    size = EXCLUDED.size,
    stage = EXCLUDED.stage,
    tech_stack = EXCLUDED.tech_stack,
    strategic_priorities = EXCLUDED.strategic_priorities,
    pain_points = EXCLUDED.pain_points
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_crm_persona(
  p_org_id uuid,
  p_company_id uuid,
  p_external_id text,
  p_external_provider text,
  p_name text,
  p_title text,
  p_seniority text,
  p_personality_profile jsonb DEFAULT '{"patience_level":50,"detail_orientation":50,"risk_tolerance":50,"decision_speed":50,"communication_style":"professional"}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result_id uuid;
BEGIN
  INSERT INTO public.simulated_personas (
    org_id, company_id, external_id, external_provider,
    name, title, seniority, personality_profile, source
  ) VALUES (
    p_org_id, p_company_id, p_external_id, p_external_provider,
    p_name, p_title, p_seniority, p_personality_profile, 'crm_sync'
  )
  ON CONFLICT (org_id, external_provider, external_id)
    WHERE external_id IS NOT NULL
  DO UPDATE SET
    company_id = EXCLUDED.company_id,
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    seniority = EXCLUDED.seniority
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;
