# Sprint 1 Security Audit — Executive Summary
**Date:** 2026-04-13  
**Scope:** Tenant isolation · Data protection documentation · AI prompt injection  
**Status:** REMEDIATION COMPLETE — five stages resolved, two findings open

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

## Remediation Status

| Stage | Scope | Commit | Status |
|---|---|---|---|
| Stage 1 | drill-generation org_id forgery; upgrade-request missing org_id insert | `535977d` | RESOLVED |
| Stage 2 | RLS on 6 missing tables; revenue-intelligence unconditional org_id scoping | `77a537f` | RESOLVED |
| Stage 3 | recordings bucket policy; org-prefixed upload/retrieval paths; GDPR erasure dual-path deletion | `7cc9c19` | RESOLVED |
| Stage 4 | Prompt injection XML delimiters in deal-outcomes, chat-ai, drill-analysis | `ad8d46c` | RESOLVED |
| Stage 5 | Per-org AI rate limits (org_ai_limits + org_ai_usage tables, check_org_ai_limit RPC, shared helper, call-prep / deal-outcomes / drill-analysis gated) | `208ff05` | RESOLVED |

### Open findings (not resolved in Sprint 1)

1. **chat-ai: system instruction interpolates DB-derived values** — `session.target_persona`, `session.scenario`, `session.pitch_goal`, and `session.difficulty` are fetched from the database (originally derived from AI generation over user context) and interpolated directly into the system prompt without delimiters. Flagged in commit `ad8d46c`. Requires a dedicated fix assessing whether those fields can contain adversarial content.

2. **20 of 22 Edge Functions accept unvalidated JSON bodies** — no schema validation (zod etc.) on POST body fields; no length limits on free-text inputs (`text`, `prospect_company`, `deal_name`, `notes`). Not in scope for Sprint 1. Tracked in Secondary Backlog.

---

## Top 10 Must-Fix Before First Paying Contract

| # | Finding | File(s) | Effort | Severity | Status |
|---|---|---|---|---|---|
| 1 | **Add RLS to 6 tables** (`coaching_triggers`, `training_attempts`, `objection_entries`, `missed_opportunities`, `competitor_profiles`, `business_synergies`) | New migration | M | CRITICAL | **RESOLVED** `77a537f` |
| 2 | **Fix drill-generation: org_id from request body** | `supabase/functions/drill-generation/index.ts` | S | CRITICAL | **RESOLVED** `535977d` |
| 3 | **Fix upgrade-request: insert org_id** | `supabase/functions/upgrade-request/index.ts` | S | CRITICAL | **RESOLVED** `535977d` |
| 4 | **Add prompt injection delimiters** — deal-outcomes, chat-ai, drill-analysis | 3 Edge Function files | S | HIGH | **RESOLVED** `ad8d46c` |
| 5 | **Add rate limits to call-prep, deal-outcomes, drill-analysis** | 3 Edge Function files + migration | S | MEDIUM | **RESOLVED** `208ff05` |
| 6 | **Fix recordings storage bucket policies** | New RLS policy migration + path fix | S | HIGH | **RESOLVED** `7cc9c19` |
| 7 | **Fill privacy policy legal placeholders** (Tom) | `src/pages/PrivacyPolicy.tsx` | S | MEDIUM | OPEN |
| 8 | **Sign and file DPAs for Deepgram, Anthropic, OpenAI, PostHog, Resend, Recall.ai** | Business task + `docs/compliance/dpas/` | M | HIGH | OPEN |
| 9 | **Draft ROPA (GDPR Article 30)** | New document | M | CRITICAL (legal) | OPEN |
| 10 | **Resolve objection_entries semantic search** — dead code referencing non-existent `embed-query` function and `search_objections` RPC | `src/hooks/useObjectionLibrary.ts`; new Edge Function + migration | L | HIGH | OPEN |

---

## Secondary Backlog (Post-Contract)

- DPIA for automated employee performance analysis (GDPR Article 35)
- Fix correlation-engine service-to-service auth (substring match → constant-time equality or JWT claim)
- Add explicit org_id double-check in call-prep, pitch-api, training-api, drill-analysis (defense in depth)
- **Add zod/schema validation to all 20 unvalidated Edge Functions** (open finding #2 above)
- **Fix chat-ai system instruction DB interpolation** (open finding #1 above)
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
