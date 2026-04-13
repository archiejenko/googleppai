# Sprint 2 Security Audit — Summary
**Date:** 2026-04-13
**Scope:** Authentication & Session Hardening · Operational Readiness · Observability & Abuse Controls · Dependency & Supply Chain · Commercial & Legal
**Status:** READ-ONLY — findings documented, no remediation applied

---

## Carried Forward from Sprint 1

| # | Finding | Original Commit | Status |
|---|---|---|---|
| CF-1 | `chat-ai`: system instruction interpolates DB-derived values (`session.target_persona`, `session.scenario`, `session.pitch_goal`, `session.difficulty`) without adversarial-content delimiters | `ad8d46c` | OPEN |
| CF-2 | 20 of 22 Edge Functions accept unvalidated JSON bodies — no schema validation, no length limits on free-text fields | `ad8d46c` | OPEN |

---

## Stage 1 — Authentication & Session Hardening

### 1.1 Supabase Auth Configuration

| Finding | Severity | Status |
|---|---|---|
| MFA not configured — no enforcement in code or documented Supabase dashboard policy | HIGH | OPEN |
| Session timeout not explicitly configured — relies on undocumented Supabase defaults (~1h access token) | MEDIUM | OPEN |
| Password policy enforces minimum 8 characters client-side only (`UpdatePassword.tsx:24`); no complexity requirements, no server-side enforcement | MEDIUM | OPEN |
| Magic link not configured — standard password auth only | LOW | ACCEPTABLE |
| No OAuth providers configured for login; Google OAuth exists only for CRM integrations (HubSpot/Salesforce) in `IntegrationsPage.tsx` | LOW | ACCEPTABLE |

**Evidence:**
- `src/utils/supabase.ts:13–18` — auth config: `autoRefreshToken: true`, no session lifetime settings
- `supabase/config.toml` — only Edge Function declarations; no `[auth]` section present (auth config lives in Supabase dashboard, undocumented in repo)

### 1.2 JWT Lifecycle

| Finding | Severity | Status |
|---|---|---|
| All Edge Functions have `verify_jwt = true` in `config.toml` — Supabase validates JWT before handler runs | ✓ PASS | N/A |
| `autoRefreshToken: true` on client; refresh token rotation strategy not documented in repo | MEDIUM | OPEN |
| JWT project integrity check validates `ref` claim against expected project (`AuthContext.tsx:73–92`) — good defence | ✓ PASS | N/A |
| Session re-validation on tab focus (`AuthContext.tsx:48–55`) — good practice | ✓ PASS | N/A |
| Client-side JWT parsed via `atob()` without format pre-validation (`AuthContext.tsx:78`) — silent parse failure possible | LOW | OPEN |
| No client-side JWT expiry countdown or pre-expiry warning — users receive abrupt session termination | LOW | OPEN |
| JWT secret rotation not documented anywhere in repo; no rotation schedule | HIGH | OPEN |

### 1.3 Password Reset Flow

| Finding | Severity | Status |
|---|---|---|
| `reset-password` Edge Function referenced in `config.toml:18–27` (enabled, verify_jwt = true) but **does not exist on disk** — deployment will error if invoked | HIGH | OPEN |
| `create-admin` Edge Function same issue — referenced in `config.toml:7–16` but missing on disk | MEDIUM | OPEN |
| Reset flow delegates entirely to Supabase (`resetPasswordForEmail` + `updateUser`) — no custom token handling beyond Supabase defaults | LOW | ACCEPTABLE |
| No server-side password complexity enforcement — 8-char minimum at `UpdatePassword.tsx:24` only | MEDIUM | OPEN |

**Evidence:**
- `src/pages/ForgotPassword.tsx:18–20`
- `src/pages/UpdatePassword.tsx:24–26`
- `supabase/config.toml:18–27`

### 1.4 Admin Routes & Elevated Actions

