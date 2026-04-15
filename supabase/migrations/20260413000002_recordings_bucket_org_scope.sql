-- Migration: Scope recordings bucket to org_id path prefix
--
-- Previous policies allowed any authenticated user to read or write any path
-- in the recordings bucket, enabling cross-org access to session recordings.
--
-- New path structure: {org_id}/sessions/{session_id}.webm
-- The first folder segment is enforced to equal the caller's org_id via
-- public.user_org_id() (defined in 20260412000002_rls_policies.sql).
--
-- Client upload and erasure paths were updated atomically with this migration.
-- Legacy paths (sessions/{id}.webm) remain in storage but are no longer
-- accessible or writable via authenticated policies; service-role erasure
-- handles both formats for historical cleanup.

-- ── Drop permissive policies ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "recordings_insert" ON storage.objects;
DROP POLICY IF EXISTS "recordings_select" ON storage.objects;

-- ── INSERT: only upload under your own org's prefix ──────────────────────────
-- Path must be {org_id}/... where org_id matches the caller's organisation.

CREATE POLICY "recordings_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = public.user_org_id()::text
  );

-- ── SELECT (signed URL generation): org members only ─────────────────────────
-- Prevents users in other orgs from generating signed URLs for recordings
-- they do not own.

CREATE POLICY "recordings_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = public.user_org_id()::text
  );

-- ── UPDATE: org members only (e.g. upsert on re-upload) ──────────────────────

DROP POLICY IF EXISTS "recordings_update" ON storage.objects;
CREATE POLICY "recordings_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = public.user_org_id()::text
  )
  WITH CHECK (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[1] = public.user_org_id()::text
  );

-- DELETE is service-role only (gdpr-erasure handles deletion; no client policy).
