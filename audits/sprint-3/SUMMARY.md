# Sprint 3 Security Audit — OAST by EJTECH Ltd

**Date:** 2026-04-13  
**Supabase project:** `rywcwxsohjnfalrpjhfk`  
**Auditor:** Claude Code (automated static analysis + configuration review)  
**Scope:** Infrastructure hardening, OWASP Top 10, load resilience plan, client-side security, open items remediation plans

---

## Carried Forward — Open Items from Sprints 1 & 2

| # | Finding | Severity | Sprint | Commit/Ref | Status |
|---|---------|----------|--------|------------|--------|
| CF-1 | `chat-ai` system instruction interpolates DB-derived values (`session.target_persona`, `session.scenario`, `session.pitch_goal`, `session.difficulty`) without sanitisation | HIGH | Sprint 1 | ad8d46c | OPEN |
| CF-2 | 20 of 22 Edge Functions accept unvalidated JSON bodies | MEDIUM | Sprint 1 | — | OPEN |
| CF-3 | `orgRateLimit.ts` fails open on RPC error | MEDIUM | Sprint 2 | — | OPEN |
| CF-4 | Per-org AI spend controls missing on 5 remaining Edge Functions | HIGH | Sprint 2 | — | OPEN (4 confirmed: `chat-ai`, `pitch-api`, `training-api`, `unified-ai`) |

---

## Stage 1 — Network & Infrastructure Hardening

### 1.1 HTTP Security Headers (Vercel — `vercel.json`)

| Header | Status | Detail |
|--------|--------|--------|
| Content-Security-Policy | MISCONFIGURED | Present but `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` negate XSS protection. `connect-src` includes Supabase and Deepgram domains (correct). Missing `font-src` directive for Google Fonts (fonts.gstatic.com currently unconstrained). |
| Strict-Transport-Security | PRESENT | `max-age=63072000; includeSubDomains` (2 years, subdomains). **Missing `preload`** — not eligible for browser HSTS preload list without it. |
| X-Frame-Options | PRESENT | `DENY` — correct. |
| X-Content-Type-Options | PRESENT | `nosniff` — correct. |
| Referrer-Policy | PRESENT | `strict-origin-when-cross-origin` — correct. |
| Permissions-Policy | PRESENT | `camera=(), microphone=(self), geolocation=()`. `microphone=(self)` is overly broad; should be scoped to the live-call path only. Low risk given SPA routing. |

**Findings:**

| Finding | Severity | Status |
|---------|----------|--------|
| CSP uses `unsafe-inline` for `script-src` and `style-src` — XSS protection negated | HIGH | OPEN |
| HSTS missing `preload` directive — not on browser preload list | LOW | OPEN |
| CSP `font-src` not scoped — Google Fonts fallback unconstrained | LOW | OPEN |

### 1.2 CORS Policy Audit

All 20 production Edge Functions import `getCorsHeaders` from `_shared/cors.ts`. All handle `OPTIONS` preflight. The shared module requires `ALLOWED_ORIGIN` to be set as an env var and throws a hard error if absent — no wildcard `*` fallback.

**Bug identified in `cors.ts` line 24:**
```ts
// Actual code:
const origin = requestOrigin === allowedOrigin ? allowedOrigin : allowedOrigin
// Both branches return allowedOrigin — the ternary is tautological.
```
The intent (only reflect the origin back if it matches) is correct, but the implementation always emits `allowedOrigin` regardless of the requesting origin. Browsers correctly reject mismatched origins via their CORS enforcement, so no cross-origin data access is possible in practice, but any origin receives a valid `Access-Control-Allow-Origin` header in the response. This could mislead server-side CORS log analysis.

| Finding | Severity | Status |
|---------|----------|--------|
| CORS `getCorsHeaders` tautological ternary — always emits allowedOrigin regardless of request origin | LOW | OPEN |
| All functions handle OPTIONS preflight correctly | — | PASS |
| No wildcard `*` CORS fallback present | — | PASS |

### 1.3 Vercel Environment Isolation

Findings are based on `vercel.json` and project configuration. No Vercel project dashboard access was available.

