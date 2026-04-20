# Transfer Gap Audit — Pre-Build Findings

_Generated: 2026-04-18. Audit only — no code written._

---

## 1. Live Call Scoring

**Status: EXISTS and prod-ready**

- **Edge function:** `supabase/functions/call-intelligence-scorer/index.ts` (~30 KB)
- **Trigger:** Post-call webhook/callback from telephony or correlation engine; uses service-role key
- **Primary table:** `live_scores`

**Key columns in `live_scores`:**

| Column | Type | Notes |
|---|---|---|
| `overall_score` | numeric | Composite 0–100 |
| `rep_talk_pct` / `prospect_talk_pct` | numeric | Talk ratio split |
| `talk_ratio_score` | numeric | Sub-score |
| `discovery_score` | numeric | Sub-score |
| `engagement_score` | numeric | Sub-score |
| `objection_handling_score` | numeric | Sub-score |
| `sentiment_curve` | jsonb | Time-series sentiment trajectory |
| `objection_log` | jsonb | Array of detected objections with timestamps |
| `signals_detected` | jsonb | Boolean map of detected signals |
| `coaching_events` | jsonb | Array of live nudges triggered during call |
| `call_stage`, `duration_secs` | various | Call metadata |
| `call_started_at`, `call_ended_at` | timestamptz | Call timing |
| `prospect_name`, `company_name` | text | Deal context |

**Keyed by:** `user_id`, `org_id` (standard pattern), timestamp range

**Scoring layers implemented:** L5 objection detection, L6 buying signal detection, L7 next-step commitment, L8 pacing (30-sec windows, WPM flags)

**Client hooks:** `useCallScore`, `useCallPacing`, `useTalkListen`, `useCallQuestions`, `useFillerWords`, `useMeetingAnalytics`

---

## 2. Training Scores

**Status: EXISTS — distributed across three tables (no single drill_score table)**

### `pitches` table
| Column | Notes |
|---|---|
| `user_id` | Rep key |
| `training_session_id` | Session key |
| `score` | numeric 0–100 |
| `meddic_scores` | jsonb — competency breakdown |
| `created_at` | Timestamp |

### `training_attempts` table
| Column | Notes |
|---|---|
| `rep_id` | → `profiles.id` |
| `scenario_id` | → `training_sessions.id` |
| `attempt_number` | Int |
| `score` | numeric |
| `passed` | boolean |
| `attempted_at` | timestamptz |

Org derived via `rep_id → profiles.org_id`.

### `dispatched_drills` table
| Column | Notes |
|---|---|
| `user_id` | Rep key |
| `pitch_id` | Optional → `pitches.id` |
| `score` | numeric |
| `completed_at` | timestamptz |
| `difficulty`, `drill_type`, `focus_area` | Drill metadata |
| `weakness_identified`, `success_requirement` | Coaching context |

**Aggregation pattern used by correlation engine:** `MAX(pitch.score)` per `training_session_id` (credits best attempt, not average), then averages across sessions per rep.

---

## 3. Deal Outcome Data

**Status: EXISTS — manual entry only, no CRM sync**

- **Table:** `deal_outcomes` (RLS migration 20260412000002; CREATE TABLE likely in Supabase dashboard)
- **Edge function:** `supabase/functions/deal-outcomes/index.ts` (~12 KB)
- **Client page:** `src/features/revenue-intelligence/DealOutcomesPage.tsx` (~27 KB)

**Inferred columns from edge function:**

| Column | Notes |
|---|---|
| `id` | UUID |
| `org_id` | Org key |
| `user_id` | Who logged it |
| `deal_name` | text |
| `outcome` | enum: `won` \| `lost` \| `stalled` |
| `deal_value_gbp` | numeric |
| `closed_at` | date |
| `notes` | text |
| `associated_pitch_ids` | UUID[] — links to pitches for correlation |
| `created_at` | timestamptz |

**Edge function actions:** `list_outcomes`, `log_outcome`, `delete_outcome`, `get_correlation` (Claude AI analysis), `ingest_from_crm` (**stub — returns 0, not implemented**)

**What is absent:**
- No CRM webhook/sync (Salesforce, HubSpot)
- No automatic deal-to-pitch linking
- No pipeline stage data (only closed outcomes: won/lost/stalled)
- `get_correlation` requires ≥1 logged outcome to activate

---

## 4. Revenue Intelligence Dashboard

**File:** `src/features/revenue-intelligence/RevenueIntelligencePage.tsx` (~15 KB)

**Architecture:** `RevenueIntelligencePage` → `TierGate` → `RevenueIntelDashboard`

**Sections rendered:**

| Section | Data source | Status |
|---|---|---|
| Missed Revenue | `revenue-intelligence/missed-opportunities` → `missed_opportunities` table | Functional |
| Pipeline Health | `revenue-intelligence/pipeline` → `prospect_profiles` | Functional |
| Competitive Intelligence | `revenue-intelligence/competitive` → `competitor_profiles` | Functional |
| Prospect Profiles | No query — enriched from call signal data | **Placeholder — not yet populated** |
| Business Synergies | `revenue-intelligence/synergies` → `business_synergies` | Functional |
| Deal Outcomes | `deal-outcomes?action=list_outcomes` | Functional (manual entry only) |
| CRM Automation | No query | **Stub — no automation implemented** |

**Data refresh:** Manual refresh button triggers 4 parallel fetches.