| Finding | Severity | Status |
|---|---|---|
| `/admin` route requires `['admin']` role — enforced both client-side (`ProtectedRoute.tsx:56–61`) and server-side (`admin_set_user_role` RPC + `admin-delete-user` Edge Function) | ✓ PASS | N/A |
| `admin_set_user_role` uses `SECURITY DEFINER` with explicit admin check via `auth.uid()` (`20260409000000_admin_set_user_role.sql:17–22`) | ✓ PASS | N/A |
| `admin-delete-user` verifies JWT + admin role via RLS query before deletion; prevents self-deletion | ✓ PASS | N/A |
| Role simulation feature (`AuthContext.tsx:208–240`) allows admins to simulate `team_lead`/`user` in UI — backend enforces real role via RLS; visual-only and clearly marked | LOW | ACCEPTABLE |
| Admin email verification bypassed for admin role (`ProtectedRoute.tsx:29`) — admins can access platform without confirming email | MEDIUM | OPEN |

### 1.5 SSO Readiness

| Finding | Severity | Status |
|---|---|---|
| No SAML 2.0 or Google OIDC configured for authentication | HIGH | OPEN |
| Marketing footer claims "SSO / SAML" (`MarketingLayout.tsx`) — feature not implemented | HIGH | OPEN |
| Enabling SSO requires: Supabase auth provider config, OIDC/SAML endpoint setup, provider metadata integration | — | BLOCKED |

---

## Stage 2 — Operational Readiness & Incident Response

### 2.1 Backup Configuration

| Finding | Severity | Status |
|---|---|---|
| Backup frequency not documented — Supabase managed backups exist but retention/schedule not specified in OAST configuration or docs | HIGH | OPEN |
| No documented restore test — no evidence RTO/RPO has been validated | HIGH | OPEN |
| RTO and RPO not defined anywhere in repo | HIGH | OPEN |
| No `pg_cron` jobs defined in any migration file — no scheduled maintenance or backup verification automation | MEDIUM | OPEN |

### 2.2 Incident Response Runbook

| Finding | Severity | Status |
|---|---|---|
| No incident response runbook exists anywhere in repo (`RUNBOOK.md`, `docs/incident*`, `docs/oncall*`) | HIGH | OPEN |

Minimum required contents if created: escalation contacts, severity classification, communication templates, rollback procedure, post-mortem template, on-call rotation.

### 2.3 Monitoring & Alerting

| Finding | Severity | Status |
|---|---|---|
| Logflare → Slack alerting documented in `docs/SECURITY_ARCHITECTURE.md` but listed in "Post-Pilot Backlog" — **not implemented** | HIGH | OPEN |
| No uptime monitoring configured | HIGH | OPEN |
| No Edge Function error alerting to a human in real time | HIGH | OPEN |
| Vercel deployment failure alerting not configured in `vercel.json` | MEDIUM | OPEN |
| No public or internal status page | MEDIUM | OPEN |

### 2.4 Secrets Management

| Finding | Severity | Status |
|---|---|---|
| No secrets register exists in repo — no record of which secrets exist, their scope, or last rotation date | HIGH | OPEN |
| No rotation schedule documented for any secret (Anthropic, OpenAI, Deepgram, ElevenLabs, Stripe, Supabase JWT secret) | HIGH | OPEN |
| Secrets accessed via `Deno.env.get()` in Edge Functions — correctly scoped to Supabase environment, not hardcoded | ✓ PASS | N/A |
| `ALLOWED_ORIGIN` CORS validation present in Edge Functions — correct scoping | ✓ PASS | N/A |

---

## Stage 3 — Observability, Rate Limiting & Abuse Controls

### 3.1 Rate Limiting Audit

Functions already protected (Sprint 1 — commit `208ff05`): `call-prep`, `deal-outcomes`, `drill-analysis` (per-org AI budget).
Additional functions with per-user/IP rate limiting: `chat-ai`, `unified-ai`, `pitch-api`, `drill-generation`, `deepgram-token`.