| Finding | Severity | Status |
|---------|----------|--------|
| No separate staging environment configured — single `vercel.json` with one header rule, no environment-scoped overrides visible | MEDIUM | OPEN |
| Vercel preview deployments are publicly accessible without authentication by default. No evidence of Vercel deployment protection (password or Vercel SSO) on preview URLs. | MEDIUM | OPEN |
| Preview deployments on free/pro Vercel inherit production environment variables unless `scope` is set per-variable in the Vercel dashboard — this cannot be confirmed from source alone | MEDIUM | OPEN — verify in Vercel dashboard |

### 1.4 Supabase Public Endpoints

| Finding | Severity | Status |
|---------|----------|--------|
| Anon key (`VITE_SUPABASE_ANON_KEY`) is in the client bundle by design — all anon-accessible tables must have RLS. Sprint 1 hardened RLS; no new gaps identified in this sprint. | — | NOTE |
| IP allowlisting for Supabase API is not available on the free tier — database is reachable from any IP with valid credentials | TIER LIMITATION | — |
| Network restrictions / egress filtering not configurable on free tier | TIER LIMITATION | — |
| Free tier unlocks (Supabase Pro, $25/month): IP allowlisting, network restrictions, dedicated connection pooler configuration | — | NOTE |

---

## Stage 2 — OWASP Top 10 Surface Review

### 2.1 Broken Access Control — IDOR

All resource-returning Edge Functions were reviewed for IDOR. Every function that accepts an ID parameter validates it against the calling user's org or user ID before use:

- `correlation-engine`: `rep_id` validated against team membership — PASS
- `drill-analysis`: `userAttempt` scoped to `session.user_id === user.id` — PASS
- `drill-generation`: `rep.org_id === caller.org_id` check — PASS
- `deal-outcomes`: all queries scoped to `org_id` — PASS
- `admin-delete-user`: validates caller is admin, `targetUserId` must differ from self — PASS
- `revenue-intelligence`: all queries scoped to `org_id` — PASS

| Finding | Severity | Status |
|---------|----------|--------|
| No IDOR vulnerabilities found across reviewed Edge Functions | — | PASS |

### 2.2 Injection

| Check | Finding | Severity | Status |
|-------|---------|----------|--------|
| Raw SQL / string-interpolated queries | No raw SQL found — all database access uses Supabase client with parameterised queries | — | PASS |
| `pg_cron` / `exec` / dynamic function calls | Not present in any Edge Function | — | PASS |
| Unparameterised Supabase RPC calls | All RPC calls use named parameter objects (`p_org_id`, `p_function_name`, etc.) | — | PASS |
| Prompt injection (beyond Sprint 1 CF-1) | `unified-ai` interpolates user-submitted `message` and `history` into the AI context without input sanitisation. `chat-ai` carries CF-1. | MEDIUM | OPEN |

| Finding | Severity | Status |
|---------|----------|--------|
| `unified-ai` interpolates raw user message into AI context without sanitisation | MEDIUM | OPEN |

### 2.3 Security Misconfiguration — Verbose Error Responses

Six Edge Functions return `error.message` directly to the client in catch blocks. This can leak internal field names, RPC function signatures, or infrastructure details.

| Function | Leak Point | Severity | Status |
|----------|-----------|----------|--------|
| `correlation-engine` | Line 698 — raw `message` in JSON response | LOW | OPEN |
| `revenue-intelligence` | Line 163 — `err.message` in response | LOW | OPEN |
| `stripe-portal` | Line 90 — `error.message` in response | LOW | OPEN |
| `tts-generate` | Lines 78–80 — full ElevenLabs error response body returned | MEDIUM | OPEN |
| `upgrade-request` | Line 78 — `err.message` in response | LOW | OPEN |
| `training-api` | Line 128 — `console.error` with raw error (server log only, not client — acceptable) | — | NOTE |

**Operational logs with IDs (server-side only, not client-visible):**
- `stripe-webhook`: logs `org_id`, `customer_id`, `subscription_id` — acceptable for audit trail
- `correlation-engine`: logs `rep_id`, gap values — acceptable for debug

| Finding | Severity | Status |
|---------|----------|--------|
| `tts-generate` returns full ElevenLabs error body to client — may expose upstream service details | MEDIUM | OPEN |
| 4 functions return `error.message` to client — leaks internal field names / RPC signatures | LOW | OPEN |

### 2.4 Insecure Design — Password Reset Flow

Reset flow uses Supabase Auth (`resetPasswordForEmail` + `updateUser`).

