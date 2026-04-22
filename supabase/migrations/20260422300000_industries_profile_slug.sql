-- Add industry_profile_slug FK to industries table so the pre-call
-- company picker can filter simulated_companies by industry.
ALTER TABLE public.industries
  ADD COLUMN IF NOT EXISTS industry_profile_slug text
    REFERENCES public.industry_profiles(slug);

-- Seed mapping for the three existing industry_profiles.
-- Uses name-based matching; verify against actual industries rows.
UPDATE public.industries SET industry_profile_slug = 'saas'
  WHERE LOWER(name) LIKE '%saas%' OR LOWER(name) LIKE '%software%';
UPDATE public.industries SET industry_profile_slug = 'fintech'
  WHERE LOWER(name) LIKE '%fintech%' OR LOWER(name) LIKE '%financ%';
UPDATE public.industries SET industry_profile_slug = 'recruitment'
  WHERE LOWER(name) LIKE '%recruit%' OR LOWER(name) LIKE '%staffing%';

CREATE INDEX IF NOT EXISTS idx_industries_profile_slug
  ON public.industries (industry_profile_slug);
