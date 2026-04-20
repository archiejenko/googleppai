# RI Backend Verification

Audit date: 2026-04-20
Auditor: Claude (automated)

## Migrations

No new migration files were added after `20260418120000_transfer_gap_and_coaching.sql`.

| Filename | Applied | Schema Match | Notes |
|----------|---------|-------------|-------|
| 20260418120000_transfer_gap_and_coaching.sql | Yes | Partial | Creates `transfer_gap_scores` and `rep_coaching_profiles` (both confirmed in remote DB). Adds `deal_outcomes.live_score_session_id` (confirmed). Does NOT create `transfer_gap_benchmarks` or `win_loss_analysis` — these tables do not exist. |

### Missing tables

- **transfer_gap_benchmarks** — does not exist in remote DB. No migration creates it. No file references it.
- **win_loss_analysis** — does not exist in remote DB. No migration creates it. No file references it.

### Missing columns on `organisations`

The remote `organisations` table has: `id, name, slug, tier, seats_licensed, price_per_seat_gbp, onboarding_fee_paid, onboarding_fee_amount_gbp, stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at, updated_at, weekly_target, payment_failed`.

Missing spec'd columns:
- **industry** — not present (exists on `deployment_requests`, not `organisations`)
- **company_size** — not present
- **meddic_weightings** — not present anywhere in the codebase

### Missing columns / index on `deal_outcomes`

Remote `deal_outcomes` columns: `id, user_id, deal_session_id, deal_name, outcome, deal_value, close_date, notes, created_at, live_score_session_id`.

- **crm_deal_id** — not present
- **org_id** — not present (the edge function assumes it exists and queries it, but the column is missing — this is a runtime bug)
- **deal_value_gbp** — not present (column is `deal_value`)
- **closed_at** — not present (column is `close_date`)
- **associated_pitch_ids** — not present
- Partial unique index on `crm_deal_id` — does not exist

## Edge Functions

| Function | File Exists | Deployed | Tier Check | Notes |
|----------|-------------|----------|------------|-------|
| benchmark-aggregator | **No** | **No** | N/A | Function does not exist anywhere in the codebase |
| win-loss-analysis | **No** | **No** | N/A | Function does not exist anywhere in the codebase |
| transfer-gap | Yes | Yes (v1) | Yes (revenue_intelligence) | Does NOT fetch meddic_weightings — uses flat average only (see Weighted MEDDIC below) |
| deal-outcomes | Yes | Yes (v4) | Yes (revenue_intelligence) | Column name mismatches with actual DB schema — will fail at runtime on INSERT (org_id, deal_value_gbp, closed_at, associated_pitch_ids don't exist) |

## Scheduled Jobs

| Job Name | Schedule | Enabled | Notes |
|----------|----------|---------|-------|
| mas-job-cleanup | 0 0 * * * (daily midnight) | Yes | Existing background cleanup |
| pain-point-engine-daily | 0 2 * * * (daily 02:00 UTC) | Yes | Existing |
| coaching-trigger-engine-daily | 30 2 * * * (daily 02:30 UTC) | Yes | Existing |
| deal-risk-engine-daily | 0 3 * * * (daily 03:00 UTC) | Yes | Existing |
| playbook-generator-weekly | 0 4 * * 1 (Mon 04:00 UTC) | Yes | Existing |

Missing scheduled jobs:
- **benchmark-aggregator daily at 03:00 UTC** — not scheduled (function doesn't exist)
- **deal-outcomes CRM sync daily at 04:00 UTC** — not scheduled

## Weighted MEDDIC

- Fetches weightings from `organisations.meddic_weightings`: **No** — column doesn't exist, function doesn't query it
- Applies weighted average when non-uniform: **No** — flat average of all available MEDDIC keys per pitch
- Fallback to flat average when all 1 or null: **N/A** — flat average is the only behaviour

## RLS Policies

### transfer_gap_scores
- SELECT for own user_id: **Yes**
- SELECT for org admin: **Yes**
- INSERT service role only: **Yes**
- UPDATE service role only: **Yes**
- Correct: **Yes**

### rep_coaching_profiles
- SELECT for own user_id: **Yes**
- SELECT for org admin: **Yes**
- INSERT service role only: **Yes**
- UPDATE service role only: **Yes**
- Correct: **Yes**

### win_loss_analysis
- Table does not exist: **No policies to evaluate**

### transfer_gap_benchmarks
- Table does not exist: **No policies to evaluate**

### deal_outcomes (existing, from earlier migration)
- SELECT own + manager/admin: **Yes**
- INSERT/UPDATE/DELETE for own user: **Yes** (authenticated, not service-role-only as spec'd)
- Note: These are user-facing CRUD policies, not the service-role-only policies the spec requires for CRM sync ingestion

## CRM Sync Status

**Blocked as intended — but with issues.**

The `deal-outcomes` function has an `ingest_from_crm` action that returns a placeholder: `{ ingested: 0, message: "CRM integration not yet configured." }`. No real HubSpot or Salesforce API calls exist.

However, the block was NOT cleanly reported:
- No migration adds `crm_deal_id` to `deal_outcomes` as required for CRM sync
- The `deal-outcomes` edge function references columns that don't exist in the actual DB (`org_id`, `deal_value_gbp`, `closed_at`, `associated_pitch_ids`), meaning the `log_outcome` and `list_outcomes` actions will also fail at runtime — not just CRM sync

## Gaps

### Critical (will cause runtime errors)

1. **deal-outcomes column mismatch** — The deployed `deal-outcomes` edge function inserts `org_id`, `deal_value_gbp`, `closed_at`, `associated_pitch_ids` into `deal_outcomes`, but those columns don't exist. The actual columns are `deal_value`, `close_date`, and there is no `org_id` or `associated_pitch_ids`. Every `log_outcome` call will fail.

### Major (spec'd features entirely missing)

2. **transfer_gap_benchmarks table** — not created, no migration, no function
3. **win_loss_analysis table** — not created, no migration, no function
4. **benchmark-aggregator edge function** — does not exist
5. **win-loss-analysis edge function** — does not exist
6. **organisations.meddic_weightings column** — not added
7. **organisations.industry column** — not added (only exists on `deployment_requests`)
8. **organisations.company_size column** — not added
9. **deal_outcomes.crm_deal_id column** — not added
10. **Partial unique index on crm_deal_id** — not created
11. **pg_cron job for benchmark-aggregator** — not scheduled
12. **pg_cron job for deal-outcomes CRM sync** — not scheduled

### Moderate (incomplete implementation)

13. **transfer-gap weighted MEDDIC** — function uses flat average only, does not fetch or apply `organisations.meddic_weightings`
14. **deal_outcomes RLS** — existing policies allow authenticated user CRUD, not service-role-only INSERT/UPDATE as spec requires for CRM sync path
15. **win_loss_analysis RLS** — table doesn't exist so no policies

### Summary

Of the 6 verification areas, only 2 are fully complete:
- Migration `20260418120000` applied: **Yes**
- RLS on `transfer_gap_scores` and `rep_coaching_profiles`: **Yes**

The remaining 4 areas have significant gaps. The `deal-outcomes` function will fail at runtime due to schema mismatch. The benchmark-aggregator and win-loss-analysis features were never built. The weighted MEDDIC feature was not implemented.
