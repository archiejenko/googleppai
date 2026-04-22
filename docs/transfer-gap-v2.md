# Transfer Gap v2: Multi-Dimensional Rep Performance Scoring

## Overview

Transfer Gap v2 measures rep effectiveness through 7 simulation-derived metrics computed from `account_states` and `call_summaries`. Each metric is calculated per rep, per time period (weekly, monthly, quarterly) and stored in `rep_performance_snapshots`.

## Metrics

### 1. stage_progression_rate

**Measures:** Can the rep move deals forward?

**Computation:** Percentage of simulated accounts that advance at least one stage within the period.

Stage ordering: `cold → discovery → evaluation → negotiation → closed_won`. Terminal states (`closed_lost`, `ghosted`) are not counted as advancement.

```
stage_progression_rate = accounts_that_advanced / accounts_with_call_count_>=_2
```

**Source:** `account_states.current_stage`, `account_states.call_count`

### 2. credibility_maintenance

**Measures:** Does the rep keep their word and demonstrate competence?

**Computation:** Average `credibility_score` across all active (non-terminal) accounts for the rep in the period.

```
credibility_maintenance = AVG(relationship_notes->credibility_score) across active accounts
```

**Source:** `account_states.relationship_notes.credibility_score`

**Scale:** 0–100. Starts at 50. +5 per positive credibility event, -10 per negative.

### 3. commitment_follow_through

**Measures:** Does the rep do what they say?

**Computation:** Percentage of commitments marked fulfilled vs total commitments made by the rep across all accounts.

```
commitment_follow_through = SUM(commitments_fulfilled) / SUM(commitments_made_by_rep)
```

**Source:** `account_states.relationship_notes.commitments_made_by_rep`, `account_states.relationship_notes.commitments_fulfilled`

### 4. objection_resolution_rate

**Measures:** Can the rep handle pushback?

**Computation:** Percentage of objections where `handled_well = true` across all call summaries in the period.

```
objection_resolution_rate = COUNT(handled_well=true) / COUNT(all objections)
```

**Source:** `call_summaries.objections_raised`

### 5. rapport_building_speed

**Measures:** How quickly does the rep build trust?

**Computation:** Average number of calls to reach `rapport_level >= 3`. Reconstructed by replaying call quality signals from `call_summaries` in call_number order.

```
rapport_building_speed = AVG(call_number when rapport first >= 3)
```

Lower is better. Accounts that never reach rapport_level 3 are excluded.

**Source:** `call_summaries.call_quality_signals`, `account_states.call_count`

### 6. simulated_conversion_rate

**Measures:** Can the rep close?

**Computation:** Percentage of accounts reaching `closed_won` vs total accounts with 3+ calls.

```
simulated_conversion_rate = COUNT(closed_won) / COUNT(call_count >= 3)
```

**Source:** `account_states.current_stage`, `account_states.call_count`

### 7. avg_sentiment_trajectory

**Measures:** Does the rep leave buyers feeling better or worse?

**Computation:** Average `sentiment_delta` per call across all accounts in the period.

```
avg_sentiment_trajectory = AVG(sentiment_delta) across all call_summaries in period
```

Positive = rep consistently improves buyer sentiment. Negative = rep tends to damage rapport.

**Source:** `call_summaries.sentiment_delta`

## Period Types

- **Weekly:** ISO week boundaries (Monday–Sunday)
- **Monthly:** Calendar month boundaries
- **Quarterly:** Q1 (Jan–Mar), Q2 (Apr–Jun), Q3 (Jul–Sep), Q4 (Oct–Dec)

## Storage

All 7 metrics stored as a JSON object in `rep_performance_snapshots.scores`:

```json
{
  "stage_progression_rate": 0.65,
  "credibility_maintenance": 72.3,
  "commitment_follow_through": 0.80,
  "objection_resolution_rate": 0.55,
  "rapport_building_speed": 2.4,
  "simulated_conversion_rate": 0.35,
  "avg_sentiment_trajectory": 3.2
}
```

## Interpretation Guide

| Metric | Good | Watch | Critical |
|--------|------|-------|----------|
| stage_progression_rate | > 60% | 40–60% | < 40% |
| credibility_maintenance | > 65 | 45–65 | < 45 |
| commitment_follow_through | > 75% | 50–75% | < 50% |
| objection_resolution_rate | > 60% | 40–60% | < 40% |
| rapport_building_speed | < 3 calls | 3–5 calls | > 5 calls |
| simulated_conversion_rate | > 40% | 20–40% | < 20% |
| avg_sentiment_trajectory | > +3 | 0 to +3 | < 0 |
