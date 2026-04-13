# Tenant Isolation Audit — Sprint 1
**Date:** 2026-04-13  
**Auditor:** Automated security audit (read-only)  
**Status:** FINDINGS ONLY — awaiting remediation approval

---

## 1. Edge Functions (22 audited)

### 1.1 Authentication & org_id Source

| Function | Key Used | org_id Source | Flag |
|---|---|---|---|
| admin-delete-user | ANON + JWT | JWT user.id, admin role verified | PASS |
| call-prep | SERVICE_ROLE | user_id from JWT; no explicit org_id lookup | WARN |
| chat-ai | ANON + JWT | user_id for session; rate limit by user/IP | PASS |
| correlation-engine | SERVICE_ROLE | team_id via DB lookup from rep_id | WARN |
| create-organisation | SERVICE_ROLE + ANON | JWT user.id — creates org, user added via service role | PASS |
| deal-outcomes | SERVICE_ROLE | org_id from profiles.org_id lookup | PASS |
| deepgram-token | ANON + JWT | user_id for rate limit only | PASS |
| deployment-request | SERVICE_ROLE | No tenant data; public intake form | PASS |
| drill-analysis | SERVICE_ROLE | user_id from JWT; no org_id check | WARN |
| drill-generation | SERVICE_ROLE | **org_id from REQUEST BODY** | **CRITICAL** |
| gdpr-erasure | ANON + JWT | user_id from JWT | PASS |
| pitch-api | ANON + JWT | user_id from JWT; no org_id check | WARN |
| revenue-intelligence | SERVICE_ROLE | org_id from profiles.org_id | PASS |
| stripe-checkout | SERVICE_ROLE | org_id from profiles + organisations | PASS |
| stripe-portal | SERVICE_ROLE | org_id from organisations.stripe_customer_id | PASS |
| stripe-webhook | SERVICE_ROLE | org_id from Stripe metadata + customer lookup | PASS |
| training-api | ANON + JWT | user_id from JWT; no org_id check | WARN |
| tts-generate | ANON + JWT | user_id for rate limit only | PASS |
| unified-ai | ANON + JWT | user_id for session lookup + rate limit | PASS |
| upgrade-request | SERVICE_ROLE + ANON | org_id NOT inserted (missing from insert) | **CRITICAL** |

### 1.2 Critical Edge Function Issues

#### CRITICAL-1: drill-generation — org_id from request body
**File:** `supabase/functions/drill-generation/index.ts:99-101`
```typescript
const { rep_id, org_id, trigger_id, skill_key: bodySkillKey, difficulty_override } = await req.json()
if (!rep_id || !org_id) {
  return new Response(JSON.stringify({ error: 'rep_id and org_id are required' }), { status: 400 })
}
```
**Risk:** Authenticated user can supply any `org_id`. No verification that the JWT user belongs to the supplied org. An attacker with a valid JWT for Org A can generate drills targeting reps in Org B.

**Required fix:** Look up `org_id` from `profiles` table using `auth.uid()`. Verify that `rep_id` belongs to the same org.

---

#### CRITICAL-2: upgrade-request — org_id not inserted
**File:** `supabase/functions/upgrade-request/index.ts:27-33`
```typescript
const { error } = await supabase.from('upgrade_requests').insert({
  user_id: user.id,
  requested_tier: requested_tier ?? 'revenue_intelligence',
  message: message ?? null,
  seats: seats ?? 1,
  status: 'pending',
});
```
**Schema (migration 001):** `upgrade_requests.org_id` is `NOT NULL` with FK to `organisations`. Insert omits `org_id` → database constraint violation. If the constraint has been relaxed in practice, rows exist without org association (RLS policy becomes unenforced).

**Required fix:** Fetch `org_id` from `profiles.org_id` using `user.id` before insert.

---

#### WARNING-3: correlation-engine — weak service-to-service auth
**File:** `supabase/functions/correlation-engine/index.ts:402-410`
```typescript
const authHeader = req.headers.get('Authorization') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
if (!authHeader.includes(serviceKey) && serviceKey !== '') {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
}
```
**Risk:** `includes()` substring match — any token containing the service key as a substring passes. Also transmits the service role key over HTTP headers. Correct approach: JWT verification with a dedicated service claim, or a shared webhook secret compared with constant-time equality.

---

#### WARNING-4: call-prep, pitch-api, training-api, drill-analysis — service role without org_id validation
**Files:**
- `supabase/functions/call-prep/index.ts:37-44`
- `supabase/functions/pitch-api/index.ts:172-188`
- `supabase/functions/training-api/index.ts:83-102`
- `supabase/functions/drill-analysis/index.ts:80-92`

All four use SERVICE_ROLE to write to core tables (`call_prep_briefs`, `pitches`, `dispatched_drills`) scoped only by `user_id`. No app-layer `org_id` double-check. Protection currently relies entirely on RLS policies. Defense-in-depth requires the application layer to also validate org membership.

