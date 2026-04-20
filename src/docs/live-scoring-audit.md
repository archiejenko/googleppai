# Live Scoring Pipeline Audit

**Date:** 2026-04-20
**Scope:** End-to-end audit of how live call scores are generated, stored, and displayed.

---

## Trigger and Generation

### call-intelligence-scorer (Edge Function)

**Location:** `supabase/functions/call-intelligence-scorer/index.ts`

**Trigger:** HTTP POST — called externally (no cron, no DB trigger). The caller must supply `call_id`, `org_id`, `rep_id`, `transcript` (word-level array with speaker/start/end/text), and `call_duration_secs`.

**No caller exists in the codebase.** The `telephony-webhook/manual-end` endpoint referenced by `LiveCallContext.endCall()` does not exist as a deployed Edge Function — there is no `supabase/functions/telephony-webhook/` directory. Similarly, the `live-scoring/snapshot` endpoint referenced by the 30-second auto-scoring interval does not exist.

**Scoring logic (5 passes):**

| Pass | What it does | AI model | Writes to |
|------|-------------|----------|-----------|
| L5 | Objection detection + AER response scoring | gpt-4o-mini | `call_objections` |
| L6 | Buying signal detection + capitalisation scoring | gpt-4o-mini | `call_buying_signals` |
| L7 | Next-step commitment detection (rule-based, last 180s) | None | `live_scores.next_step_confirmed`, `.next_step_text`, `.next_step_date_mentioned` |
| L8 | Pacing analysis (30s windows, pure arithmetic) | None | `call_pacing_windows` + `live_scores.avg_speech_rate_wpm`, `.speech_rate_variance`, `.pacing_score` |
| L-R2 | Prospect sentiment scoring | gpt-4o-mini | `call_sentiment` |
| R6 | Meeting Intelligence composite score | gpt-4o-mini (coaching note only) | `meeting_scores` |

**Idempotency:** All passes check whether data already exists before running. Skips entirely if all passes are already scored.

**Coaching triggers:** Two triggers can fire:
- `low_commitment_rate` — if rep's 30-day next-step confirmation rate drops below 60%
- `live_score_drop` — if meeting composite score < 50

### Other functions that read/write live_scores

| Function | Operation |
|----------|-----------|
| `transfer-gap/index.ts` | SELECT (reads scores for gap analysis) |
| `win-loss-analysis/index.ts` | SELECT (reads scores for win/loss correlation) |
| `correlation-engine/index.ts` | SELECT (reads `overall_score` for qualified calls) |
| `gdpr-erasure/index.ts` | DELETE (erases live_scores rows for data subject) |

**No function inserts/creates rows in live_scores.** The call-intelligence-scorer only updates existing rows. The initial row creation is unaccounted for in the codebase.

---

## Session Initiation

### User journey

1. **OastLiveWidget** (`src/components/live/OastLiveWidget.tsx`) is mounted globally in `AppShell.tsx` inside `LiveCallProvider`. It renders as a floating widget (bottom-right, z-9000) when `isRevIntel` tier is active and there's an `activeCall`.

2. **StartLiveSessionButton** is exported from `OastLiveWidget.tsx` but is **only imported/rendered within that same file's module** — no other component in the codebase renders it. There is no visible UI surface (deal page, meetings page, etc.) that actually places this button for a rep to click.

3. When `startCall()` is invoked:
   - Calls `POST /telephony-webhook/manual-start` with `crm_contact_id`
   - **This Edge Function does not exist** — there is no `supabase/functions/telephony-webhook/` directory
   - Expects a `{ call_id }` response
   - Sets local state with `callId`, `prospectName`, `companyName`
   - Initialises AudioContext for TTS playback

4. **PreCallConsent** (`src/components/common/PreCallConsent.tsx`) exists for GDPR compliance — logs to `call_consent_log` before recording starts. However, it is **not wired into the LiveCallContext flow**. The consent component is referenced by `useDeepgramSTT` via its `consentConfirmed` prop, but the actual integration (showing the modal before `startCall`) is not implemented in any component.

5. **endCall()** calls `POST /telephony-webhook/manual-end` with `call_id` and `duration_secs` — also a non-existent endpoint.

### 30-second auto-scoring

`LiveCallContext` runs a 30-second interval that flushes buffered transcript text to `POST /live-scoring/snapshot`. This endpoint also does not exist.

### Keep-warm mechanism

During active calls, pings `POST /unified-ai` every 20 seconds with `x-keepwarm: true` header to prevent Deno cold starts.

---

## Schema

The `live_scores` table has **no CREATE TABLE migration** in the codebase. It is referenced by RLS policies (migration `20260412000002`), indexes (migration `20260412000004`), and a foreign key from `coaching_triggers` (migration `20260418120000`).

