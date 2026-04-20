ALTER TABLE organisations ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS company_size text CHECK (company_size IN ('smb', 'midmarket', 'enterprise') OR company_size IS NULL);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS meddic_weightings jsonb DEFAULT '{"metrics": 1, "economicBuyer": 1, "decisionCriteria": 1, "decisionProcess": 1, "identifyPain": 1, "champion": 1}'::jsonb;
