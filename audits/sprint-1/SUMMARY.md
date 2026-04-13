# Sprint 1 Security Audit — Executive Summary
**Date:** 2026-04-13  
**Scope:** Tenant isolation · Data protection documentation · AI prompt injection  
**Status:** FINDINGS ONLY — stop here, await remediation approval

---

## Finding Counts

| Severity | Tenant Isolation | Data Protection | AI Security | Total |
|---|---|---|---|---|
| CRITICAL | 8 | 0 | 0 | **8** |
| HIGH | 3 | 6 | 3 | **12** |
| MEDIUM | 5 | 3 | 8 | **16** |
| LOW | 0 | 1 | 2 | **3** |
| **Total** | **16** | **10** | **13** | **39** |

---

## Top 10 Must-Fix Before First Paying Contract

| # | Finding | File(s) | Effort | Severity |
|---|---|---|---|---|
| 1 | **Add RLS to 6 tables** (`coaching_triggers`, `training_attempts`, `objection_entries`, `missed_opportunities`, `competitor_profiles`, `business_synergies`) — currently any authenticated user can read/write cross-org data | New migration | M | CRITICAL |
| 2 | **Fix drill-generation: org_id from request body** — attacker with any valid JWT can forge org_id and target reps in other organisations | `supabase/functions/drill-generation/index.ts:99` | S | CRITICAL |
| 3 | **Fix upgrade-request: insert org_id** — missing NOT NULL FK field causes constraint violation; leaves orphaned rows if constraint is relaxed | `supabase/functions/upgrade-request/index.ts:27` | S | CRITICAL |
| 4 | **Add prompt injection delimiters** — wrap user content in XML tags (`<user_input>...</user_input>`) in deal-outcomes, chat-ai, drill-analysis, call-prep, pitch-api, training-api | 6 Edge Function files | S | HIGH |
| 5 | **Add rate limits to call-prep, deal-outcomes, drill-analysis** — no cost cap on Anthropic and OpenAI calls; unbounded spend possible | 3 Edge Function files | S | MEDIUM |
| 6 | **Fix recordings storage bucket policies** — any authenticated user can read and upload to any session recording path | New RLS policy migration | S | HIGH |
| 7 | **Fill privacy policy legal placeholders** — `[COMPANY_LEGAL_NAME]`, `[ICO_REGISTRATION_NUMBER]`, `[DPO_EMAIL]` must be completed before customer-facing deployment (Tom) | `src/pages/PrivacyPolicy.tsx` | S | MEDIUM |
| 8 | **Sign and file DPAs for Deepgram, Anthropic, OpenAI, PostHog, Resend, Recall.ai** — active sub-processors with no signed DPA on file; GDPR Article 28 violation | Business task + `docs/compliance/dpas/` | M | HIGH |
| 9 | **Draft ROPA (GDPR Article 30)** — not yet created; required for automated employee performance processing | New document | M | CRITICAL (legal) |
| 10 | **Resolve objection_entries semantic search** — dead code referencing non-existent `embed-query` function and `search_objections` RPC; `objection_entries` table has no RLS. Either implement with org_id filter or remove | `src/hooks/useObjectionLibrary.ts`; new Edge Function + migration | L | HIGH |

---

## Secondary Backlog (Post-Contract)

- DPIA for automated employee performance analysis (GDPR Article 35)
- Fix correlation-engine service-to-service auth (substring match → constant-time equality or JWT claim)
- Add explicit org_id double-check in call-prep, pitch-api, training-api, drill-analysis (defense in depth)
- Add zod/schema validation to all 20 unvalidated Edge Functions
- Lock Vercel deployment regions to EU (`cdg1`, `dub1`, `fra1`) for data residency
- Confirm Deepgram consent gate is enforced in UI before token issuance
- Extract sub-processor list and retention policy as standalone customer-facing documents

---

## Audit File Index

| File | Contents |
|---|---|
| `audits/sprint-1/tenant-isolation.md` | Edge Functions (22), RLS table coverage, storage bucket policies, pgvector |
| `audits/sprint-1/data-protection.md` | GDPR artifacts, DPA status, sub-processors, data residency |
| `audits/sprint-1/ai-security.md` | Prompt injection surface, rate limits, input validation, output handling |
| `audits/sprint-1/SUMMARY.md` | This file |