### Columns inferred from code usage

| Column | Type (inferred) | Source |
|--------|-----------------|--------|
| `id` | uuid (PK) | Referenced as FK target |
| `call_id` | text/uuid | Used as lookup key everywhere |
| `rep_id` | uuid | FK to profiles, used in RLS + queries |
| `org_id` | uuid | FK to organisations |
| `prospect_name` | text | LiveScoresHistory interface |
| `company_name` | text | LiveScoresHistory interface |
| `call_started_at` | timestamptz | Used for ordering + date filtering |
| `call_ended_at` | timestamptz | useCallSegments select |
| `duration_secs` | integer | LiveScoresHistory interface |
| `overall_score` | numeric | useCallSegments, correlation-engine |
| `final_score` | numeric | LiveScoresHistory, useMeetingAnalytics |
| `composite_score` | numeric | useOnboardingAcceleration |
| `talk_ratio` | numeric | call-intelligence-scorer R6 read |
| `talk_ratio_score` | numeric | LiveScoresHistory, useMeetingAnalytics |
| `rep_talk_pct` | numeric | useCallSegments, useTalkListen |
| `prospect_talk_pct` | numeric | useCallSegments, useTalkListen |
| `discovery_score` | numeric | LiveScoresHistory, useMeetingAnalytics |
| `engagement_score` | numeric | LiveScoresHistory, useMeetingAnalytics |
| `objection_handling_score` | numeric | LiveScoresHistory, useMeetingAnalytics |
| `objection_score` | numeric | call-intelligence-scorer R6 read |
| `question_quality_score` | numeric | call-intelligence-scorer R6, useCallQuestions |
| `implication_question_rate` | numeric | useCallQuestions |
| `filler_word_rate` | numeric | call-intelligence-scorer R6 read |
| `filler_word_count` | integer | useFillerWords |
| `filler_rate_per_min` | numeric | useFillerWords |
| `filler_words_breakdown` | jsonb | useFillerWords |
| `next_step_confirmed` | boolean | Written by call-intelligence-scorer L7 |
| `next_step_text` | text | Written by call-intelligence-scorer L7 |
| `next_step_date_mentioned` | boolean | Written by call-intelligence-scorer L7 |
| `avg_speech_rate_wpm` | numeric | Written by call-intelligence-scorer L8 |
| `speech_rate_variance` | numeric | Written by call-intelligence-scorer L8 |
| `pacing_score` | numeric | Written by call-intelligence-scorer L8 |
| `call_stage` | text | useTalkListen (read + write) |
| `signals_detected` | jsonb | LiveScoresHistory interface |
| `coaching_events` | jsonb | LiveScoresHistory interface |
| `session_snapshots` | jsonb | LiveScoresHistory interface |
| `sentiment_curve` | jsonb | LiveScoresHistory interface |
| `objection_log` | jsonb | LiveScoresHistory interface |

---

## Real-Time vs Post-Call

### Designed for real-time (but not connected)

The architecture is designed for real-time scoring during calls:
- `LiveCallContext` buffers transcript and sends snapshots every 30 seconds
- Supabase Realtime channel listens for `score.snapshot`, `call.qualified`, and `live_score.committed` broadcast events
- `OastLiveWidget` displays live-updating scores from these snapshots

### Actually runs post-call only

- `call-intelligence-scorer` is a **post-call** function — it expects the complete transcript with word-level timing
- It only **updates** existing `live_scores` rows (never creates them)
- The real-time snapshot endpoint (`/live-scoring/snapshot`) does not exist
- The telephony webhook endpoints (`/manual-start`, `/manual-end`) do not exist
- **No mechanism currently creates live_scores rows** — the initial INSERT is missing

---

## Live Call UI

### OastLiveWidget (during-call UI)

**Location:** `src/components/live/OastLiveWidget.tsx`

Renders as a draggable floating panel with:
- **Collapsed pill:** Prospect name, elapsed timer, latest overall score
- **Expanded panel:**
  - Score ring (0-100 with color coding)
  - Score bars: Talk Ratio, Discovery, Engagement, Objections
  - Signal tags: Budget, Timeline, Pain, Buying, Competitor
  - Coaching nudge feed (last 3 nudges)
  - "End" button, "Full analysis" link to `/live-scores`
- Auto-expands when call qualifies
- End state shows "Call complete - score committed"

### Deepgram STT integration

**Location:** `src/hooks/useDeepgramSTT.ts`

