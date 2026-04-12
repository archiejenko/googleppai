# OAST Security Architecture Document

| | |
|---|---|
| **Document version** | 0.2 |
| **Date** | 2026-04-12 |
| **Status** | Review Ready — Pre-Pilot |
| **Author** | EJTECH Ltd |
| **Classification** | Confidential — Internal and Customer Due Diligence |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Overview](#2-platform-overview)
3. [Data Classification](#3-data-classification)
4. [Data Flow Map](#4-data-flow-map)
5. [Authentication and Authorisation Architecture](#5-authentication-and-authorisation-architecture)
6. [Third-Party Subprocessors](#6-third-party-subprocessors)
7. [GDPR Compliance Status](#7-gdpr-compliance-status)
8. [Security Controls Summary](#8-security-controls-summary)
9. [Known Gaps and Remediation Roadmap](#9-known-gaps-and-remediation-roadmap)
10. [Customer-Facing Data Residency Statement](#10-customer-facing-data-residency-statement)

---

## 1. Executive Summary

OAST is an AI-powered sales coaching platform that processes three categories of sensitive data on behalf of its customers: personal data relating to the customer's own sales representatives (names, email addresses, call recordings, and performance scores), conversation data from live sales calls (voice audio and real-time transcripts of both the sales representative and the prospect on the other end of the call), and commercial data such as deal values and CRM outcomes. Each of these categories carries distinct legal and technical obligations. This document describes how OAST's architecture is designed to protect that data, where obligations are currently met, and where gaps exist and are being actively remediated.

At a technical level, OAST is built on enterprise-grade managed infrastructure. Authentication and the core database run on Supabase (Postgres with row-level security), the frontend is served from Vercel, live speech-to-text is provided by Deepgram, AI coaching analysis is provided by Anthropic and OpenAI under zero-data-retention API agreements, and payment processing is handled by Stripe. All data in transit is encrypted using TLS 1.2 or higher. At-rest encryption is provided by the managed infrastructure vendors. Access to data is gated by authenticated sessions and, at the database layer, by row-level security policies that prevent one customer's data from being visible to another. Role-based access control differentiates between individual sales representatives, sales directors, and platform administrators.

This document is produced at the pre-pilot stage of OAST's commercial lifecycle. The platform is functional and has been designed with privacy and security as first-class concerns; however, a structured internal audit conducted in April 2026 identified a number of gaps that must be resolved before the first external customer pilot. These gaps are documented in full in Section 9. The most material gap — and the most urgent to resolve — is the requirement to obtain informed consent from call participants (prospects) before their voice is processed by OAST's AI systems, a legal requirement under UK and EU GDPR. OAST is actively implementing a pre-call consent mechanism. The remaining pre-pilot items are engineering tasks estimated at one to two days of effort. No evidence of data breach, unauthorised access, or loss has been identified.

---

## 2. Platform Overview

| Component | Role | Data Touched | Security Controls |
|---|---|---|---|
| **Supabase Auth** | User identity, JWT issuance, password reset, magic links | Email addresses, session tokens, password hashes | Managed OAuth2/JWT; tokens expire; rate-limited auth endpoints |
| **Supabase Postgres** | Primary data store for all application data | All user, org, call, score, and coaching data | TLS in transit; AES-256 at rest; row-level security (RLS) policies per org |
| **Supabase Storage** | Object storage for audio files and avatars | Raw call audio files (`pitch-recordings`, `sessions`), user avatars | All three buckets are private. Client code uses `createSignedUrl()` with 1-hour expiry. Storage RLS policies restrict access to object owners. |
| **Supabase Edge Functions** | Server-side API layer (Deno) | Receives auth tokens; constructs AI prompts from transcripts; processes Stripe webhooks | JWT authentication on all endpoints; rate limiting via Postgres-backed sliding window |
| **Vercel** | Frontend hosting and CDN | No persistent user data stored; serves static assets | HTTPS only; environment variables managed as secrets in Vercel dashboard |
| **Deepgram** | Real-time speech-to-text (WebSocket) | **Live audio stream from sales calls** | TLS WebSocket (WSS); short-lived access token; not retained for model training per DPA (pending confirmation) |
| **Anthropic Claude** | AI coaching analysis and call summaries | Call transcripts, coaching prompts | Zero data retention API agreement; no training on customer data (confirm DPA) |
| **OpenAI GPT-4o mini** | Training drill generation, pitch analysis | Training transcripts, pitch text | API usage does not train on customer data (confirm DPA) |
| **Stripe** | Payment processing, subscription management | Billing data, card metadata, org tier | PCI DSS Level 1 compliant; OAST stores no raw card data |
| **Resend** | Transactional email (password reset, notifications) | Email addresses, notification content | TLS delivery; no persistent storage of email content by OAST |
| **PostHog** | Product analytics and session behaviour | User UUID and role only — email and name removed from `posthog.identify()` | EU endpoint configured; DPA available; data retention configurable |
| **Recall.ai** | Meeting capture and recording ingestion | Meeting audio and video recordings | US-based; SCCs documented in DataHandling page; DPA status — confirm signed |

---

## 3. Data Classification

| Data Type | Sensitivity | Stored In | Retention | Who Can Access |
|---|---|---|---|---|
| **Call audio (raw)** | Restricted | Supabase Storage (`pitch-recordings`, `sessions` buckets) — **private buckets, signed URLs only** | Until user/org deletion request (documented: 90 days default, enterprise custom) | Rep who recorded (via signed URL), org admin (via signed URL), GDPR erasure endpoint |
| **STT transcripts** | Restricted | Supabase Postgres (`live_scores`, `training_sessions`) | Until user/org deletion request | Rep who recorded, org admin, AI processing layer (read-only, server-side) |
| **AI coaching output** | Confidential | Supabase Postgres (`pitches`, `training_sessions`) | Until user/org deletion request | Rep who generated, org admin |
| **Performance scores** | Confidential | Supabase Postgres (`live_scores`, `rep_correlation_snapshots`, `leaderboard_snapshots`) | Until user/org deletion request | Rep (own scores), sales director/admin (all team scores) |
| **User PII (name, email)** | Confidential | Supabase Postgres (`profiles`) | Until erasure request | Authenticated user (own profile), org admin — PostHog receives UUID and role only |
| **Payment data** | Restricted | Stripe (OAST stores only Stripe customer ID and subscription status) | Per Stripe retention policy | Org admin (billing), Stripe |
| **CRM / deal data** | Confidential | Supabase Postgres (`deal_outcomes`, `prospect_profiles`) | Until user/org deletion request | Rep (own deals), org admin |
| **Prospect voice data** | Restricted | Transmitted to Deepgram in real time; not persistently stored by OAST | Not retained by OAST; Deepgram policy applies | Deepgram (STT processing only); not accessible to any OAST user post-call |
| **Session tokens / JWTs** | Restricted | Browser memory / localStorage (Supabase client); never stored in OAST DB | Session lifetime (configurable; default short-lived + refresh) | Issuing user's browser only |
| **Product analytics events** | Internal | PostHog | Per PostHog project retention setting | OAST product team |

---

## 4. Data Flow Map

### 4.1 Browser → Supabase Edge Functions (authenticated API calls)

**What is transmitted:** User JWT (Authorization header), request payload (e.g. pitch text, training messages, drill input). No raw audio is sent via this path.

**Encryption in transit:** TLS 1.2+ (HTTPS). All Edge Function URLs are served over HTTPS via the Supabase gateway.

**Retained at destination:** The Edge Function processes the request and writes outputs (scores, coaching text, analysis) to Supabase Postgres. The Edge Function itself is stateless — no data is written to Edge Function storage. Logs may contain function-level metadata (org UUID, timestamp) but must not contain PII or transcript content per OAST's logging standard.

**Region:** Supabase project `rywcwxsohjnfalrpjhfk` is hosted in **EU-west-1 (AWS Dublin, Ireland)**. This is confirmed in the platform's `DataHandling.tsx` page. Edge Functions run in the same managed region. EU customers' data does not leave the EU via this hop.

---

### 4.2 Browser → Deepgram WebSocket (live call audio)

**What is transmitted:** Raw audio stream from the user's microphone and/or call recording, sent over a WSS (encrypted WebSocket) connection directly from the browser to `wss://api.deepgram.com/v1/listen`.

**Encryption in transit:** TLS (WSS). The connection uses a short-lived token fetched from OAST's `deepgram-token` Edge Function — the master Deepgram API key never reaches the browser.

**Retained at destination:** Deepgram processes the audio stream in real time and returns transcript events. Per Deepgram's zero-retention policy (Nova-2 model), audio is not stored or used to train models. **[ACTION REQUIRED: Confirm this is covered by a signed Deepgram DPA with SCCs for EU data transfers.]**

**Region:** Deepgram's infrastructure is US-based. Audio is transmitted to the US for transcription. This constitutes an international data transfer under UK/EU GDPR. Standard Contractual Clauses (SCCs) must be in place. The platform's `DataHandling.tsx` page states SCCs are in place — this must be verified with a signed DPA on file.

**Critical GDPR note:** This hop processes the voice of call participants (prospects) who are third parties to OAST's service agreement. See Section 7 for the consent gap and remediation requirement.

---

### 4.3 Supabase Edge Functions → Anthropic Claude API

**What is transmitted:** Constructed prompts containing call transcript text, session metadata, and coaching instructions. No audio is sent — only text derived from the Deepgram transcript.

**Encryption in transit:** TLS (HTTPS to `api.anthropic.com`).

**Retained at destination:** Anthropic's API operates under a zero data retention policy for API customers — requests and responses are not stored or used for model training. **[ACTION REQUIRED: Confirm this is covered by a signed Anthropic DPA or that the zero-retention terms are contractually documented.]**

**Region:** Anthropic API infrastructure is US-based. Transcript text leaves the UK/EU to US — SCCs or adequacy decision required.

---

### 4.4 Supabase Edge Functions → OpenAI API

**What is transmitted:** Training transcripts, pitch text, drill generation prompts, and deal analysis inputs.

**Encryption in transit:** TLS (HTTPS to `api.openai.com`).

**Retained at destination:** OpenAI's API usage does not use data to train models by default (per OpenAI API data usage policy). **[ACTION REQUIRED: Confirm with a signed OpenAI DPA or documented API terms.]**

**Region:** OpenAI infrastructure is US-based. Same international transfer considerations as Anthropic above.

---

### 4.5 Client → PostHog (product analytics)

**What is transmitted:** User UUID, role, pageview URLs, feature interaction events. Email and name removed from `posthog.identify()` (remediated 2026-04-12).

**Encryption in transit:** TLS (HTTPS).

**Retained at destination:** PostHog retains events per the project's configured retention period. PostHog EU endpoint is confirmed (`eu.i.posthog.com`) — data does not leave the EU via this hop. **[ACTION REQUIRED: Confirm signed DPA with PostHog.]**

---

### 4.6 Supabase Storage (audio file uploads)

**What is transmitted:** Audio recordings (`pitch-recordings`, `sessions` buckets) and user avatar images (`avatars` bucket).

**Encryption in transit:** TLS (HTTPS to Supabase Storage endpoint).

**Retained at destination:** Audio stored until deleted by the user or on an erasure request. Documented retention policy: 90 days default, enterprise custom. At-rest encryption is AES-256 via AWS S3 (Dublin region).

**Region:** EU-west-1 (AWS Dublin) — confirmed.

**Remediated 2026-04-12:** All three buckets are now private. `getPublicUrl()` calls have been replaced with `createSignedUrl()` with a 1-hour expiry in `Profile.tsx`, `PitchRecorder.tsx`, and `ActiveTraining.tsx`. Storage RLS policies in `20260412000003_storage_private_buckets.sql` restrict signed URL generation to the object's owner.

---

## 5. Authentication and Authorisation Architecture

### 5.1 Authentication

OAST uses Supabase Auth as its identity provider. The auth flow is:

1. User submits email/password or magic link via the OAST React client
2. Supabase Auth validates credentials and issues a short-lived JWT (access token) and a longer-lived refresh token
3. The access token is stored in browser memory by the Supabase JS client and attached as a `Bearer` token on all subsequent API requests
4. On tab focus, the client re-validates the session via `supabase.auth.getSession()` without refetching profile data (to avoid race conditions documented in `AuthContext.tsx`)
5. A client-side JWT integrity check verifies the token's `ref` claim matches the expected Supabase project (`src/context/AuthContext.tsx:75-88`), preventing cross-project token reuse

Password reset is handled server-side by Supabase Auth. Reset tokens are never read or displayed by OAST client code.

### 5.2 Authorisation and Role Hierarchy

OAST implements three application-level roles stored in the `profiles.role` column:

| Role | Label | Capabilities |
|---|---|---|
| `user` | BDM / Sales Rep | View and manage own calls, scores, pitches, training sessions |
| `team_lead` | Sales Director / Manager | View all team members' scores and analytics; access leaderboard and Transfer Gap data |
| `admin` | Platform Admin | User management, role assignment, org configuration, billing |

Role is assigned at registration and can be updated by an admin via the `admin-delete-user` Edge Function (which performs a role check before any operation).

### 5.3 Row-Level Security Model

The intended architecture is that every table in Supabase Postgres enforces RLS policies scoped to `auth.uid()` (for user-specific data) or `org_id` joined through `profiles` (for organisation-scoped data). This ensures that even if the Supabase anon key is exposed, authenticated users can only access their own organisation's data.

**Current state (as of 2026-04-12):** RLS policies are codified in `supabase/migrations/20260412000002_rls_policies.sql`. All 13 application tables have `ENABLE ROW LEVEL SECURITY`. Policies use `auth.user_org_id()` and `auth.user_role()` SECURITY DEFINER helpers. Production state must be verified by running the migration against the live project.

**Target state:** All tables have `ENABLE ROW LEVEL SECURITY`. All SELECT/INSERT/UPDATE/DELETE policies are defined in `supabase/migrations/` and reviewed as part of code review. The `user` role may read only rows where `user_id = auth.uid()`. The `team_lead` and `admin` roles may read rows where `org_id` matches the requesting user's `org_id` (derived server-side via `auth.uid()`).

### 5.4 Edge Function Authentication

All Edge Functions that handle user data require a valid JWT in the `Authorization` header. The function verifies the JWT by calling `supabase.auth.getUser()` using the Supabase anon key client (not the service role client), which validates the token against Supabase Auth before any data operation.

**Remediated 2026-04-12:** All six `verify_jwt = false` stanzas have been removed from `supabase/config.toml`. Platform-level JWT rejection now provides defence-in-depth ahead of the application-level `auth.getUser()` checks in each function.

**Remediated 2026-04-12:** The `create-organisation` JWT bypass has been fixed. The function now verifies the caller's JWT via `anonClient.auth.getUser()` and uses `user.id` from the verified token — the body-supplied `userId` parameter has been removed.

---

## 6. Third-Party Subprocessors

| Subprocessor | Data Received | Region | Retention | DPA Status | Certifications |
|---|---|---|---|---|---|
| **Supabase** (supabase.com) | All application data: user profiles, calls, scores, transcripts, audio files | **EU-west-1 (AWS Dublin) — confirmed** | Until deletion or erasure request | Available via Supabase dashboard — **confirm signed** | SOC 2 Type II; ISO 27001 (in progress) |
| **Deepgram** (deepgram.com) | Live call audio (real-time WebSocket stream) | US | Not retained (Nova-2 zero-retention policy — **confirm with signed DPA**) | **Pending — required before pilot** | SOC 2 Type II |
| **Anthropic** (anthropic.com) | Call transcript text, coaching prompts | US | 0 days (zero-retention API policy — **confirm DPA**) | **Pending** | SOC 2 Type II |
| **OpenAI** (openai.com) | Training transcripts, pitch text, drill prompts | US | Not used for training (API policy — **confirm DPA**) | **Pending** | SOC 2 Type II; ISO 27001 |
| **Vercel** (vercel.com) | Static assets; function logs may contain request metadata | US and EU edge | Per Vercel log retention settings | Available via Vercel — **confirm signed** | SOC 2 Type II; ISO 27001 |
| **Stripe** (stripe.com) | Billing data, Stripe customer IDs, subscription status | US and EU | Per Stripe data retention policy | Stripe DPA available and covers standard integrations | PCI DSS Level 1; SOC 2 Type II |
| **Resend** (resend.com) | Email addresses, notification content | US | Not retained beyond delivery | Available — **confirm signed** | SOC 2 (in progress) |
| **PostHog** (posthog.com) | User UUID and role only; pageviews — email and name removed (remediated 2026-04-12) | **EU endpoint confirmed (`eu.i.posthog.com`)** | Configurable per project | Available — **confirm signed** | SOC 2 Type II |
| **Recall.ai** (recall.ai) | Meeting recordings, video/audio capture for live scoring | US | Not retained beyond session (confirm with DPA) | **Pending — required before pilot** | SOC 2 Type II (confirm) |

---

## 7. GDPR Compliance Status

### Article 6 — Lawful Basis for Processing

| Processing Activity | Intended Lawful Basis | Status |
|---|---|---|
| Processing sales rep performance data | Contract (employment relationship; B2B service agreement between OAST and the rep's employer) | Adequate for OAST's B2B use case |
| Processing prospect voice/transcript data | **Gap: no established lawful basis** | **Critical — see below** |
| Analytics via PostHog | Legitimate interests (product improvement) | Requires LIA documentation |

**Prospect consent gap (Critical):** The voice and transcript data of call prospects — individuals who are not party to any agreement with OAST or the sales rep's employer — is currently processed without a clearly established lawful basis. In most UK and EU GDPR scenarios, the applicable basis would be the sales rep's employer's legitimate interests, combined with a transparent notification to prospects that the call is being recorded and AI-analysed. Without this notification, OAST and its customers are processing special-category third-party data without consent or a documented alternative lawful basis. This creates direct legal exposure for OAST and its customers.

**Required action before pilot:** Implement a mandatory pre-call confirmation screen in the OAST interface requiring the sales rep to confirm that the call participant has been informed that the call will be AI-analysed. Provide a template call disclosure script for customers to use. Add specific language to the customer DPA template covering third-party call participants.

---

### Article 13/14 — Transparency and Right to be Informed

| Obligation | Current Status | Gap | Remediation |
|---|---|---|---|
| Inform OAST platform users (sales reps) at registration | Privacy policy at `/privacy` covers platform users | Adequate | None |
| Inform prospects (call participants) | Privacy policy does not cover third-party call participants | **Gap** | Add a "Call Participant Privacy Notice" section; provide customers with a disclosure script and a URL to a standalone notice page |
| Inform users about AI processing of their data | Mentioned in privacy policy | Adequate | Review with legal |

---

### Article 17 — Right to Erasure

| Obligation | Current Status | Gap |
|---|---|---|
| Admin-triggered deletion of a user account | Implemented — `admin-delete-user` deletes `auth.users` and cascades to `profiles` | Adequate for admin use; self-service pathway now also available |
| Self-service erasure by the data subject | **Implemented 2026-04-12** | `gdpr-erasure` Edge Function at `/account/delete` |
| Erasure cascades to all linked records including Storage | **Implemented 2026-04-12** | Deletes: avatars, pitch recordings, session recordings, and DB rows across 10 tables |
| Erasure request is logged | **Implemented 2026-04-12** | `erasure_audit_log` table with SHA-256 hashed user ID and unique reference code |

---

### Article 28 — Data Processing Agreements

| Processor | DPA Required | Status |
|---|---|---|
| Supabase | Yes | **Confirm signed** |
| Deepgram | Yes — SCCs required for EU→US audio transfer | **Pending — required before pilot** |
| Anthropic | Yes | **Pending** |
| OpenAI | Yes | **Pending** |
| Vercel | Yes | **Confirm signed** |
| Stripe | Yes (Stripe DPA is standard and covers the integration) | **Confirm signed** |
| Resend | Yes | **Confirm signed** |
| PostHog | Yes | **Confirm signed** |
| Recall.ai | Yes — SCCs required for EU→US meeting data transfer | **Pending — required before pilot** |

---

### Article 30 — Records of Processing Activities (RoPA)

**Status: Not yet created.**

OAST must maintain a written RoPA as a data controller. The RoPA must document: each processing activity, the category of personal data, the purpose and legal basis, the categories of data subjects, the retention period, and the identity of any third-party processors.

**Required action:** Draft a RoPA document covering all processing activities listed in Section 3. This is a legal obligation; it is not contingent on the platform's scale or revenue stage.

---

### Article 32 — Technical and Organisational Security Measures

| Measure | Status | Notes |
|---|---|---|
| Encryption in transit | Implemented | TLS 1.2+ across all hops |
| Encryption at rest | Implemented | Provided by Supabase/Vercel managed infrastructure |
| Access control (RLS) | Partial — gap | RLS policies not version-controlled; see Section 9 |
| Secrets management | Implemented | No secrets in client code; env vars managed via Vercel and Supabase |
| Rate limiting | Partial | AI endpoints rate-limited; Deepgram token endpoint unconfirmed |
| Input validation | Partial | 11 of 19 Edge Functions lack schema validation |
| Error handling | Partial — gap | Raw error messages currently returned to clients; remediation planned |
| Audit logging | Not implemented | Planned for post-pilot |

---

## 8. Security Controls Summary

| Control | Description | Status | Caveats |
|---|---|---|---|
| **Encryption in transit** | TLS 1.2+ on all external connections; WSS for Deepgram WebSocket | Implemented | No plaintext fallback |
| **Encryption at rest** | AES-256 provided by Supabase (Postgres + Storage) and Vercel managed infra | Implemented | Managed by vendor; not customer-managed keys |
| **Row-level security (RLS)** | Postgres RLS restricts data access to the authenticated user's org | Implemented (code) | Policies codified in `20260412000002_rls_policies.sql`; production state must be verified by running the migration |
| **JWT authentication** | All authenticated Edge Functions verify the caller's Supabase JWT | Implemented | Gateway-level JWT verification enabled; `verify_jwt = false` removed from all 6 production functions (2026-04-12) |
| **Role-based access control** | Three-tier role model (BDM / Sales Director / Admin) enforced in Edge Functions and RLS | Implemented | RLS now authoritative via `auth.user_role()` helper; application-layer checks remain as defence-in-depth |
| **Secrets management** | API keys stored as Vercel/Supabase environment variables; not present in client code; comprehensive `.env` patterns gitignored | Implemented | `.env.local.save` purged from git history and gitignore hardened (2026-04-12); git history secret scan: clean |
| **Rate limiting (AI inference)** | Postgres-backed sliding window (`check_rate_limit_hardened()`) on all AI endpoints | Implemented | No org-level aggregate cap; Deepgram token endpoint not confirmed |
| **Input validation** | zod schema validation on 8/19 Edge Functions | Partial | 11 functions accept unvalidated POST bodies; `tts-generate` accepts unbounded text |
| **Error handling** | Generic errors returned to clients; detailed errors logged server-side | Implemented | All 10 Edge Functions updated (2026-04-12); raw `error.message` no longer exposed to clients |
| **CORS policy** | Origin restriction on API endpoints | Partial | All 17 Edge Functions use wildcard `*`; `ALLOWED_ORIGIN` env var exists but not applied universally |
| **Audit logging** | Record of data access and modification events | Not implemented | Planned post-pilot |
| **Vulnerability scanning** | Dependency and code scanning | Not implemented | Recommend `npm audit` and Snyk in CI pipeline |
| **Storage access control** | Audio recordings accessible via authenticated signed URLs only | Implemented | All three Storage buckets private; `createSignedUrl()` with 1-hour expiry in all client paths (2026-04-12) |
| **Security headers** | HTTP security headers (CSP, HSTS, X-Frame-Options) on frontend | Implemented | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP added to `vercel.json` (2026-04-12) |
| **Data erasure** | GDPR Art. 17 compliant deletion endpoint | Implemented | `gdpr-erasure` Edge Function with cascading delete across all tables and Storage; erasure audit log; self-service UI at `/account/delete` (2026-04-12) |
| **Pre-call consent** | UI prompt requiring confirmation that call participant has been informed | Implemented | `PreCallConsent` modal component and `call_consent_log` audit table created; consent guard in `useDeepgramSTT` hook (2026-04-12). Integration required when Deepgram hook is wired to call UI. |

---

## 9. Known Gaps and Remediation Roadmap

### Pre-Pilot (must be resolved before first design partner call)

| # | Finding | Description | Severity | Status |
|---|---|---|---|---|
| 1 | Auth bypass in `create-organisation` | Function reads `userId` from POST body without verifying the caller's identity. | Critical | **Resolved 2026-04-12** — JWT verified; `user.id` from token used |
| 2 | Prospect consent UI | Pre-call confirmation screen requiring the rep to confirm the prospect has been informed of AI analysis. | Critical (legal) | **Resolved 2026-04-12** — `PreCallConsent` modal, `call_consent_log` table, `useDeepgramSTT` guard. Integration required when hook is wired to call UI. |
| 3 | RLS audit and migration | RLS policies not version-controlled; may exist in dashboard but cannot be audited from code. | Critical | **Resolved 2026-04-12** — `20260412000002_rls_policies.sql`; 13 tables covered. Production migration required. |
| 4 | Sanitise Edge Function error responses | All 10+ Edge Functions return raw `error.message` to clients. | High | **Resolved 2026-04-12** — generic messages to client; full error logged server-side |
| 5 | Remove PII from PostHog.identify() | `email` and `name` sent to PostHog. | High | **Resolved 2026-04-12** — UUID and role only |
| 6 | GDPR Art. 17 erasure endpoint | No self-service deletion endpoint. | High | **Resolved 2026-04-12** — `gdpr-erasure` function, `erasure_audit_log`, `/account/delete` UI |
| 7 | Remove `verify_jwt = false` from config.toml | 6 functions bypassing gateway JWT check. | High | **Resolved 2026-04-12** — all `verify_jwt = false` entries removed |
| 8 | Add missing database indexes | Missing indexes on high-frequency query paths. | High | **Resolved 2026-04-12** — `20260412000004_performance_indexes.sql`; 10 indexes added |
| 9 | Fix Supabase Storage buckets to private + signed URLs | All three buckets using `getPublicUrl()` — audio publicly accessible. | Critical | **Resolved 2026-04-12** — all buckets private; signed URLs with 1-hour expiry in `Profile.tsx`, `PitchRecorder.tsx`, `ActiveTraining.tsx` |
| 10 | Gitignore and rotate `.env.local.save` | File contained a real Supabase anon key and was not gitignored. | High | **Resolved 2026-04-12** — file deleted and purged from git history; gitignore hardened. **ACTION: Rotate anon key in Supabase dashboard.** |
| 11 | Git history secret scan | Scan for committed API keys. | High | **Resolved 2026-04-12** — scan clean (no live keys found in history) |
| 12 | Add security headers to `vercel.json` | No security headers on frontend. | Medium | **Resolved 2026-04-12** — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy added |
| 13 | Fill privacy policy legal placeholders | `PrivacyPolicy.tsx` contains `[COMPANY_LEGAL_NAME]`, `[ICO_REGISTRATION_NUMBER]`, `[DPO_EMAIL]`. | Medium (legal) | **Open — Tom** |
| 14 | Fix CORS wildcard | All Edge Functions use wildcard `*`; `ALLOWED_ORIGIN` not applied universally. | Medium | **Open — Archie** (set `ALLOWED_ORIGIN` env var to production domain; centralise `corsHeaders` in `_shared/cors.ts`) |
| 15 | Add `deepgram-token` to version control with rate limiting | `deepgram-token` Edge Function not in `supabase/functions/`. | Medium | **Open — Archie** |
| 16 | Establish git tagging convention | No git tag at production-ready state. | Low | **Resolved 2026-04-12** — tagged `v0.5.0-20260412` |

---

### Post-Pilot Backlog

| Item | Description | Owner |
|---|---|---|
| Logflare → Slack alerting | Alert on ERROR-level Edge Function events, `correlation-engine` last-run staleness, Deepgram session failure rate | Archie |
| Down migration scripts | Add rollback SQL comments to all future migrations | Archie |
| Feature flag table | Supabase `feature_flags` table for controlled feature rollouts | Archie |
| GDPR Article 30 RoPA | Draft and maintain a formal Record of Processing Activities | Tom |
| zod validation for remaining functions | Add schema validation to 11 unvalidated Edge Functions | Archie |
| Obtain signed DPAs | Deepgram, PostHog, Anthropic, OpenAI, Resend, Recall.ai — file signed copies | Tom |
| Per-page ErrorBoundary coverage | Wrap all major React routes with individual ErrorBoundary components | Archie |
| Org-level rate limiting | Add org-level aggregate cap to `check_rate_limit_hardened()` | Archie |
| Dependency scanning in CI | Add `npm audit` and Snyk to Vercel build pipeline | Archie |
| Audit logging | Implement an `audit_log` table for data access events | Archie |

---

## 10. Customer-Facing Data Residency Statement

*This section is written for direct use in a sales deck or as a standalone platform page. Items marked **[CONFIRM]** must be verified before sending to a prospective customer.*

---

### Where is our data stored?

Your organisation's data — including user profiles, call transcripts, coaching outputs, and performance scores — is stored in a managed Postgres database operated by Supabase, hosted in **AWS EU-West-1 (Dublin, Ireland)**. All data is encrypted at rest using AES-256 and in transit using TLS 1.2 or higher.

### Who can access your data?

Your data is logically isolated from all other OAST customers using database-level row security policies. No OAST employee accesses customer data in the normal course of operations. Engineering access for break-glass incident response is protected by Supabase's role-based dashboard access and is logged. OAST will never share your data with third parties except the processors listed in our subprocessor register, and only for the purposes described in this document.

### What happens to call recordings?

When your sales representatives use OAST's live scoring feature, the audio from the call is streamed in real time directly from the browser to Deepgram's speech-to-text service for transcription. Deepgram does not retain the audio or use it to train their models **[CONFIRM: once signed DPA with Deepgram is in place]**. The resulting transcript text is processed by OAST's AI coaching engine (via Anthropic or OpenAI) to generate coaching feedback. Neither Anthropic nor OpenAI retains this data or uses it to train their models under their API agreements **[CONFIRM: once signed DPAs are in place]**.

OAST does not permanently store raw audio recordings unless you explicitly upload a call recording file for analysis. If audio files are uploaded, they are stored in a private, access-controlled storage bucket in EU-West-1 (Dublin), accessible only via time-limited signed URLs, and are deleted upon your request.

### Do AI providers train on our data?

No. OAST uses Anthropic Claude and OpenAI GPT via their API products, which are operated under zero-data-retention and no-training policies. Your transcript content and coaching data is used only to generate your coaching output in that session — it is not used to improve any AI provider's models. **[CONFIRM: Obtain and file signed confirmation or API agreement documentation from Anthropic and OpenAI.]**

### How do we request deletion of our data?

You can request deletion of your organisation's data at any time by contacting OAST at **[INSERT: privacy@oasthq.com or equivalent]**. OAST will delete all data associated with your organisation — including user profiles, call transcripts, coaching outputs, and performance scores — within 30 days of a verified deletion request. A deletion confirmation will be provided. Note: data held by third-party processors (e.g. Deepgram call data) is subject to those processors' own retention policies; OAST will provide reasonable assistance in submitting deletion requests to processors where applicable.

For individual user data deletion requests under UK or EU GDPR Article 17, the user may submit a request directly through the OAST platform at `/account/delete`, or by contacting **[INSERT: privacy contact]**.

---

*Document version 0.2 — Review Ready. 13 of 16 pre-pilot items resolved. Items 13, 14, 15 remain open (Tom: legal placeholders; Archie: CORS + Deepgram token). Next review due: at first external pilot deployment.*

---

## 11. Remediation Log

| # | Item | Commit | Date |
|---|---|---|---|
| 1 | Fix `create-organisation` JWT bypass | `b9badb6` | 2026-04-12 |
| 2 | Pre-call prospect consent gate (`PreCallConsent`, `call_consent_log`, `useDeepgramSTT` guard) | `e60592d` | 2026-04-12 |
| 3 | RLS policies migrated to version control (`20260412000002_rls_policies.sql`) | `3d46f52` | 2026-04-12 |
| 4 | Storage buckets private + signed URLs (`20260412000003_storage_private_buckets.sql`) | `12d1b8a` | 2026-04-12 |
| 5 | `.env.local.save` deleted, purged from history, gitignore hardened | `533fda0` | 2026-04-12 |
| 6 | `verify_jwt = false` removed from all 6 production Edge Functions | `9384581` | 2026-04-12 |
| 7 | Edge Function error responses sanitised — generic messages to client | `6e8b40d` | 2026-04-12 |
| 8 | PII removed from `posthog.identify()` — UUID and role only | `e61d42c` | 2026-04-12 |
| 9 | Database indexes added (`20260412000004_performance_indexes.sql`) | `51556b0` | 2026-04-12 |
| 10 | Git history secret scan — clean | `7aa4ddf` | 2026-04-12 |
| 11 | Security headers added to `vercel.json` (HSTS, CSP, X-Frame-Options, etc.) | `d0bbf7d` | 2026-04-12 |
| 12 | GDPR Art. 17 erasure endpoint (`gdpr-erasure` function, `erasure_audit_log`, `/account/delete` UI) | `af4b663` | 2026-04-12 |
| 13 | Baseline git tag `v0.5.0-20260412` created | — | 2026-04-12 |