| Check | Finding | Severity | Status |
|-------|---------|----------|--------|
| Token expiry | 1 hour (displayed in UI at `ForgotPassword.tsx:56`, matches Supabase default) — at the acceptable boundary. Supabase Pro allows reducing to 15 min. | LOW | OPEN |
| Single-use enforcement | Supabase issues one-time-use recovery tokens by default — PASS | — | PASS |
| Reset link destination manipulation | `redirectTo` is hardcoded to `${window.location.origin}/update-password`. If a user follows a phishing link to `evil.com/forgot-password`, the redirect will send the token to `evil.com/update-password`. This is a standard SPA limitation — mitigated by Supabase requiring the redirect URL to match an allowlist configured in the Supabase dashboard. Confirm allowlist is set. | MEDIUM | OPEN — verify Supabase Auth redirect URL allowlist |

| Finding | Severity | Status |
|---------|----------|--------|
| Password reset token expiry is 1 hour — consider reducing to 15 min (Supabase Pro feature) | LOW | OPEN |
| `redirectTo` uses `window.location.origin` — verify Supabase Auth redirect URL allowlist is configured | MEDIUM | OPEN |

---

## Stage 3 — Load & Resilience Testing Plan

> All findings in this stage are **PLAN** status. No load testing was executed. This is forward work requiring a separate execution sprint.

### 3.1 Highest-Risk Functions Under Concurrent Load

| Rank | Function | Risk Rationale |
|------|----------|---------------|
| 1 | `chat-ai` | No orgRateLimit; OpenAI streaming; DB read on every message (session + persona fetch); unbounded call volume per org |
| 2 | `training-api` | No orgRateLimit; OpenAI call; manages session state mutations; action-dispatch pattern without input gate |
| 3 | `unified-ai` | No orgRateLimit; OpenAI gpt-4o-mini; DB write on every completion; no concurrency throttle |
| 4 | `pitch-api` | No orgRateLimit; OpenAI gpt-4o; audio URL fetch + transcript processing; highest per-call token cost |
| 5 | `correlation-engine` | CPU-intensive multi-query aggregation across sessions/deals; no explicit DB connection cap; single slow query can starve pool |

**Connection pool concern:** Supabase free tier uses shared PgBouncer with a hard cap of ~60 connections. With 50 concurrent org sessions each spawning multi-function chains, pool exhaustion is realistic. Supabase Pro (transaction mode, 1000 connections) is the unlock.

**Dual-model AI latency tolerance:** Claude Sonnet 4.5 (call-prep, deal-outcomes) P95 latency is ~8–14s under normal load. GPT-4o mini (unified-ai, training-api) P95 is ~3–6s. Under 50 concurrent sessions, upstream API rate limits (OpenAI: 500 RPM tier-1, Anthropic: 50 RPM free) become the binding constraint before Supabase. Expected degradation: streaming AI responses stall, client timeout at 30s, retry storms amplify load.

**Most-likely-to-degrade-first:** `chat-ai` and `training-api` combined, due to missing org rate limiting and high OpenAI token throughput. These two functions under 50 concurrent orgs will hit OpenAI rate limits and trigger cascading 429s without backoff.

### 3.2 Load Testing Tool and Scenario Structure

**Recommended tool: k6** (JavaScript/TypeScript-native, integrates with Vercel/Supabase CI, superior for API streaming scenarios vs Locust).

Minimum test scenarios for top 3 functions:

```javascript
// k6 scenario structure

// SCENARIO 1: chat-ai — concurrent multi-tenant chat sessions
export const chatAiScenario = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '2m', target: 50 },   // ramp to 50 concurrent org sessions
    { duration: '5m', target: 50 },   // sustain
    { duration: '1m', target: 0 },    // drain
  ],
  // Each VU: auth as unique test org user → POST /functions/v1/chat-ai
  // with sessionId, message (100–200 char), history (5 prior turns)
  // Assert: p95 < 15s, error rate < 1%, no 429 without Retry-After header
};

// SCENARIO 2: training-api — parallel training session completions
export const trainingApiScenario = {
  executor: 'constant-arrival-rate',
  rate: 30,           // 30 requests/second
  timeUnit: '1s',
  duration: '3m',
  preAllocatedVUs: 50,
  // Each iteration: auth → POST /functions/v1/training-api {action: 'score', messages: [...]}
  // Assert: p95 < 10s, DB write confirmed, no data cross-contamination across orgs
};

// SCENARIO 3: correlation-engine — manager dashboard at peak usage (Mon 9am spike)
export const correlationEngineScenario = {
  executor: 'ramping-arrival-rate',
  startRate: 1,
  timeUnit: '1s',
  stages: [
    { duration: '30s', target: 20 },  // simulate Monday morning spike
    { duration: '2m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  // Each iteration: auth as manager → GET /functions/v1/correlation-engine?action=efficacy&rep_id=...
  // Assert: p95 < 5s, no DB connection pool errors (watch for Supabase 503)
};
```