- Uses Deepgram Nova-2 model for real-time speech-to-text
- Streams raw PCM (16kHz mono) via WebSocket
- Fires `onFinalTranscript` on 300ms silence (UtteranceEnd)
- Token refresh every 45s (10-second TTL keys from `/deepgram-token`)
- Consent gate: requires `consentConfirmed` before starting

**Gap:** `useDeepgramSTT` is defined but **not imported or used** by any component. The hook is not connected to `LiveCallContext.pushTranscriptChunk()`.

---

## Post-Call UI

### LiveScoresHistory

**Location:** `src/features/live-scores/LiveScoresHistory.tsx`
**Route:** `/live-scores`

A paginated table showing completed call scores with:
- Date, Prospect, Company, Duration, Final Score, Top Signal
- Expandable rows showing: score breakdown (4 dimensions), coaching nudges, signals detected, objection log
- Filters by score range (High/Mid/Low) and signal type
- CSV export
- Realtime subscription for new scores via Supabase postgres_changes
- Tier-gated (requires Rev Intel tier)

### Other post-call consumers

- `useMeetingAnalytics` — 30-day score averages
- `useTalkListen` — talk ratio history
- `useCallQuestions` — question quality trends
- `useCallPacing` — pacing score trends
- `useFillerWords` — filler word analysis
- `useNextStepCommitmentRate` — commitment rate tracking
- `useOnboardingAcceleration` — new rep score progression
- `useCallSegments` — detailed call segment data
- `CallsDashboard`, `RepPerformanceMatrix`, `CoachingQueue`, `WeeklyCoachingSummary` — all read from live_scores

---

## Deepgram

### Integration status: Partial

**Token service (complete):** `supabase/functions/deepgram-token/index.ts`
- Issues 10-second TTL Deepgram API keys
- Rate-limited: 20 tokens/user/hour (burst: 5/minute)
- Requires valid Supabase JWT
- Never exposes master key to client

**Client hook (complete but unwired):** `src/hooks/useDeepgramSTT.ts`
- Real-time STT via Deepgram WebSocket (Nova-2 model)
- Captures browser microphone, downmixes to mono 16kHz PCM
- Handles interim + final transcripts, utterance end detection
- Auto-refreshes token every 45s

**Consent gate (complete but unwired):** `src/components/common/PreCallConsent.tsx`
- GDPR Article 6 compliance modal
- Logs consent to `call_consent_log`

**TTS migration:** `supabase/migrations/20260418000002_migrate_voice_ids_to_deepgram.sql` exists, suggesting Deepgram is also used for TTS (text-to-speech), separate from the STT pipeline.

### What's missing

The Deepgram STT hook is not connected to the live call flow. No component:
1. Renders `useDeepgramSTT` during a live call
2. Pipes its `onFinalTranscript` output into `LiveCallContext.pushTranscriptChunk()`
3. Renders `PreCallConsent` before starting the recording

---

## Gaps

### Critical (pipeline broken)

1. **No row creation for live_scores.** `call-intelligence-scorer` only updates existing rows. No function or endpoint creates the initial `live_scores` row when a call starts. Without this, no scoring can occur.

2. **Missing Edge Functions.** Three endpoints referenced by `LiveCallContext` do not exist:
   - `telephony-webhook/manual-start` — creates call session
   - `telephony-webhook/manual-end` — ends call session, triggers post-call scoring
   - `live-scoring/snapshot` — processes 30-second transcript snapshots

3. **No CREATE TABLE migration.** The `live_scores` table has no DDL in the migration history. It's referenced by RLS policies, indexes, and FKs but never formally created.

### Major (features built but not connected)

4. **StartLiveSessionButton not rendered anywhere.** The button component exists but is only exported — no page, deal view, or navigation element actually places it in the UI for reps to click.

5. **useDeepgramSTT not integrated.** The hook is fully implemented but no component imports it or connects it to the live call transcript pipeline.

6. **PreCallConsent not integrated.** The consent modal exists but is not shown before live recording starts.

### Minor

7. **Schema ambiguity.** Multiple score columns exist with unclear relationships: `overall_score` vs `final_score` vs `composite_score`. No documentation on which is authoritative.

8. **Dual speaker labels.** `call-intelligence-scorer` L-R2 sentiment pass filters for `speaker === 'B' || speaker === 'PROSPECT'`, while all other passes use `speaker === 'prospect'` or `speaker === 'rep'`. Inconsistent speaker label handling.

9. **ScriptProcessorNode deprecation.** `useDeepgramSTT` uses the deprecated ScriptProcessorNode API. Comment notes it should be replaced with AudioWorklet.

10. **Keep-warm pings unified-ai only.** The keep-warm interval pings `/unified-ai` but not `/live-scoring/snapshot` or `/tts-generate` (despite the comment mentioning tts-generate).
