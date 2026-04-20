import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: "Service role only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    const { data: orgs } = await supabase
      .from("organisations")
      .select("id")
      .eq("tier", "revenue_intelligence");

    let alertsGenerated = 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    for (const org of orgs ?? []) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", org.id);

      for (const profile of profiles ?? []) {
        const { data: currentScores } = await supabase
          .from("transfer_gap_scores")
          .select("delivery_gap_score, readiness_gap_score")
          .eq("user_id", profile.id)
          .gte("computed_at", sevenDaysAgo)
          .order("computed_at", { ascending: false })
          .limit(1);

        const { data: priorScores } = await supabase
          .from("transfer_gap_scores")
          .select("delivery_gap_score, readiness_gap_score")
          .eq("user_id", profile.id)
          .gte("computed_at", fourteenDaysAgo)
          .lt("computed_at", sevenDaysAgo)
          .order("computed_at", { ascending: false })
          .limit(1);

        const current = currentScores?.[0];
        const prior = priorScores?.[0];

        if (!current || !prior) continue;

        const deltaDelivery = (current.delivery_gap_score ?? 0) - (prior.delivery_gap_score ?? 0);
        const deltaReadiness = (current.readiness_gap_score ?? 0) - (prior.readiness_gap_score ?? 0);

        const deliveryWidened = deltaDelivery > 10;
        const readinessWidened = deltaReadiness > 10;

        if (!deliveryWidened && !readinessWidened) continue;

        const alertType = deliveryWidened && readinessWidened
          ? "both_widened"
          : deliveryWidened
            ? "delivery_gap_widened"
            : "readiness_gap_widened";

        await supabase.from("transfer_gap_alerts").insert({
          org_id: org.id,
          user_id: profile.id,
          alert_type: alertType,
          previous_delivery_gap: prior.delivery_gap_score,
          current_delivery_gap: current.delivery_gap_score,
          previous_readiness_gap: prior.readiness_gap_score,
          current_readiness_gap: current.readiness_gap_score,
          delta_delivery: deltaDelivery,
          delta_readiness: deltaReadiness,
        });

        alertsGenerated++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, alerts_generated: alertsGenerated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[transfer-gap-alerts] unhandled error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