**Pre-requisites before execution:**
1. Provision dedicated k6 Cloud project or self-hosted runner
2. Create ~50 isolated test organisations in a staging Supabase project (never run against production DB)
3. Agree per-function SLA thresholds with stakeholders before recording baselines
4. Confirm OpenAI and Anthropic test API keys with sufficient rate limits

### 3.3 Stage 3 Findings Table

| Finding | Severity | Status |
|---------|----------|--------|
| `chat-ai`, `training-api`, `unified-ai`, `pitch-api` missing orgRateLimit — highest load risk | PLAN | PLAN |
| Supabase free tier: ~60 connection cap — pool exhaustion under 50 concurrent sessions realistic | PLAN | PLAN |
| No load testing infrastructure exists — k6 setup and test org provisioning required before execution | PLAN | PLAN |
| OpenAI rate limits (tier-1: 500 RPM) are binding constraint before DB under concurrent load | PLAN | PLAN |
| No AI response caching layer — repeated similar prompts hit OpenAI every time | PLAN | PLAN |

---

## Stage 4 — Client-Side Security & Build Hardening

### 4.1 Source Maps

`vite.config.ts` contains no explicit `build.sourcemap` override. Vite's default for `vite build` (production) is `sourcemap: false` — no `.map` files are emitted or deployed.

| Finding | Severity | Status |
|---------|----------|--------|
| Source maps not explicitly disabled — relies on Vite default (`false` in production) | LOW | OPEN — recommend explicit `build: { sourcemap: false }` in vite.config.ts |
| No `.map` files expected in production build | — | PASS |

### 4.2 Bundle Analysis

The following `VITE_` prefixed variables are referenced in client code and will be embedded in the production bundle:

| Variable | Content | Risk |
|----------|---------|------|
| `VITE_SUPABASE_URL` | Project URL | Acceptable — public by Supabase design |
| `VITE_SUPABASE_ANON_KEY` | Anon/public key | Acceptable — public by Supabase design; security relies on RLS |
| `VITE_POSTHOG_KEY` | Analytics write key (`phc_...`) | Acceptable — public-facing analytics key |
| `VITE_HUBSPOT_CLIENT_ID` | OAuth client ID | Acceptable — public by OAuth design |
| `VITE_SALESFORCE_CLIENT_ID` | OAuth client ID | Acceptable — public by OAuth design |

No server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `STRIPE_SECRET_KEY`) were found in any `VITE_` prefixed variable.

| Finding | Severity | Status |
|---------|----------|--------|
| No server secrets found in client bundle — PASS | — | PASS |
| No debug packages or dev-only tooling found in production bundle references | — | PASS |

### 4.3 Browser Storage Usage

| Storage Use | Location | Content | Risk |
|------------|----------|---------|------|
| Supabase session (JWT access token + refresh token) | `localStorage` | Full JWT including `access_token` and `refresh_token` | HIGH — standard `@supabase/supabase-js` default; any XSS vulnerability can steal the session token. No HttpOnly cookie alternative without a custom SSR server. |
| PostHog analytics | `localStorage` | Anonymous analytics ID (`phx_...`) | LOW — no PII, no auth credential |
| Theme preference | `localStorage` | `'dark'` / `'light'` | NEGLIGIBLE |
| Cookie consent | `localStorage` | `'accepted'` / `'rejected'` | NEGLIGIBLE |

| Finding | Severity | Status |
|---------|----------|--------|
| Supabase JWT (access + refresh token) stored in `localStorage` by `@supabase/supabase-js` default — vulnerable to theft via XSS | HIGH | OPEN |
| No session tokens persist beyond session end: `@supabase/auth-js` refreshes tokens on page load; logout calls `supabase.auth.signOut()` which clears storage | — | PASS |

