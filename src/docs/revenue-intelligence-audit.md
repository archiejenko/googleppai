# Revenue Intelligence Layer: Current State Audit

_Generated: 2026-04-18. All data sourced from codebase only — nothing invented._

---

## Tier Definitions (as found in codebase)

### Tier 1 — Performance Infrastructure
- **Internal key:** `core`
- **Display name:** "Performance Infrastructure" (pricing page); "Core Platform" (`constants/pricing.ts`)
- **Price per user:** £65.00/month (monthly billing)
- **Annual billing:** 15% discount → £55.25/user/month
- **Onboarding fee:** £2,000 one-time per organisation
- **Trial:** 14 days — new orgs start on `core` with `trial_ends_at` set; trial gives no tier upgrade (core only, per `create-organisation` function)
- **Source:** `src/constants/pricing.ts`, `src/pages/Pricing.tsx`, `supabase/functions/create-organisation/index.ts`

### Tier 2 — Revenue Intelligence Layer
- **Internal key:** `revenue_intelligence`
- **Display name:** "Revenue Intelligence Layer" (pricing page); "Revenue Intelligence" (`constants/pricing.ts`)
- **Price per user:** £185.00/month (monthly billing)
- **Annual billing:** 15% discount → £157.25/user/month
- **Onboarding fee:** £2,000 one-time (same as Tier 1)
- **Token usage charges:** noted in pricing page footer ("TOKEN USAGE CHARGES APPLY ON REVENUE INTELLIGENCE LAYER") — no further detail in code
- **Source:** `src/constants/pricing.ts`, `src/pages/Pricing.tsx`

### Tier 3 — Revenue Readiness (Enterprise)
- **Internal key:** `null` — no code-level tier key; enterprise only
- **Display name:** "Revenue Readiness"
- **Price:** Custom (not defined in code)
- **Features listed in pricing page copy only** — no gating logic references this tier
- **Source:** `src/pages/Pricing.tsx`

### Tier gating logic
- `TierContext.tsx` fetches `tier` from `organisations` table. The `isRevIntel` flag is `true` when `org.tier === 'revenue_intelligence'` AND (trial is still active OR no trial exists).
- **Admin override:** users with `admin` role always receive `isRevIntel = true` regardless of tier.
- The `organisations` table is not created in any visible migration file — it pre-exists (likely created via Supabase dashboard or an earlier untracked migration). Columns referenced in code: `id, name, tier, seats_licensed, price_per_seat_gbp, onboarding_fee_paid, trial_ends_at, weekly_target, stripe_subscription_id, payment_failed`.
- Stripe webhook (`stripe-webhook/index.ts`) maps price IDs to tiers via env vars (`STRIPE_PI_*` → `core`; `STRIPE_RI_*` → `revenue_intelligence`). On subscription deletion, org is downgraded to `core`.

---

## Feature Gate Map

