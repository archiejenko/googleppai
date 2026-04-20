# Competency Mapping — Training Sources vs Live Call Scores

_Generated: 2026-04-18. Source: codebase audit only._

---

## Field inventory by table

### `pitches.meddic_scores` (jsonb column)
Keys written by scoring functions — all numeric:

| Key | What it measures |
|---|---|
| `metrics` | Rep's ability to quantify business value / ROI |
| `economicBuyer` | Economic buyer identification and engagement |
| `decisionCriteria` | Understanding of prospect's evaluation criteria |
| `decisionProcess` | Mapping the buying process and timeline |
| `identifyPain` | Discovery depth — identifying business pain |
| `champion` | Champion qualification and mobilisation |

### `pitches` (other score columns)
| Column | Type | What it measures |
|---|---|---|
| `score` | numeric | Overall pitch score (composite) |
| `confidence_score` | numeric | Rep vocal confidence |
| `clarity_score` | numeric | Message clarity |
| `talk_time_ratio` | numeric | Rep talk share (same concept as `rep_talk_pct`) |

### `deal_meddic` (standalone table — deal-level, not training)
Note: this table is deal-scoped, not rep/training-scoped. Listed for completeness.

| Column | What it measures |
|---|---|
| `metrics_score` | Metrics qualification on a specific deal |
| `economic_buyer_score` | Economic buyer qualification |
| `decision_criteria_score` | Decision criteria qualification |
| `decision_process_score` | Decision process qualification |
| `pain_score` | Pain qualification |
| `champion_score` | Champion qualification |
| `meddic_completion_pct` | % of MEDDIC framework completed |

### `training_attempts`
| Column | Type | Notes |
|---|---|---|
| `score` | numeric | Single composite score — no sub-scores |
| `fail_point` | text | Freetext description of where attempt failed — not a numeric competency field |
| `passed` | boolean | Pass/fail |

No competency breakdown. Unsuitable as a direct mapping source.

### `dispatched_drills`
| Column | Type | Notes |
|---|---|---|
| `score` | integer | Single composite score — no sub-scores |
| `focus_area` | text | **Names the competency being drilled** (e.g. "objection_handling", "discovery") |
| `drill_type` | text | Type of drill |
| `weakness_identified` | text | Freetext weakness label |

`focus_area` is a text label, not a numeric sub-score. Can be used as a lookup key to route drill completions to live score dimensions but requires an explicit text→column mapping table.

### `live_scores` (full column list)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `call_id` | uuid | |
| `rep_id` | uuid | FK → profiles |
| `org_id` | uuid | FK → organisations |
| `call_started_at` | timestamptz | |
| `duration_secs` | numeric | |
| `prospect_name` | text | |
| `company_name` | text | |
| `overall_score` | numeric | Composite |
| `final_score` | numeric | Composite (alias or post-processed) |
| `composite_score` | numeric | Composite |
| `talk_ratio_score` | numeric | **Competency score** |
| `discovery_score` | numeric | **Competency score** |
| `engagement_score` | numeric | **Competency score** |
| `objection_handling_score` | numeric | **Competency score** |
| `pacing_score` | numeric | **Competency score** |
| `question_quality_score` | numeric | **Competency score** |
| `rep_talk_pct` | numeric | Raw talk ratio |
| `prospect_talk_pct` | numeric | Raw talk ratio |
| `avg_speech_rate_wpm` | numeric | Raw pacing |
| `speech_rate_variance` | numeric | Raw pacing |
| `filler_word_count` | integer | Raw filler metric |
| `filler_rate_per_min` | numeric | Raw filler metric |
| `filler_words_breakdown` | jsonb | Per-word counts |
| `implication_question_rate` | numeric | Raw question metric |
| `next_step_confirmed` | boolean | Commitment detection |
| `next_step_text` | text | |
| `next_step_date_mentioned` | boolean | |
| `call_stage` | text | |
| `qualified` | boolean | |
| `signals_detected` | jsonb | `Record<string, boolean>` |
| `coaching_events` | jsonb | `{nudge, category}[]` |
| `sentiment_curve` | jsonb | `{t, sentiment}[]` |
| `objection_log` | jsonb | `{t, text, handled}[]` |
| `session_snapshots` | jsonb | |