### 4.4 External CDN Scripts

`index.html` loads only one external resource via CDN:

| Domain | Resource | SRI Hash | Trust |
|--------|---------|----------|-------|
| `fonts.googleapis.com` | Google Fonts CSS (`Oswald`, `DM Sans`) | ABSENT | Trusted CDN — low risk for fonts, but no integrity verification |
| `fonts.gstatic.com` | Font binary files (via the CSS above) | ABSENT | Trusted CDN |

No external JavaScript libraries are loaded via CDN `<script>` tags — all dependencies are bundled via Vite/npm.

| Finding | Severity | Status |
|---------|----------|--------|
| Google Fonts CSS loaded without SRI hash — font CSS could theoretically be modified by a CDN compromise | LOW | OPEN |
| No external JavaScript loaded via CDN — all deps bundled | — | PASS |

### 4.5 CSP Inline Script / Style Refactoring Requirements

The current CSP (`script-src 'self' 'unsafe-inline'`) blocks strict CSP adoption. The following would need to be addressed before removing `unsafe-inline`:

| Blocker | Location | Mitigation Needed |
|---------|---------|-------------------|
| Inline `<style>` block in `index.html` | `index.html` lines 20–41 | Move to external CSS file or use a nonce |
| PostHog `posthog.init(...)` is called from within the React tree (not via inline script), so it's bundled — not a CSP blocker | `src/lib/posthog.ts` | No action needed |
| Vite HMR in development uses inline scripts | Dev only | No prod impact |
| Any runtime-injected inline styles from third-party components (motion, etc.) | Unknown — requires runtime CSP violation report audit | Add CSP `report-uri` first to audit before enforcing |

**Recommended path to strict CSP:**
1. Move `index.html` inline `<style>` block to a static CSS file (1 day effort)
2. Add `font-src https://fonts.gstatic.com` to CSP
3. Deploy CSP in report-only mode (`Content-Security-Policy-Report-Only`) with a `report-uri` endpoint for 2 weeks
4. Fix all reported violations, then switch to enforcing mode

| Finding | Severity | Status |
|---------|----------|--------|
| `unsafe-inline` in `script-src` and `style-src` prevents strict CSP enforcement | HIGH | OPEN (see Stage 1) |
| Inline `<style>` block in `index.html` is the only blocker to removing `unsafe-inline` from `style-src` | MEDIUM | OPEN |
| No CSP `report-uri` configured — no visibility into CSP violations in production | MEDIUM | OPEN |

---

## Stage 5 — Open Items Remediation Plan

> All items in this stage are **PLAN** status. Implementation requires separate approval.

### 5.1 CF-1: `chat-ai` DB-Derived Prompt Interpolation

**Issue:** `session.target_persona`, `session.scenario`, `session.pitch_goal`, `session.difficulty` are fetched from the database and interpolated directly into the system instruction without sanitisation.

**Proposed fix:**
1. Define an allowlist enum for each interpolated field at the DB schema level (e.g. `difficulty` is already a constrained column type; `scenario` and `target_persona` should be too).
2. After fetching from DB, validate each value against its allowlist before interpolation. If any value fails validation, reject the request with 400.
3. Optionally: strip or escape any prompt-control characters (`\n`, `###`, `<|`, etc.) from string fields as a belt-and-braces measure.
4. Add a unit test that passes a malicious `scenario` value and asserts the system prompt is not altered.

**Estimated effort:** S (1 day — schema enum constraint + validation guard + test)

### 5.2 CF-2: Unvalidated JSON Bodies on 20 Edge Functions

**Issue:** Most Edge Functions call `req.json()` and use fields without validating type, range, or allowed values.

