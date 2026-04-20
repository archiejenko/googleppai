import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logTokenUsage } from "../_shared/tokenUsage.ts";

const MODEL = "claude-sonnet-4-6";

interface TransferGapRow {
  delivery_gap_score: number | null;
  readiness_gap_score: number | null;
  talk_ratio_training: number | null;
  talk_ratio_live: number | null;
  discovery_training: number | null;
  discovery_live: number | null;
  meddic_avg: number | null;
  deal_win_rate: number | null;
  insufficient_deal_data: boolean;
  proxy_only: boolean;
  period_start: string;
  period_end: string;
}

interface CoachingRecommendation {
  title: string;
  detail: string;
  drill_type: "roleplay" | "pitch" | "meddic" | "discovery";
  priority: 1 | 2 | 3;
}

interface CoachingResponse {
  primary_gap: "delivery" | "readiness" | "both" | "none";
  top_recommendation: string;
  recommendations: CoachingRecommendation[];
}

function derivePrimaryGap(
  delivery: number | null,
  readiness: number | null,
): CoachingResponse["primary_gap"] {
  if (delivery === null && readiness === null) return "none";
  if (delivery === null) return "readiness";
  if (readiness === null) return "delivery";
  if (delivery > readiness + 20) return "delivery";
  if (readiness > delivery + 20) return "readiness";
  if (delivery > 60 && readiness > 60) return "both";
  return "none";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  function ok(data: unknown) {
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  function err(message: string, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();

    if (authError || !user) return err("Unauthorized", 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    const orgId = profile?.org_id ?? null;
    if (!orgId) return err("Forbidden: no org_id resolved for user", 403);

    const { data: org } = await supabase
      .from("organisations")
      .select("tier")
      .eq("id", orgId)
      .single();

    if (org?.tier !== "revenue_intelligence") {
      return err("Revenue Intelligence tier required", 403);
    }

    const url = new URL(req.url);
    const periodDays = url.searchParams.get("period_days") ?? "30";
    const requestedUserId = url.searchParams.get("user_id");

    let targetUserId = user.id;
    if (requestedUserId && requestedUserId !== user.id) {
      if (profile?.role !== "admin") return err("Forbidden", 403);
      targetUserId = requestedUserId;
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return err("ANTHROPIC_API_KEY not configured", 500);

    // Fetch transfer gap scores by calling the transfer-gap function internally
    const transferGapUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/transfer-gap?period_days=${periodDays}&user_id=${targetUserId}`;
    const transferGapRes = await fetch(transferGapUrl, {
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    if (!transferGapRes.ok) {
      console.error("[ai-revenue-coaching] transfer-gap call failed:", await transferGapRes.text());
      return err("Failed to fetch transfer gap data", 502);
    }

    const transferGapJson = await transferGapRes.json();
    const gap: TransferGapRow = transferGapJson.data;

    if (!gap) return err("No transfer gap data available", 404);

    const primaryGap = derivePrimaryGap(gap.delivery_gap_score, gap.readiness_gap_score);

    const talkRatioDelta =
      gap.talk_ratio_training !== null && gap.talk_ratio_live !== null
        ? Math.abs(gap.talk_ratio_training - gap.talk_ratio_live).toFixed(1)
        : "unknown";

    const discoveryDelta =
      gap.discovery_training !== null && gap.discovery_live !== null
        ? Math.abs(gap.discovery_training - gap.discovery_live).toFixed(1)
        : "unknown";

    const winRateText = gap.insufficient_deal_data
      ? "insufficient deal data (fewer than 5 deals)"
      : gap.deal_win_rate !== null
      ? `${gap.deal_win_rate.toFixed(1)}%`
      : "unavailable";

    const systemPrompt =
      "You are a revenue coaching AI analysing a sales rep's performance data. " +
      "Return JSON only, no preamble, no markdown.";

    const userMessage = `Rep performance data:
- Delivery gap score: ${gap.delivery_gap_score?.toFixed(1) ?? "null"} / 100 (higher = larger gap between training and live delivery)
- Readiness gap score: ${gap.readiness_gap_score?.toFixed(1) ?? "null"} / 100 (higher = larger readiness gap)
- Primary gap identified: ${primaryGap}
- Talk ratio delta: ${talkRatioDelta} points (training vs live)
- Discovery delta: ${discoveryDelta} points (training vs live)
- MEDDIC avg: ${gap.meddic_avg?.toFixed(1) ?? "null"} / 100
- Win rate: ${winRateText}
- Proxy only (no deal data): ${gap.proxy_only}

Return ONLY this JSON schema:
{
  "primary_gap": "delivery" | "readiness" | "both" | "none",
  "top_recommendation": "<one concise sentence>",
  "recommendations": [
    {
      "title": "<short title>",
      "detail": "<1-2 sentence coaching action>",
      "drill_type": "roleplay" | "pitch" | "meddic" | "discovery",
      "priority": 1 | 2 | 3
    }
  ]
}

Maximum 3 recommendations. Priority 1 is highest. Return ONLY valid JSON.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error("[ai-revenue-coaching] Anthropic error:", await anthropicRes.text());
      return err("AI provider returned an error. Please try again.", 503);
    }

    const anthropicData = await anthropicRes.json();

    if (anthropicData.usage) {
      await logTokenUsage(supabase, {
        org_id: orgId,
        user_id: user.id,
        function_name: "ai-revenue-coaching",
        model: MODEL,
        input_tokens: anthropicData.usage.input_tokens ?? 0,
        output_tokens: anthropicData.usage.output_tokens ?? 0,
      });
    }

    let coaching: CoachingResponse;
    try {
      coaching = JSON.parse(anthropicData.content[0].text);
    } catch {
      console.error("[ai-revenue-coaching] failed to parse AI response:", anthropicData.content[0]?.text);
      return err("AI response could not be parsed.", 502);
    }

    const profileRow = {
      org_id: orgId,
      user_id: targetUserId,
      generated_at: new Date().toISOString(),
      delivery_gap_score: gap.delivery_gap_score,
      readiness_gap_score: gap.readiness_gap_score,
      primary_gap: coaching.primary_gap,
      top_recommendation: coaching.top_recommendation,
      recommendations: coaching.recommendations,
      based_on_period_start: gap.period_start,
      based_on_period_end: gap.period_end,
    };

    const { data: upserted, error: upsertError } = await supabase
      .from("rep_coaching_profiles")
      .upsert(profileRow, {
        onConflict: "user_id,based_on_period_start,based_on_period_end",
      })
      .select()
      .single();

    if (upsertError) {
      console.error("[ai-revenue-coaching] upsert error:", upsertError);
      return err("Failed to save coaching profile");
    }

    return ok(upserted);
  } catch (error) {
    console.error("[ai-revenue-coaching] unhandled error:", error);
    return err("An unexpected error occurred.");
  }
});