---

## Competency mapping table

| Live call competency | `live_scores` column | Training source | Training field | Match confidence |
|---|---|---|---|---|
| Talk ratio | `talk_ratio_score` | `pitches` | `talk_time_ratio` | **Approximate** — same concept (rep talk share), different column name and possibly different normalisation |
| Discovery / Pain identification | `discovery_score` | `pitches.meddic_scores` | `identifyPain` | **Approximate** — MEDDIC "Identify Pain" is the closest semantic match; discovery_score also captures question depth which `identifyPain` does not |
| Metrics / Value articulation | _(no live column)_ | `pitches.meddic_scores` | `metrics` | N/A — no live call equivalent |
| Economic buyer | _(no live column)_ | `pitches.meddic_scores` | `economicBuyer` | N/A — no live call equivalent |
| Decision criteria | _(no live column)_ | `pitches.meddic_scores` | `decisionCriteria` | N/A — no live call equivalent |
| Decision process | _(no live column)_ | `pitches.meddic_scores` | `decisionProcess` | N/A — no live call equivalent |
| Champion | _(no live column)_ | `pitches.meddic_scores` | `champion` | N/A — no live call equivalent |
| Vocal confidence | _(no live column)_ | `pitches` | `confidence_score` | N/A — no live call equivalent |
| Message clarity | _(no live column)_ | `pitches` | `clarity_score` | N/A — no live call equivalent |
| Engagement | `engagement_score` | _(none)_ | — | **Unmapped** |
| Objection handling | `objection_handling_score` | `dispatched_drills` | `focus_area` (text: "objection_handling") | **Unmapped (text only)** — `focus_area` names the competency but stores no numeric score for it |
| Pacing | `pacing_score` | _(none)_ | — | **Unmapped** |
| Question quality | `question_quality_score` | _(none)_ | — | **Unmapped** |
| Next step commitment | `next_step_confirmed` | _(none)_ | — | **Unmapped** (boolean, not scored) |
| Filler word rate | `filler_rate_per_min` | _(none)_ | — | **Unmapped** |

---

## Summary

**Mapped (with caveats):** 2 of 8 live competency scores have approximate training equivalents.

- `talk_ratio_score` ↔ `pitches.talk_time_ratio` — same concept, different name. Requires normalisation check before computing delta.
- `discovery_score` ↔ `pitches.meddic_scores.identifyPain` — closest semantic match but not equivalent in scope.

**Unmapped live competencies (6):** `engagement_score`, `objection_handling_score`, `pacing_score`, `question_quality_score`, `next_step_confirmed`, `filler_rate_per_min` — no numeric training source exists for any of these.

**Unmapped training competencies (7):** `metrics`, `economicBuyer`, `decisionCriteria`, `decisionProcess`, `champion`, `confidence_score`, `clarity_score` — MEDDIC framework competencies have no corresponding live call score columns.

**Root cause of gap:** Training scoring uses the MEDDIC framework (deal qualification skills). Live call scoring measures behavioural/delivery skills (pacing, engagement, objection response). The two frameworks measure largely orthogonal skill sets with only `discovery` and `talk_ratio` as overlap candidates.

**Implication for Transfer Gap Analysis:** A direct numeric delta between training and live scores is only possible for 2 dimensions. To cover the full competency set, either:
1. Add MEDDIC sub-scores to the live call scorer (measures whether the rep executes MEDDIC steps on live calls), or
2. Add delivery sub-scores (`pacing`, `engagement`, `objection_handling`, `question_quality`) to the training pitch scorer, or
3. Build the gap view as two separate panels: MEDDIC gap (training only) + Delivery gap (live call only) + 2 bridged dimensions.