| Feature | Performance Infrastructure (core) | Revenue Intelligence Layer | Source |
|---|---|---|---|
| Call Training / Roleplay | ✅ Included | ✅ Included | `src/data/capabilitiesData.ts` |
| Performance Analytics | ✅ Included | ✅ Included | `src/pages/Pricing.tsx` |
| Goal Tracking | ✅ Included | ✅ Included | `src/pages/Pricing.tsx` |
| Leaderboards | ✅ Included | ✅ Included | `src/pages/Pricing.tsx` |
| AI Coaching Digests | ✅ Included (no tierBadge) | ✅ Included | `src/data/capabilitiesData.ts` |
| Manager Coaching Insights | ✅ Included (no tierBadge) | ✅ Included | `src/data/capabilitiesData.ts` |
| Session Review & Scoring | ✅ Included (no tierBadge) | ✅ Included | `src/data/capabilitiesData.ts` |
| HubSpot Integration | ✅ Included (no tierBadge) | ✅ Included | `src/data/capabilitiesData.ts` |
| Salesforce Integration | ✅ Included (no tierBadge) | ✅ Included | `src/data/capabilitiesData.ts` |
| Outcome Correlation | ✅ Included (no tierBadge) | ✅ Included | `src/data/capabilitiesData.ts` |
| Meeting Intelligence | 🔒 Locked (shown as locked feature) | ✅ Included | `src/pages/Pricing.tsx`, `src/features/meetings/MeetingsPage.tsx` |
| Real-Time Talk Ratio Monitoring | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts` (tierBadge: 'Revenue Intelligence') |
| Live Coaching Nudges | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts` (tierBadge: 'Revenue Intelligence') |
| Engagement Scoring (Live Call) | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts` (tierBadge: 'Revenue Intelligence') |
| Post-Call Session Review | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts` (tierBadge: 'Revenue Intelligence') |
| Missed Revenue Detection | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts`, `src/features/revenue-intelligence/RevenueIntelligencePage.tsx` |
| Multi-Stage Deal Navigation | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts` (tierBadge: 'Revenue Intelligence') |
| Prospect Intelligence Profiles | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts`, `RevenueIntelligencePage.tsx` |
| Pipeline Health Scoring | 🔒 Locked | ✅ Included | `src/data/capabilitiesData.ts`, `RevenueIntelligencePage.tsx` |
| Transfer Gap Analysis | ❌ Not in capabilities data | ✅ Listed in pricing copy | `src/pages/Pricing.tsx` (REV_INTEL_FEATURES) |
| Deal Correlation | ❌ Not in capabilities data | ✅ Listed in pricing copy | `src/pages/Pricing.tsx` (REV_INTEL_FEATURES) |
| AI Revenue Coaching | ❌ Not in capabilities data | ✅ Listed in pricing copy | `src/pages/Pricing.tsx` (REV_INTEL_FEATURES) |
| Competitive Intel | 🔒 Locked (implied by RI gate) | ✅ Included | `RevenueIntelligencePage.tsx` (behind TierGate) |
| Business Synergies | 🔒 Locked (implied by RI gate) | ✅ Included | `RevenueIntelligencePage.tsx` (behind TierGate) |
| Deal Outcomes | 🔒 Locked (implied by RI gate) | ✅ Included | `RevenueIntelligencePage.tsx` (behind TierGate) |
| CRM Automation | 🔒 Locked (implied by RI gate) | ✅ Included | `RevenueIntelligencePage.tsx` (behind TierGate) |
| Automated CRM Updates | ✅ Included (no tierBadge) | ✅ Included | `src/data/capabilitiesData.ts` |

---

## Meeting Intelligence

### What is built and live
`src/features/meetings/MeetingsPage.tsx` is a fully implemented page with:
- Meeting list from `meeting_sessions` table (Teams, Zoom, Google Meet, Recall.ai bot, Browser Extension)
- Per-meeting scores: `overall_score`, `meddic_score`, `talk_ratio`, `presence_score`
- Meeting status tracking: `processing` / `scored` / `reviewed`
- Radar chart comparing phone call vs video meeting performance (from `useMeetingAnalytics` hook)
- Presence score trend line chart (last 30 sessions)
- Integration status cards for Teams, Zoom, Meet, Recall.ai, Browser Extension
- `src/hooks/useMeetingScores.ts` and `src/hooks/useMeetingAnalytics.ts` exist as data hooks
- `src/features/deal-view/MeetingTimeline.tsx` exists (meeting data surfaced in deal view)
- `src/features/revenue-dashboard/RecentMeetingsFeed.tsx` exists (meetings on main dashboard)

### AI Transcription & Action Item Extraction
Listed prominently in `capabilitiesData.ts` (AI Transcription & Summaries, Action Item Extraction). No corresponding Supabase function or table column visible for transcript or action item data in the reviewed files. The `meeting_sessions` table columns referenced in code are: `id, type, platform, prospect_name, company_name, started_at, duration_seconds, overall_score, meddic_score, talk_ratio, presence_score, status, scores`. No `transcript` or `action_items` column visible.

### Where it appears in the UI
- Route: `/meetings` (MeetingsPage)
- Also surfaces in deal view (`MeetingTimeline`) and revenue dashboard (`RecentMeetingsFeed`)
- The page header carries a "Revenue Intel" badge

### How it is gated
`MeetingsPage` is wrapped in `<TierGate>` with **no** `preview` prop — core-tier users see the full locked overlay with no preview content. The gating is enforced via `TierGate` → `TierContext.isRevIntel`. Pricing page shows "Meeting Intelligence" in `STANDARD_LOCKED_FEATURES` for Performance Infrastructure and as an included feature in Revenue Intelligence Layer.

---

## Gaps & Observations

### Features in copy but absent or unclear in build

1. **Transfer Gap Analysis** — listed in `REV_INTEL_FEATURES` on the pricing page and mentioned in Revenue Readiness enterprise copy ("Multi-team Transfer Gap benchmarking"). No corresponding page, component, route, or Supabase function found in the codebase. Absent.

2. **Deal Correlation** — listed in `REV_INTEL_FEATURES` on the pricing page. No page, component, or API endpoint found. Absent.

3. **AI Revenue Coaching** — listed in `REV_INTEL_FEATURES` on the pricing page. Not in `capabilitiesData.ts` and no dedicated page or function found. Absent.

4. **AI Transcription & Summaries / Action Item Extraction** — described in detail in `capabilitiesData.ts` and central to the Meeting Intelligence value proposition. No `transcript` or `action_items` columns visible in queried `meeting_sessions` data; no Supabase function for transcript processing found. May exist in tables/functions not covered by visible migrations.

5. **Automatic Meeting Capture** — listed in `capabilitiesData.ts`. Integration status cards exist in the UI (Teams, Zoom, Meet, Recall.ai), but no Supabase function for meeting ingestion/processing is visible in `supabase/functions/`. May rely on external webhook handlers not in this repo.

6. **Token usage charges on Revenue Intelligence Layer** — noted in pricing page footer copy. No token metering, budget cap, or usage tracking logic found in any visible file.

### Features built but not in pricing copy

7. **Competitive Intel, Business Synergies, Deal Outcomes, CRM Automation** — all surfaced as cards in `RevenueIntelligencePage.tsx` and backed by live API endpoints (`/competitive`, `/synergies` in `revenue-intelligence` function). None of these appear in the `REV_INTEL_FEATURES` list on the pricing page. They are in the `UpgradeModal` feature list (per the agent's report: "Live Call Scoring, Pipeline Health, Competitive Intel, Missed Revenue Recovery, Business Synergies, CRM Automation, Prospect Profiles") but the pricing page copy is narrower.

8. **Call vs Meeting performance comparison** (radar chart, delta insight) — built into `MeetingsPage` but not described anywhere in pricing or capabilities copy.

9. **Presence Insights / Presence Score Trend** — built and charted in `MeetingsPage`. Not mentioned in pricing or `capabilitiesData.ts`.

### Tier logic gaps and inconsistencies

10. **CRM integration features have no tier gate** — `capabilitiesData.ts` shows HubSpot Integration, Salesforce Integration, Outcome Correlation, and Automated CRM Updates **without** a `tierBadge`. This means they appear as ungated in the capabilities section. Yet CRM Automation is listed as a Revenue Intelligence feature in the upgrade modal and sits inside the `TierGate`-wrapped `RevenueIntelligencePage`. There is a contradiction between what the capabilities page implies (CRM is core) and what the upgrade modal implies (CRM is RI).

11. **Coaching & Feedback features have no tier gate** — AI Coaching Digests, Manager Coaching Insights, Session Review & Scoring all appear without `tierBadge` in `capabilitiesData.ts`. Whether these are actually gated at the component level is not confirmed by this audit.

12. **Trial does not unlock Revenue Intelligence** — `create-organisation` sets new orgs to `tier: 'core'` with a 14-day trial. `TierContext` grants `isRevIntel` only when `org.tier === 'revenue_intelligence'`. The trial period therefore does **not** grant RI access — it simply marks the org as trialling. The pricing page copy states "14-day free trial" without specifying which tier is unlocked. This is likely a gap between marketing intent and implementation.

13. **Revenue Readiness tier has no internal key** — the third plan (`id: 'revenue_readiness'`) has `tier: null` in `Pricing.tsx`. There is no `revenue_readiness` value in `OrgTier` type, no Stripe price ID mapping, and no gating logic. It is purely a marketing/contact card with no code-level implementation.

14. **No RLS or server-side tier enforcement on Revenue Intelligence API** — `supabase/functions/revenue-intelligence/index.ts` authenticates the user and requires an `org_id`, but does not check whether the org has `revenue_intelligence` tier before returning data. Tier gating is frontend-only (`TierGate` component). A core-tier user with a valid session could call the API endpoints directly.