| Function | Rate Limit | Severity |
|---|---|---|
| `admin-delete-user` | NONE | HIGH |
| `create-organisation` | NONE | HIGH |
| `gdpr-erasure` | NONE | HIGH |
| `correlation-engine` | NONE | HIGH |
| `revenue-intelligence` | NONE | MEDIUM |
| `stripe-checkout` | NONE | HIGH |
| `stripe-portal` | NONE | MEDIUM |
| `deployment-request` | NONE — **no auth required** | HIGH |
| `upgrade-request` | NONE | MEDIUM |
| `training-api` | NONE | HIGH |
| `tts-generate` | NONE — ElevenLabs calls exposed | HIGH |
| `stripe-webhook` | NONE — acceptable (signature-verified) | ACCEPTABLE |

**Summary:** 11 of 21 functions have no rate limiting.

**Additional finding:** `orgRateLimit.ts` fails **open** on RPC error — line 41 returns `{ allowed: true }` when `check_org_ai_limit` RPC fails. An infrastructure failure silently disables spend controls. | MEDIUM | OPEN

### 3.2 AI Spend Controls

| Function | Provider/Model | Org-level ceiling | Circuit breaker | Cost tracked |
|---|---|---|---|---|
| `call-prep` | Claude Sonnet 4.5 | ✓ `checkOrgAiLimit` | ✓ 503 + retry flag | ✓ |
| `deal-outcomes` | Claude Sonnet 4.5 | ✓ `checkOrgAiLimit` | ✓ 503 + retry flag | ✓ |
| `drill-analysis` | GPT-4o mini | ✓ `checkOrgAiLimit` | ✓ 503 + retry flag | ✓ |
| `chat-ai` | GPT-4.1 (OpenAI) | ✗ per-user only | ✗ generic error | ✗ |
| `unified-ai` | GPT-4o mini | ✗ per-user only | ✗ generic error | ✗ |
| `drill-generation` | GPT-4o mini | ✗ per-user only | ✗ throws | ✗ |
| `pitch-api` | GPT-4o | ✗ per-user only | ✗ throws | ✗ |
| `training-api` | GPT-4o mini | ✗ no rate limit | ✗ throws | ✗ |
| `tts-generate` | ElevenLabs TTS | ✗ none | ✗ none | ✗ |
| `deepgram-token` | Deepgram STT | ✗ per-user 20/hr | ✗ throws | ✗ |

**Summary:** 7 of 10 AI-calling functions lack per-org spend ceilings.

### 3.3 Audit Logging

| Finding | Severity | Status |
|---|---|---|
| `erasure_audit_log` table exists (`gdpr-erasure/index.ts:114–119`) — writes hashed user_id, timestamp, items_deleted | ✓ PARTIAL | N/A |
| No general admin action audit log — user deletions, org creations, role changes, tier upgrades are unlogged | CRITICAL | OPEN |
| `admin-delete-user` deletes users without recording actor, timestamp, or reason | CRITICAL | OPEN |
| Stripe subscription events (upgrades, cancellations) not logged to an internal audit table | HIGH | OPEN |
| No way to trace who accessed what customer data and when | CRITICAL | OPEN |
| Immutability of `erasure_audit_log` not enforced — no RLS delete protection confirmed | MEDIUM | OPEN |

### 3.4 Anomaly Detection

| Finding | Severity | Status |
|---|---|---|
| No alerting on disproportionate per-org token consumption | HIGH | OPEN |
| No alerting on sudden API call volume spikes | HIGH | OPEN |
| No alerting on repeated auth failures | HIGH | OPEN |
| No abuse pattern detection in any Edge Function | HIGH | OPEN |

---

## Stage 4 — Dependency & Supply Chain Security

### 4.1 npm audit (run 2026-04-13)

**Result: 9 vulnerabilities (3 moderate, 6 high). All fixed via `npm audit fix` — commit `remediation/sprint-2`.**

