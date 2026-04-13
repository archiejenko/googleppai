import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface OrgRateLimitResult {
  allowed: boolean;
  /** Human-readable message — suitable for returning to the client on 429. */
  message: string;
  daily_calls?: number;
  daily_tokens?: number;
  call_limit?: number;
  token_limit?: number;
}

/**
 * Checks whether an org has remaining daily AI budget for the given function.
 * Calls the check_org_ai_limit Postgres function, which atomically reads the
 * current counter and increments it only if the call is allowed.
 *
 * Fails open on infrastructure error (RPC unavailable) so a DB blip doesn't
 * block all AI calls. Log the error and let the call through.
 *
 * @param adminClient  Service-role Supabase client (required to call the RPC)
 * @param orgId        The calling user's organisation UUID
 * @param functionName Logical name for the calling edge function (e.g. 'call-prep')
 * @param estimatedTokens Estimated tokens this call will consume (prompt + max output)
 */
export async function checkOrgAiLimit(
  adminClient: SupabaseClient,
  orgId: string,
  functionName: string,
  estimatedTokens: number,
): Promise<OrgRateLimitResult> {
  const { data, error } = await adminClient.rpc("check_org_ai_limit", {
    p_org_id:        orgId,
    p_function_name: functionName,
    p_tokens:        estimatedTokens,
  });

  if (error) {
    // Fail open: a rate-limit infrastructure failure should not break the product.
    console.error(`[orgRateLimit] RPC error for org=${orgId} fn=${functionName}:`, error);
    return { allowed: true, message: "rate limit check unavailable" };
  }

  if (!data.allowed) {
    const atCallLimit  = (data.daily_calls  ?? 0) >= (data.call_limit  ?? 500);
    const message = atCallLimit
      ? `Daily call limit reached (${data.call_limit} calls/day). Resets at midnight UTC.`
      : `Daily token budget exhausted. Resets at midnight UTC.`;
    return { allowed: false, message, ...data };
  }

  return { allowed: true, message: "ok", ...data };
}