---

## 2. RLS Policies

### 2.1 Tables with RLS ENABLED

| Table | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Notes |
|---|---|---|---|---|---|
| profiles | Self OR org manager | Via trigger | Self only | N/A | PASS |
| organisations | Org members | Service role | Admin only | N/A | PASS |
| pitches | User OR org manager | User (user_id = uid()) | User only | User only | PASS |
| training_sessions | User OR org manager | User only | User only | User only | PASS |
| deal_outcomes | User OR org manager | User + org check | User only | User only | PASS |
| dispatched_drills | User only | User only | User only | User only | PASS |
| live_scores | Rep OR org manager | Service role | Service role | Service role | PASS |
| leaderboard_snapshots | Org members | Service role | Service role | Service role | PASS |
| rep_correlation_snapshots | User OR org manager | Service role | Service role | Service role | PASS |
| prospect_profiles | Org members | Org members | Org members | Managers only | PASS |
| upgrade_requests | User OR org manager | User + org check | N/A | Managers only | PASS (if org_id populated) |
| call_consent_log | User OR org managers | User only | N/A | N/A | PASS |
| deployment_requests | Service role only | Service role only | N/A | N/A | PASS |
| erasure_audit_log | Service role only | Service role only | N/A | N/A | PASS |

**Source:** `supabase/migrations/20260412000002_rls_policies.sql`

### 2.2 Tables with RLS DISABLED — CRITICAL

The following tables are queried by Edge Functions and/or client code but have **no RLS migration**:

| Table | Used By | Risk |
|---|---|---|
| **coaching_triggers** | `drill-generation/index.ts:115-119` | Any user can read/write triggers for any org |
| **training_attempts** | `correlation-engine/index.ts:371-375` | Any user can read attempts across all orgs |
| **objection_entries** | `src/hooks/useObjectionLibrary.ts:56` | Semantic search crosses org boundary |
| **missed_opportunities** | `revenue-intelligence/index.ts:72-78` | Revenue data readable across orgs |
| **competitor_profiles** | `revenue-intelligence/index.ts:121-125` | Competitor intel readable across orgs |
| **business_synergies** | `revenue-intelligence/index.ts:134-138` | Strategic data readable across orgs |

**Required fix for each:** `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` plus org_id-scoped policies in a new migration.

---

## 3. Supabase Storage Buckets

### 3.1 Bucket Overview

| Bucket | Visibility | Path Scheme | Org Isolation |
|---|---|---|---|
| avatars | Private | `{user_id}.{ext}` | User-scoped — PASS |
| pitch-recordings | Private | `{user_id}/pitch-{timestamp}.webm` | User-scoped — PASS |
| recordings | Private | `sessions/{session_id}.webm` | **FAIL — see below** |

**Source:** `supabase/migrations/20260412000003_storage_policies.sql` (or equivalent)

### 3.2 CRITICAL: recordings bucket over-permissive

**INSERT policy (line ~63):**
```sql
CREATE POLICY "recordings_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recordings');
```
Any authenticated user from any org can upload to any session path.

**SELECT policy (line ~70):**
```sql
CREATE POLICY "recordings_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'recordings');
```
Any authenticated user from any org can download any session recording.

**Risk:** User in Org A can read and overwrite session recordings belonging to Org B.

**Required fix:** Add session ownership check — helper function `session_org_id(uuid)` that returns `org_id` from `training_sessions`, used in policy `USING` clause.

---

## 4. pgvector / Semantic Search

### 4.1 Current State

**Client hook:** `src/hooks/useObjectionLibrary.ts:52-61`
```typescript
const embedding = await getEmbedding(debouncedQuery)
const { data, error } = await supabase.rpc('search_objections', {
  query_embedding: embedding,
  match_user_id: userId,
  match_team_id: viewMode === 'team' ? (teamId || null) : null,
  match_count: 30,
})
```

**Findings:**
- `embed-query` Edge Function (called at line 22) does **not exist** in `supabase/functions/`
- `search_objections` RPC does **not exist** in any migration
- `objection_entries` table has **no RLS**

**Risk:** Feature is dead code today, but if the `search_objections` RPC is created without `WHERE org_id = auth.user_org_id()`, semantic search will return results across all organisations.

**Required action:** Either implement with correct org_id filter, or remove the dead code.

---

## 5. Finding Summary

| Severity | Count | Items |
|---|---|---|
| CRITICAL | 8 | drill-generation org_id from body; upgrade-request missing org_id; 6 tables with no RLS |
| HIGH | 3 | recordings bucket any-user read/write; semantic search unfiltered (if implemented); objection_entries no RLS |
| MEDIUM | 5 | correlation-engine weak service auth; call-prep/pitch-api/training-api/drill-analysis no app-layer org_id |
| LOW | 0 | — |

**Total findings: 16**