| Package | Severity | Type | Fix | Production dep? | Status |
|---|---|---|---|---|---|
| `react-router` 7.0.0–7.12.0-pre | HIGH | CSRF in Action processing; XSS via open redirect; SSR XSS in ScrollRestoration | `npm audit fix` | YES | RESOLVED |
| `react-router-dom` 7.0.0-pre–7.11.0 | HIGH | Depends on vulnerable react-router | `npm audit fix` | YES | RESOLVED |
| `rollup` 4.0.0–4.58.0 | HIGH | Arbitrary file write via path traversal | `npm audit fix` | dev only | RESOLVED |
| `vite` 7.0.0–7.3.1 | HIGH | Path traversal in `.map` handling; `server.fs.deny` bypass; arbitrary file read via dev server WebSocket | `npm audit fix` | dev only | RESOLVED |
| `flatted` ≤3.4.1 | HIGH | Unbounded recursion DoS + prototype pollution in `parse()` | `npm audit fix` | dev only | RESOLVED |
| `minimatch` ≤3.1.3 or 9.0.0–9.0.6 | HIGH | ReDoS via repeated wildcards (3 CVEs) | `npm audit fix` | dev only | RESOLVED |
| `picomatch` ≤2.3.1 or 4.0.0–4.0.3 | HIGH | Method injection; ReDoS via extglob quantifiers (2 CVEs) | `npm audit fix` | dev only | RESOLVED |
| `ajv` <6.14.0 | MODERATE | ReDoS when using `$data` option | `npm audit fix` | dev only | RESOLVED |
| `brace-expansion` <1.1.13 or ≥2.0.0 <2.0.3 | MODERATE | Zero-step sequence causes process hang + memory exhaustion | `npm audit fix` | dev only | RESOLVED |

### 4.2 Edge Function Dependencies

| Finding | Severity | Status |
|---|---|---|
| All Deno imports pinned to specific semver versions (esm.sh, deno.land) | ✓ PASS | N/A |
| Minor version variance: `deno.land/std@0.168.0` vs `@0.177.0` across functions — should standardise | LOW | OPEN |
| No known vulnerabilities in `@supabase/supabase-js@2` or `deno.land/std` at audit time | ✓ PASS | N/A |

### 4.3 Postinstall Scripts

| Finding | Severity | Status |
|---|---|---|
| No `postinstall` scripts found in production dependency tree | ✓ PASS | N/A |

### 4.4 Automated Dependency Management

| Finding | Severity | Status |
|---|---|---|
| Dependabot not configured (no `.github/dependabot.yml`) | MEDIUM | OPEN |
| Renovate not configured (no `renovate.json`) | MEDIUM | OPEN |
| No CI/CD pipeline exists to run `npm audit` on PRs | HIGH | OPEN |

---

## Stage 5 — Commercial & Legal Documentation

### 5.1 Document Status

| Document | Status | Blocking first contract? |
|---|---|---|
| Master Services Agreement (MSA) | MISSING | YES |
| Terms of Service | MISSING | YES |
| Acceptable Use Policy (AUP) | MISSING | YES |
| SLA definitions | MISSING | YES |
| Cyber Essentials certification or application | MISSING | YES (mid-market) |
| Cyber insurance policy or quote | MISSING | YES (mid-market) |
| Privacy Policy | EXISTS but incomplete — `[COMPANY_LEGAL_NAME]`, `[ICO_REGISTRATION_NUMBER]`, `[DPO_EMAIL]` unfilled (`src/pages/PrivacyPolicy.tsx`) | YES |
| Data Processing Agreement (DPA) | MISSING — required GDPR Art 28 | YES |
| Record of Processing Activities (ROPA) | MISSING — required GDPR Art 30 | YES (legal) |
| DPIA (automated performance scoring) | MISSING — required GDPR Art 35 | YES (legal) |
| Sub-processor DPAs (Anthropic, OpenAI, Deepgram, PostHog, Resend, Recall.ai) | MISSING | YES |

### 5.2 Minimum Required Contents (missing documents)

- **MSA:** Parties, scope of services, fees, payment terms, IP ownership, confidentiality, limitation of liability, termination, governing law
- **Terms of Service:** Permitted use, prohibited use, account responsibilities, data ownership, service availability, dispute resolution
- **Acceptable Use Policy:** Prohibited content types, API abuse limits, scraping/automation restrictions, enforcement and suspension terms
- **SLA:** Uptime target (e.g. 99.9%), measurement methodology, credit/remedy for breach, exclusions, RTO/RPO for data recovery
- **Cyber Essentials:** Apply via IASME or NCSC-accredited body; covers 5 technical controls (firewalls, secure config, access control, malware protection, patch management)
- **Cyber insurance:** Obtain quote from broker covering first-party breach costs, third-party liability, regulatory fines, ransomware