**Tier gate:** `isRevIntel` flag required; non-RI tier sees blurred 6-card skeleton preview. Admin role bypasses gate.

---

## 5. Data Gaps by Feature

### Transfer Gap Analysis (north star)

Transfer gap = delta between rep training performance and live call performance on the same competencies.

**Data available:**
- Training competency scores: `pitches.meddic_scores` (jsonb), `training_attempts.score`
- Live call competency scores: `live_scores.discovery_score`, `live_scores.objection_handling_score`, `live_scores.engagement_score`, `live_scores.talk_ratio_score`

**Gaps:**
1. **No shared competency key** — training scores use MEDDIC framework keys inside `meddic_scores` jsonb; live call scores are flat numeric columns with different names. A mapping/normalisation layer is needed before a delta can be computed.
2. **No unified rep performance view** — scores live in separate tables with no single joined query materialised anywhere.
3. **No time-windowed aggregation** — Transfer Gap needs rolling averages (e.g. last 30 days training vs last 30 days calls) to show trend direction, not just point-in-time delta.
4. **No gap score table** — nowhere to persist computed gap scores for charting or alerting.
5. **No drill recommendation engine** — once a gap is identified, there is no mechanism to surface a targeted drill.

**Minimum to build:**
- Supabase function or SQL view that joins `pitches.meddic_scores` → mapped to call score dimensions → computes delta per rep per competency
- A `transfer_gap_scores` table (or materialised view) to store results
- Client component in `src/features/revenue-intelligence/`

---

### Deal Correlation

Correlation = relationship between training/call performance metrics and deal outcomes (won/lost).

**Data available:**
- `deal_outcomes.associated_pitch_ids` links outcomes to pitches
- `pitches.score`, `pitches.meddic_scores` are accessible via those IDs
- `deal_outcomes.get_correlation` action exists in edge function — calls Claude AI with raw data

**Gaps:**
1. **No CRM feed** — all outcomes are manually logged; sample sizes may be too small for meaningful correlation in early orgs.
2. **No call-to-deal linkage** — `live_scores` has no `deal_outcome_id` or `deal_name` foreign key. Live call performance cannot currently be linked to a deal result without manual association.
3. **No structured correlation output table** — `get_correlation` returns Claude AI prose; there is no `correlation_results` table storing numeric correlation coefficients or ranked feature importance.
4. **No minimum sample guardrail** — correlation is meaningless below ~10 outcomes; no floor is enforced in the function.

**Minimum to build:**
- `live_scores` → `deal_outcomes` linkage column (e.g. `deal_outcome_id` on `live_scores`, or `call_ids` array on `deal_outcomes`)
- Structured output schema for correlation results (feature, direction, strength)
- Client visualisation (scatter/bar) in RI dashboard

---

### AI Revenue Coaching

Coaching = personalised, data-driven recommendations surfaced to a rep based on their gap profile and deal outcomes.

**Data available:**
- `live_scores.coaching_events` — live nudges already fired during calls
- `dispatched_drills` table — drill dispatch mechanism already exists
- `pitches.meddic_scores` — competency-level training profile
- Claude AI already used in `deal-outcomes/get_correlation` and correlation-engine

**Gaps:**
1. **No rep coaching profile** — no table or view that aggregates a rep's strengths and weaknesses across training + live calls into a persistent profile.
2. **No recommendation engine** — there is no function that reads gap scores and outputs prioritised coaching actions.
3. **No coach-facing UI** — no manager dashboard section shows per-rep coaching priorities or tracks coaching actions taken.
4. **No feedback loop** — after a coaching recommendation is acted on (drill completed, call scored), there is no mechanism to measure whether the gap closed.
5. **No scheduled coaching digest** — `AI Coaching Digests` is listed in `capabilitiesData.ts` as a core feature but no scheduled function or email/notification system was found.

**Minimum to build:**
- `rep_coaching_profiles` table (rep_id, org_id, competency scores, priority gaps, last_updated)
- Supabase function: reads transfer gap + deal correlation → generates prioritised coaching plan via Claude AI → stores structured output
- Client component: manager view (rep roster + coaching priorities) + rep self-view (my coaching plan)

---

## Summary

| Prerequisite | Status | Build needed? |
|---|---|---|
| Live call scores | ✅ Prod-ready (`live_scores` table, full scoring pipeline) | No |
| Training scores | ✅ Prod-ready (3 tables: `pitches`, `training_attempts`, `dispatched_drills`) | No |
| Deal outcomes | ⚠️ Manual entry only — no CRM sync, no call linkage | Linkage columns needed |
| RI dashboard shell | ✅ Exists with tier gate, 7 sections, 4 API routes | No — extend existing |
| Competency key mapping (training ↔ live) | ❌ Absent | Required for Transfer Gap |
| Unified rep performance view | ❌ Absent | Required for Transfer Gap + Coaching |
| `transfer_gap_scores` table | ❌ Absent | Required for Transfer Gap |
| Call → deal linkage | ❌ Absent | Required for Deal Correlation |
| Structured correlation output | ❌ Absent | Required for Deal Correlation |
| `rep_coaching_profiles` table | ❌ Absent | Required for AI Coaching |
| Coaching recommendation function | ❌ Absent | Required for AI Coaching |
| Coach-facing UI component | ❌ Absent | Required for AI Coaching |
