-- Migration: GDPR Article 17 erasure audit log
-- Records erasure requests with a hashed user ID so we can prove deletion
-- without retaining PII.

CREATE TABLE IF NOT EXISTS public.erasure_audit_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_hash    text NOT NULL,           -- SHA-256 of user_id; not PII
  requested_at    timestamptz DEFAULT now() NOT NULL,
  completed_at    timestamptz,
  items_deleted   jsonb DEFAULT '{}',
  reference       text UNIQUE NOT NULL      -- returned to user as confirmation
);

-- No user-level RLS — this table is written by the gdpr-erasure Edge Function
-- using the service role key only. Users cannot read or modify their own records.
ALTER TABLE public.erasure_audit_log ENABLE ROW LEVEL SECURITY;