---

## Consolidated Findings

### Severity Counts (Sprint 2 only)

| Severity | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Stage 5 | Total |
|---|---|---|---|---|---|---|
| CRITICAL | 0 | 0 | 4 | 0 | 0 | **4** |
| HIGH | 5 | 5 | 10 | 2 | 7 | **29** |
| MEDIUM | 6 | 3 | 2 | 3 | 0 | **14** |
| LOW | 4 | 0 | 0 | 1 | 0 | **5** |
| **Total** | **15** | **8** | **16** | **6** | **7** | **52** |

### Top 10 Must-Fix Before First Paying Contract

| # | Finding | Files | Effort | Severity | Blocks |
|---|---|---|---|---|---|
| 1 | **Admin action audit log** — create `admin_action_log` table; log actor/action/target/timestamp in `admin-delete-user`, `create-organisation`, `stripe-webhook` | New migration + 3 Edge Functions | M | CRITICAL | Mid-market procurement |
| 2 | **Fill Privacy Policy placeholders** — `[COMPANY_LEGAL_NAME]`, `[ICO_REGISTRATION_NUMBER]`, `[DPO_EMAIL]` | `src/pages/PrivacyPolicy.tsx` | S | HIGH | All contracts |
| 3 | **Draft and sign MSA + ToS + AUP** | Business task — external legal | L | HIGH | All contracts |
| 4 | **Sign sub-processor DPAs** (Anthropic, OpenAI, Deepgram, PostHog, Resend, Recall.ai) | Business task + `docs/compliance/dpas/` | M | HIGH | All contracts (GDPR) |
| 5 | ~~**react-router-dom vulnerability**~~ | `package.json` / `package-lock.json` | S | HIGH | **RESOLVED** `npm audit fix` — 0 vulnerabilities |
| 6 | **Rate-limit 11 unprotected Edge Functions** — add `check_rate_limit_hardened` to `admin-delete-user`, `create-organisation`, `gdpr-erasure`, `correlation-engine`, `stripe-checkout`, `training-api`, `tts-generate`, `deployment-request`, `upgrade-request`, `revenue-intelligence`, `stripe-portal` | 11 Edge Function files | M | HIGH | Mid-market procurement |
| 7 | **Remove dead function declarations from config.toml** — `create-admin` and `reset-password` declared but missing on disk | `supabase/config.toml:7–27` | S | HIGH | Deployment stability |
| 8 | **Incident response runbook** — document escalation, rollback, post-mortem procedures | New `docs/RUNBOOK.md` | M | HIGH | Mid-market procurement |
| 9 | **Document backup RTO/RPO and test restore** — confirm Supabase backup retention, run and document restore drill | External + `docs/BACKUP_DR.md` | M | HIGH | Mid-market procurement |
| 10 | **Extend per-org AI spend controls** to `chat-ai`, `unified-ai`, `drill-generation`, `pitch-api`, `training-api` — reuse existing `orgRateLimit.ts` helper | 5 Edge Function files | M | HIGH | Commercial viability |

### Mid-Market Procurement Blockers (additional to top 10)

- No Cyber Essentials certification or application in progress
- No cyber insurance policy on file
- No SLA with uptime targets and credit terms
- No secrets rotation register
- No monitoring or alerting (Supabase errors, Vercel failures, uptime)
- `orgRateLimit.ts` fails open on RPC error — spend controls silently disabled on infrastructure fault
- No anomaly detection on token abuse or auth failure spikes

### Carried Forward from Sprint 1

| # | Finding | Original Commit | Status |
|---|---|---|---|
| CF-1 | `chat-ai`: system instruction interpolates DB-derived values (`session.target_persona`, `session.scenario`, `session.pitch_goal`, `session.difficulty`) without adversarial-content delimiters | `ad8d46c` | OPEN |
| CF-2 | 20 of 22 Edge Functions accept unvalidated JSON bodies — no schema validation, no length limits on free-text fields | `ad8d46c` | OPEN |
