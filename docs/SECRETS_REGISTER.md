# Secrets Register
**Classification:** Confidential — Internal only
**Owner:** Engineering lead
**Last reviewed:** 2026-04-13
**Review cadence:** Quarterly (or immediately after any suspected compromise)

---

## How to use this register

1. Every secret and sensitive environment variable used by the platform must have a row here.
2. After rotating a secret, update **Last rotated** and initial-the **Rotated by** column.
3. Deprecated secrets must be marked RETIRED and the row kept for 12 months before deletion.
4. This file must not contain the actual secret values — only metadata.

---

## Supabase platform secrets

| Variable | Description | Scope | Where stored | Last rotated | Rotated by | Notes |
|---|---|---|---|---|---|---|
| `SUPABASE_URL` | Project REST/Auth/Storage endpoint | All Edge Functions | Supabase Vault (auto-injected) | N/A — URL, not rotatable | — | Public-safe but kept here for completeness |
| `SUPABASE_ANON_KEY` | Row-Level Security enforced client key | All Edge Functions, client app | Supabase Vault + Vercel env | **NOT DOCUMENTED** | — | Rotate if leaked; triggers client re-deploy |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — highest-privilege DB key | Edge Functions only | Supabase Vault | **NOT DOCUMENTED** | — | **CRITICAL** — never expose to browser; rotate quarterly |

---

## AI provider secrets

| Variable | Description | Scope | Where stored | Last rotated | Rotated by | Notes |
|---|---|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `call-prep`, `deal-outcomes` | Supabase Vault | **NOT DOCUMENTED** | — | Rotate quarterly; monitor usage on Anthropic dashboard |
| `OPENAI_API_KEY` | OpenAI API key | `chat-ai`, `unified-ai`, `drill-generation`, `pitch-api`, `training-api`, `drill-analysis` | Supabase Vault | **NOT DOCUMENTED** | — | Rotate quarterly; set usage limits on OpenAI dashboard |
| `DEEPGRAM_API_KEY` | Deepgram speech-to-text key | `deepgram-token` | Supabase Vault | **NOT DOCUMENTED** | — | Rotate quarterly |
| `DEEPGRAM_PROJECT_ID` | Deepgram project identifier | `deepgram-token` | Supabase Vault | N/A — project ID | — | Not a secret; kept for completeness |
| `ELEVENLABS_API_KEY` | ElevenLabs text-to-speech key | `tts-generate` | Supabase Vault | **NOT DOCUMENTED** | — | Rotate quarterly |

---

## Stripe secrets

| Variable | Description | Scope | Where stored | Last rotated | Rotated by | Notes |
|---|---|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe restricted key (checkout, portal, subscription management) | `stripe-checkout`, `stripe-portal`, `stripe-webhook` | Supabase Vault | **NOT DOCUMENTED** | — | Use restricted key, not the full secret key; rotate if leaked |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for Stripe webhook payload verification | `stripe-webhook` | Supabase Vault | **NOT DOCUMENTED** | — | Separate from `STRIPE_SECRET_KEY`; auto-generated per webhook endpoint |

---

## Stripe price IDs (non-secret configuration)

| Variable | Description | Scope | Where stored |
|---|---|---|---|
| `STRIPE_PI_MONTHLY_PRICE_ID` | Pipeline Intelligence monthly price | `stripe-checkout`, `stripe-webhook` | Supabase Vault |
| `STRIPE_PI_ANNUAL_PRICE_ID` | Pipeline Intelligence annual price | `stripe-checkout`, `stripe-webhook` | Supabase Vault |
| `STRIPE_RI_MONTHLY_PRICE_ID` | Revenue Intelligence monthly price | `stripe-checkout` | Supabase Vault |
| `STRIPE_RI_ANNUAL_PRICE_ID` | Revenue Intelligence annual price | `stripe-checkout` | Supabase Vault |
| `STRIPE_REVENUE_INTEL_PRICE_ID` | Revenue Intelligence base price ID | `stripe-webhook` | Supabase Vault |
| `STRIPE_DEPLOYMENT_FEE_PRICE_ID` | One-time deployment fee | `stripe-checkout` | Supabase Vault |

---

## Application configuration

| Variable | Description | Scope | Where stored | Notes |
|---|---|---|---|---|
| `ALLOWED_ORIGIN` | CORS allowed origin for Edge Functions | All Edge Functions | Supabase Vault | Must match Vercel deployment URL; update on domain change |
| `APP_URL` | Base URL of the deployed app | `deployment-request`, `upgrade-request` | Supabase Vault | No trailing slash |

---

## Client-side environment variables (Vercel)

| Variable | Description | Last rotated | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL — bundled into client | N/A | Public-safe |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key — bundled into client | **NOT DOCUMENTED** | Rotate in sync with `SUPABASE_ANON_KEY` above |
| `VITE_POSTHOG_KEY` | PostHog analytics write key | **NOT DOCUMENTED** | Rotate if analytics stream is compromised |

---

## Rotation procedure

1. Generate the new credential in the provider's dashboard.
2. Add the new value to Supabase Vault (and Vercel env if client-side) without removing the old value.
3. Deploy — confirm Edge Functions are picking up the new value.
4. Remove the old credential from Supabase Vault.
5. Revoke the old credential in the provider's dashboard.
6. Update **Last rotated** and **Rotated by** in this register and commit.

## Priority rotation queue

The following secrets have no documented rotation history and should be rotated in the next maintenance window:

- `SUPABASE_SERVICE_ROLE_KEY` — CRITICAL priority
- `STRIPE_SECRET_KEY` — HIGH priority
- `STRIPE_WEBHOOK_SECRET` — HIGH priority
- `ANTHROPIC_API_KEY` — HIGH priority
- `OPENAI_API_KEY` — HIGH priority
- `ELEVENLABS_API_KEY` — MEDIUM priority
- `DEEPGRAM_API_KEY` — MEDIUM priority
- `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` — MEDIUM priority
- `VITE_POSTHOG_KEY` — LOW priority
