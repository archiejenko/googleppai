import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/** Gracefully returns [] if the table doesn't exist yet (error code 42P01). */
async function safeSelect<T>(
  query: ReturnType<ReturnType<ReturnType<typeof createClient>["from"]>["select"]>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    if (error.code === "42P01") return []; // table doesn't exist yet
    throw error;
  }
  return (data ?? []) as T[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  function ok(data: unknown) {
    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  function err(message: string, status = 500) {
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Missing authorization header", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate user
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();

    if (authError || !user) return err("Unauthorized", 401);

    // Rate limit: 20 req/min burst, 200/hr sustained — per user
    const { data: isAllowed, error: rateLimitError } = await supabase
      .rpc("check_rate_limit_hardened", {
        dimension_keys:           [`user:${user.id}`],
        cost:                     1,
        burst_limit:              20,
        burst_window_seconds:     60,
        sustained_limit:          200,
        sustained_window_seconds: 3600,
      });
    if (rateLimitError) {
      console.error("[revenue-intelligence] rate limit check failed:", rateLimitError);
    } else if (!isAllowed) {
      return err("Too many requests", 429);
    }

    // Fetch org_id for scoping all queries
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.org_id ?? null;

    if (!orgId) {
      return err("Forbidden: no org_id resolved for user", 403);
    }

    // Route on URL path: /revenue-intelligence/<sub-path>
    const url = new URL(req.url);
    const subPath = url.pathname.split("/").pop(); // last segment

    // ── MISSED OPPORTUNITIES ──────────────────────────────────────────────────
    if (subPath === "missed-opportunities") {
      const query = supabase
        .from("missed_opportunities")
        .select("id, company_name, deal_value_gbp, recovery_score, lost_reason_category, contact_name, last_signal_date")
        .order("recovery_score", { ascending: false })
        .limit(50);

      const rows = await safeSelect(query.eq("org_id", orgId));
      return ok(rows);
    }

    // ── PIPELINE HEALTH ───────────────────────────────────────────────────────
    if (subPath === "pipeline") {
      const query = supabase
        .from("prospect_profiles")
        .select("id, company_name, deal_value_gbp, stage, probability, signal_score")
        .not("stage", "in", '("closed_won","closed_lost")')
        .order("deal_value_gbp", { ascending: false })
        .limit(100);

      const deals = await safeSelect<{
        id: string;
        company_name: string;
        deal_value_gbp: number | null;
        stage: string | null;
        probability: number | null;
        signal_score: number | null;
      }>(query.eq("org_id", orgId));

      const totalValue = deals.reduce((s, d) => s + (d.deal_value_gbp ?? 0), 0);
      const avgValue = deals.length > 0 ? Math.round(totalValue / deals.length) : 0;

      return ok({
        open_deals_count: deals.length,
        total_pipeline_value_gbp: totalValue,
        avg_deal_value_gbp: avgValue,
        deals: deals.map(d => ({
          id: d.id,
          company_name: d.company_name ?? "Unknown",
          deal_value_gbp: d.deal_value_gbp ?? 0,
          stage: d.stage ?? "unknown",
          probability: d.probability ?? 0,
          signal_score: d.signal_score ?? undefined,
        })),
      });
    }

    // ── COMPETITIVE INTELLIGENCE ──────────────────────────────────────────────
    if (subPath === "competitive") {
      const query = supabase
        .from("competitor_profiles")
        .select("id, competitor_name, mention_count, win_rate, loss_rate, common_objections, battlecard_notes, last_mentioned_at")
        .order("mention_count", { ascending: false })
        .limit(50);

      const rows = await safeSelect(query.eq("org_id", orgId));
      return ok(rows);
    }

    // ── BUSINESS SYNERGIES ────────────────────────────────────────────────────
    if (subPath === "synergies") {
      const query = supabase
        .from("business_synergies")
        .select("id, account_a, account_b, opportunity_type, confidence_score, recommended_action, detected_at, status")
        .order("confidence_score", { ascending: false })
        .limit(100);

      const rows = await safeSelect(query.eq("org_id", orgId));
      return ok(rows);
    }

    return err(`Unknown sub-path: ${subPath}`, 404);
  } catch (error) {
    return err(error.message);
  }
});
