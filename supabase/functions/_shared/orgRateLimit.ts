import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Circuit breaker configuration ─────────────────────────────────────────────
/**
 * Number of consecutive RPC failures that trip the circuit.
 * Below this threshold calls fail open (logged but allowed through).
 * At or above this threshold the circuit opens and callers receive a 503-
 * equivalent refusal until the reset window elapses.
 */
const CB_FAILURE_THRESHOLD = 3;

/**
 * Milliseconds after the circuit opens before it transitions to HALF-OPEN and
 * allows one trial call through. A single failure in HALF-OPEN immediately
 * re-opens the circuit; a success resets it to CLOSED.
 */
const CB_RESET_WINDOW_MS = 60_000; // 60 seconds

// ── Module-level circuit breaker state (per Edge Function isolate) ─────────────
// These variables live in the Deno module scope — they persist across requests
// within a single warm isolate and reset on cold start. No DB dependency.
let cbConsecutiveFailures = 0;
let cbOpenedAt: number | null = null;

// ── Public types ───────────────────────────────────────────────────────────────

export interface OrgRateLimitResult {
  allowed: boolean;
  /** Human-readable message — suitable for returning to the client on 429/503. */
  message: string;
  /**
   * Recommended HTTP status code for the caller to use when !allowed.
   *   429 — daily budget exhausted (normal limit enforcement)
   *   503 — circuit breaker open (RPC infrastructure degraded)
   *
   * Current call-sites default to 429 when !allowed. Update callers to use
   * `orgLimit.httpStatus ?? 429` to surface the correct status code.
   */
  httpStatus?: 429 | 503;
  daily_calls?: number;
  daily_tokens?: number;
  call_limit?: number;
  token_limit?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns the seconds remaining before the circuit resets.
 * Only meaningful when cbOpenedAt is non-null.
 */
function retryAfterSecs(): number {
  if (cbOpenedAt === null) return 0;
  return Math.max(0, Math.ceil((CB_RESET_WINDOW_MS - (Date.now() - cbOpenedAt)) / 1000));
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Checks whether an org has remaining daily AI budget for the given function.
 * Calls the check_org_ai_limit Postgres function, which atomically reads the
 * current counter and increments it only if the call is allowed.
 *
 * Circuit breaker behaviour on RPC error:
 *   - Failures 1 … CB_FAILURE_THRESHOLD-1: fail open (logged, call allowed)
 *   - Failure CB_FAILURE_THRESHOLD: circuit opens, subsequent calls return
 *     { allowed: false, httpStatus: 503 } without hitting the DB
 *   - After CB_RESET_WINDOW_MS: circuit transitions to HALF-OPEN; one trial call
 *     is allowed. Success → CLOSED. Failure → immediately re-opens.
 *
 * State transitions are logged so failures are visible in Edge Function logs.
 *
 * @param adminClient     Service-role Supabase client (required to call the RPC)
 * @param orgId           The calling user's organisation UUID
 * @param functionName    Logical name for the calling edge function (e.g. 'call-prep')
 * @param estimatedTokens Estimated tokens this call will consume (prompt + max output)
 */
export async function checkOrgAiLimit(
  adminClient: SupabaseClient,
  orgId: string,
  functionName: string,
  estimatedTokens: number,
): Promise<OrgRateLimitResult> {

  // ── 1. Circuit breaker gate ─────────────────────────────────────────────────
  if (cbOpenedAt !== null) {
    const elapsed = Date.now() - cbOpenedAt;

    if (elapsed >= CB_RESET_WINDOW_MS) {
      // Transition to HALF-OPEN: allow one trial call through.
      // Set failures to threshold-1 so a single failure immediately re-opens.
      console.log(
        `[orgRateLimit] circuit breaker HALF-OPEN: reset window elapsed after ` +
        `${Math.round(elapsed / 1000)}s fn=${functionName}`,
      );
      cbOpenedAt = null;
      cbConsecutiveFailures = CB_FAILURE_THRESHOLD - 1;
    } else {
      // Circuit still open — refuse without touching the DB.
      return {
        allowed: false,
        httpStatus: 503,
        message:
          `AI rate limit service temporarily unavailable. ` +
          `Retry in ${retryAfterSecs()}s.`,
      };
    }
  }

  // ── 2. RPC call ─────────────────────────────────────────────────────────────
  const { data, error } = await adminClient.rpc("check_org_ai_limit", {
    p_org_id:        orgId,
    p_function_name: functionName,
    p_tokens:        estimatedTokens,
  });

  // ── 3. Handle RPC error ─────────────────────────────────────────────────────
  if (error) {
    cbConsecutiveFailures++;

    if (cbConsecutiveFailures >= CB_FAILURE_THRESHOLD) {
      // Trip the circuit on the threshold-crossing failure.
      if (cbOpenedAt === null) {
        cbOpenedAt = Date.now();
        console.error(
          `[orgRateLimit] circuit breaker OPENED after ${cbConsecutiveFailures} consecutive failures ` +
          `fn=${functionName} org=${orgId} ts=${new Date().toISOString()}`,
        );
      }
      return {
        allowed: false,
        httpStatus: 503,
        message:
          `AI rate limit service temporarily unavailable. ` +
          `Retry in ${retryAfterSecs()}s.`,
      };
    }

    // Below threshold: fail open so a single transient DB blip doesn't block users.
    console.error(
      `[orgRateLimit] RPC error — failing open ` +
      `(${cbConsecutiveFailures}/${CB_FAILURE_THRESHOLD} consecutive failures before circuit opens) ` +
      `fn=${functionName} org=${orgId} ts=${new Date().toISOString()} ` +
      `err=${error.message}`,
    );
    return { allowed: true, message: "rate limit check unavailable" };
  }

  // ── 4. RPC success: reset circuit breaker if it was tracking failures ────────
  if (cbConsecutiveFailures > 0) {
    console.log(
      `[orgRateLimit] circuit breaker CLOSED: RPC recovered after ` +
      `${cbConsecutiveFailures} failure(s) fn=${functionName}`,
    );
    cbConsecutiveFailures = 0;
    cbOpenedAt = null;
  }

  // ── 5. Evaluate budget response ─────────────────────────────────────────────
  if (!data.allowed) {
    const atCallLimit = (data.daily_calls ?? 0) >= (data.call_limit ?? 500);
    const message = atCallLimit
      ? `Daily call limit reached (${data.call_limit} calls/day). Resets at midnight UTC.`
      : `Daily token budget exhausted. Resets at midnight UTC.`;
    return { allowed: false, httpStatus: 429, message, ...data };
  }

  return { allowed: true, message: "ok", ...data };
}
