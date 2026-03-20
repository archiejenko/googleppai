# OAST — Revenue Operating System

OAST is a B2B SaaS platform that gives revenue leaders real-time intelligence on rep performance, deal risk, and coaching gaps. It combines live call scoring, AI-powered coaching, and pipeline intelligence in a single platform.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 22 | [nodejs.org](https://nodejs.org) |
| Supabase CLI | ≥ 2.x | `npm i -g supabase` |
| Deno | ≥ 2.x | [deno.land](https://deno.land) |
| Git | any | — |

---

## 5-Command Quickstart

```bash
# 1. Clone and install frontend dependencies
cd scratch/pitch-perfect-ai/client && npm install

# 2. Copy environment template and fill in values (see table below)
cp .env.example .env

# 3. Start local Supabase (runs Postgres + Edge Functions + Studio)
cd .. && supabase start

# 4. Apply all migrations
supabase db push

# 5. Start the dev server
cd client && npm run dev
# → http://localhost:5173
```

---

## Environment Variables

Copy `client/.env.example` and populate each value:

| Variable | Example | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xyz.supabase.co` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase Dashboard → Settings → API |
| `VITE_POSTHOG_KEY` | `phc_...` | PostHog → Project → Settings |
| `VITE_POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog (or self-hosted URL) |

Edge Function secrets (set in Supabase Dashboard → Settings → Edge Functions → Secrets):

| Secret | Where to get it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `OPENAI_API_KEY` | platform.openai.com → API keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `DEEPGRAM_API_KEY` | console.deepgram.com → Keys (optional — falls back to Whisper) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → endpoint secret |
| `ALLOWED_ORIGIN` | Your deployed frontend URL (e.g. `https://app.oast.io`) |

---

## Architecture: Data Flow

```
React (client/src/)
  │
  ├── useXxx hooks (@tanstack/react-query)
  │     └── supabase.from('table')  ← direct DB reads via RLS
  │
  ├── Context (AuthContext, TierContext, LiveCallContext)
  │     └── LiveCallContext → fetch() → Supabase Edge Function
  │                                          │
  │                           ┌──────────────┤
  │                           ▼              ▼
  │                     _shared/          _rag-utils/
  │                     ai-provider.ts    mod.ts
  │                     tier-gate.ts      (RAG, embeddings)
  │                           │
  │                    ┌──────┴───────────────────┐
  │                    ▼                          ▼
  │             OpenAI / Anthropic          Supabase DB
  │             (model routing via          (Postgres + pgvector)
  │              ai-provider.ts)
  │                    │
  │                    └──► ai_cost_log table (token accounting)
  │
  └── Supabase Realtime (live-scoring broadcasts → LiveCallContext)
```

**Key principle:** No AI model is called from the React client. All AI calls go through Supabase Edge Functions (`supabase/functions/`). Model routing is centralised in `supabase/functions/_shared/ai-provider.ts`.

---

## Project Structure

```
scratch/pitch-perfect-ai/
├── client/                      ← React SPA (this directory)
│   ├── src/
│   │   ├── context/             ← AuthContext, TierContext, LiveCallContext
│   │   ├── features/            ← One directory per feature (30 features)
│   │   ├── hooks/               ← React Query data-fetching hooks
│   │   ├── components/          ← Shared UI components
│   │   ├── pages/               ← Route-level page components
│   │   └── utils/supabase.ts    ← Supabase client singleton
│   └── .env.example             ← Environment variable template
│
├── supabase/
│   ├── migrations/              ← 82 SQL migrations (run in order)
│   └── functions/               ← 58 Deno edge functions
│       └── _shared/             ← Shared middleware (cors, tier-gate, ai-provider)
│
└── scripts/
    └── seed-demo.ts             ← Demo account seed (Meridian Technologies)
```

For deeper architecture detail, see [`OAST_TECHNICAL_AUDIT.md`](../OAST_TECHNICAL_AUDIT.md) at the repo root.

---

## Common Tasks

### Run a database migration
```bash
# From scratch/pitch-perfect-ai/
supabase db push
```

### Deploy an edge function
```bash
# Deploy a single function
supabase functions deploy unified-ai

# Deploy all functions
supabase functions deploy
```

### Seed the demo account
```bash
# From scratch/pitch-perfect-ai/
npm run seed:demo
# Login: demo@oast.io / DemoManager1!
# Reps:  jamie.clarke@meridian-demo.oast.ai / DemoPass1!
```

### Run lint
```bash
# From client/
npm run lint
```

### Build for production
```bash
# From client/
npm run build
# Output: client/dist/
```

---

## Deployment

See [`DEPLOYMENT.md`](../DEPLOYMENT.md) for full deployment steps including:
- Supabase project setup
- Edge function secrets configuration
- Vercel / Netlify deployment
- Stripe webhook registration
- PostHog initialisation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 3 |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| Backend | Supabase (Postgres, RLS, Edge Functions, Realtime) |
| AI — reasoning | Claude Sonnet (Anthropic) |
| AI — volume | GPT-4o mini (OpenAI) |
| AI — pitch eval | GPT-4o (OpenAI) |
| STT | Deepgram Nova-2 / Whisper-1 |
| TTS | OpenAI TTS-1-HD |
| Payments | Stripe (subscriptions + webhooks) |
| Analytics | PostHog |