**Proposed fix:**
1. Adopt a shared Zod-like validation pattern in `_shared/` (Deno supports [Zod via esm.sh](https://esm.sh/zod)) or implement a lightweight `validateBody(schema, data)` helper.
2. Define a schema object per function alongside the handler. Required fields, types, max string lengths (defend against oversized payloads).
3. Return a structured 400 with a `{ error: 'Invalid request', fields: [...] }` shape on validation failure — no internal details.
4. Prioritise the 4 AI-calling functions (`chat-ai`, `unified-ai`, `training-api`, `pitch-api`) and the 2 admin functions (`admin-delete-user`, `gdpr-erasure`) first.

**Shared middleware viability:** Yes — a `_shared/validateBody.ts` module with a `validate(schema, body)` function is viable and would cover all 20 functions with consistent error shapes.

**Estimated effort:** M (3–4 days — shared helper + schema definitions for 20 functions + tests for boundary conditions)

### 5.3 CF-3: `orgRateLimit.ts` Fails Open on RPC Error

**Issue:** When `check_org_ai_limit` RPC is unavailable, `checkOrgAiLimit` returns `{ allowed: true }` — allowing unbounded AI spend during database degradation events.

**Proposed fix — two options:**

**Option A (recommended): Fail closed with a grace window**
- Track a short-lived in-memory counter (per function invocation, not persistent) as a secondary guard.
- On RPC error, check whether this function has been called more than N times (e.g. 10) in the current cold-start lifetime. If so, return 503 rather than allowing through.
- This does not require persistent state and works within Deno's per-isolate memory.

**Option B: Circuit breaker pattern**
- Add a `_shared/circuitBreaker.ts` that tracks RPC failure count. After 3 consecutive failures, open the circuit and return 503 with a `Retry-After` header. Reset after a 60s window.
- More robust but adds ~30 lines of shared state management.

Either option should add a structured log entry (with `org_id`, `function_name`, `timestamp`) on every fail-open event so that anomalous AI spend during DB degradation is visible in Supabase logs.

**Estimated effort:** S–M (0.5–1 day for Option A; 1.5 days for Option B with tests)

### 5.4 CF-4: Per-Org AI Spend Controls on Remaining Functions

**Identified missing functions:** `chat-ai`, `pitch-api`, `training-api`, `unified-ai`

> Note: Sprint 2 carried 5 functions; current code review identifies 4. Either one was remediated between sprints or the count differed in the original assessment. The 4 above are confirmed missing in the current codebase.

**Proposed fix:**
For each function, add a `checkOrgAiLimit` call immediately after JWT verification and before any external AI call. Use the following estimated token values:

| Function | Model | Estimated tokens | Suggested daily limit |
|----------|-------|------------------|-----------------------|
| `chat-ai` | OpenAI gpt-4.1 | ~2000/turn | 200 calls / 400K tokens |
| `pitch-api` | OpenAI gpt-4o | ~3500/call | 50 calls / 175K tokens |
| `training-api` | OpenAI gpt-4o-mini | ~1500/call | 100 calls / 150K tokens |
| `unified-ai` | OpenAI gpt-4o-mini | ~1200/turn | 100 calls / 120K tokens |

The `check_org_ai_limit` RPC is already deployed and parameterised — this is a call-site addition only, no schema changes needed.

**Estimated effort:** S (0.5 day — 4 call-site additions + smoke test per function)

---

## Consolidated Findings

### Severity Counts

| Severity | Count |
|----------|-------|
| CRITICAL | 0 (Sprint 3) |
| HIGH | 3 |
| MEDIUM | 7 |
| LOW | 9 |
| TIER LIMITATION | 3 |
| PLAN | 5 |

### Top 10 Must-Fix Items

| # | Finding | Severity | Effort | Blocking |
|---|---------|----------|--------|---------|
| 1 | CF-1: `chat-ai` system prompt interpolates unsanitised DB values (prompt injection) | HIGH | S | Mid-market procurement, Cyber Essentials |
| 2 | CF-4: `chat-ai`, `pitch-api`, `training-api`, `unified-ai` missing per-org AI spend controls | HIGH | S | Commercial viability — unbounded AI cost exposure |
| 3 | Supabase JWT stored in `localStorage` — any XSS escalates to full session takeover | HIGH | M | Cyber Essentials (credential storage requirement) |
| 4 | CSP `unsafe-inline` in `script-src` / `style-src` — XSS protection negated | HIGH | M | Cyber Essentials (A3: XSS mitigation) |
| 5 | CF-3: `orgRateLimit.ts` fails open on RPC error — AI spend ungated during DB degradation | MEDIUM | S | Commercial viability |
| 6 | Password reset `redirectTo` uses `window.location.origin` — verify Supabase Auth redirect URL allowlist | MEDIUM | S | Cyber Essentials (A2: Broken Auth) |
| 7 | `tts-generate` leaks full ElevenLabs error response to client | MEDIUM | S | GDPR / data minimisation |
| 8 | CF-2: 20 Edge Functions accept unvalidated JSON bodies | MEDIUM | M | OWASP A03: Injection surface |
| 9 | `unified-ai` interpolates raw user message into AI context | MEDIUM | S | Prompt injection |
| 10 | No CSP `report-uri` — no visibility into CSP violations in production | MEDIUM | S | Compliance readiness |

### Cross-Sprint Open Items Tracker

| ID | Finding | Severity | Sprint | Status |
|----|---------|----------|--------|--------|
| CF-1 | `chat-ai` system prompt interpolates DB-derived values | HIGH | Sprint 1 | OPEN |
| CF-2 | 20 of 22 Edge Functions accept unvalidated JSON bodies | MEDIUM | Sprint 1 | OPEN |
| CF-3 | `orgRateLimit.ts` fails open on RPC error | MEDIUM | Sprint 2 | OPEN |
| CF-4 | Per-org AI spend controls missing on 4 confirmed Edge Functions | HIGH | Sprint 2 | OPEN |
| S3-1 | CSP `unsafe-inline` negates XSS protection | HIGH | Sprint 3 | OPEN |
| S3-2 | Supabase JWT in `localStorage` — XSS escalation path | HIGH | Sprint 3 | OPEN |
| S3-3 | CORS `getCorsHeaders` tautological ternary | LOW | Sprint 3 | OPEN |
| S3-4 | HSTS missing `preload` | LOW | Sprint 3 | OPEN |
| S3-5 | Vercel preview deployments publicly accessible; no deployment protection | MEDIUM | Sprint 3 | OPEN |
| S3-6 | No separate staging environment | MEDIUM | Sprint 3 | OPEN |
| S3-7 | Password reset `redirectTo` uses `window.location.origin` — verify allowlist | MEDIUM | Sprint 3 | OPEN |
| S3-8 | `tts-generate` leaks upstream ElevenLabs error body to client | MEDIUM | Sprint 3 | OPEN |
| S3-9 | `unified-ai` interpolates unsanitised user message into AI context | MEDIUM | Sprint 3 | OPEN |
| S3-10 | 6 Edge Functions return `error.message` to client | LOW | Sprint 3 | OPEN |
| S3-11 | `source maps` not explicitly disabled in `vite.config.ts` (relies on Vite default) | LOW | Sprint 3 | OPEN |
| S3-12 | No CSP `report-uri` configured | MEDIUM | Sprint 3 | OPEN |
| S3-13 | Inline `<style>` in `index.html` blocks strict CSP | MEDIUM | Sprint 3 | OPEN |
| S3-14 | Google Fonts loaded without SRI hash | LOW | Sprint 3 | OPEN |
| S3-15 | Password reset token expiry is 1 hour (consider 15 min — Pro feature) | LOW | Sprint 3 | OPEN |
| TL-1 | Supabase free tier: no IP allowlisting | TIER LIMITATION | Sprint 3 | TIER |
| TL-2 | Supabase free tier: no network egress filtering | TIER LIMITATION | Sprint 3 | TIER |
| TL-3 | Supabase free tier: ~60 connection cap — pool exhaustion risk under load | TIER LIMITATION | Sprint 3 | TIER |

### Cyber Essentials / Mid-Market Procurement Blockers

The following findings would be raised in a Cyber Essentials Plus assessment or enterprise procurement security questionnaire:

| Finding | CE Control | Blocker Level |
|---------|-----------|--------------|
| S3-1: `unsafe-inline` in CSP | CE: Boundary Firewalls & Secure Configuration | BLOCKS certification |
| S3-2: JWT in `localStorage` | CE: Access Control | BLOCKS certification — credential storage must be protected |
| CF-1: Prompt injection via unsanitised DB values | CE: Malware Protection / Input Validation | BLOCKS enterprise procurement |
| S3-5: Unauthenticated preview deployment URLs | CE: Access Control | LIKELY FLAGS in questionnaire |
| S3-6: No staging environment isolation | Enterprise procurement standard | FLAGS in mid-market security review |
| CF-4: Unbounded AI spend per org | Commercial risk | Not CE-specific but flags in procurement risk assessment |

---

*Stop. Awaiting approval before any remediation implementation.*
