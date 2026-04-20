import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
      .select("tier, meddic_weightings")
      .eq("id", orgId)
      .single();

    if (org?.tier !== "revenue_intelligence") {
      return err("Revenue Intelligence tier required", 403);
    }

    // Parse query params
    const url = new URL(req.url);
    const periodDays = parseInt(url.searchParams.get("period_days") ?? "30", 10);
    const requestedUserId = url.searchParams.get("user_id");

    // Only admins may query other users
    let targetUserId = user.id;
    if (requestedUserId && requestedUserId !== user.id) {
      if (profile?.role !== "admin") return err("Forbidden", 403);
      targetUserId = requestedUserId;
    }

    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // Query live_scores
    const { data: liveRows } = await supabase
      .from("live_scores")
      .select("talk_ratio_score, discovery_score")
      .eq("rep_id", targetUserId)
      .eq("org_id", orgId)
      .gte("call_started_at", periodStart);

    const liveData = (liveRows ?? []).filter(
      (r) => r.talk_ratio_score !== null || r.discovery_score !== null,
    );
    const sampleSizeLive = liveData.length;

    const avgLiveTalkRatio =
      sampleSizeLive > 0
        ? liveData.reduce((s, r) => s + (r.talk_ratio_score ?? 0), 0) / sampleSizeLive
        : null;
    const avgLiveDiscovery =
      sampleSizeLive > 0
        ? liveData.reduce((s, r) => s + (r.discovery_score ?? 0), 0) / sampleSizeLive
        : null;

    // Query pitches for training talk_ratio and discovery (via meddic_scores.identifyPain)
    const { data: pitchRows } = await supabase
      .from("pitches")
      .select("talk_time_ratio, meddic_scores, score")
      .eq("user_id", targetUserId)
      .gte("created_at", periodStart);

    const validPitches = (pitchRows ?? []).filter((p) => p.score !== null);
    const sampleSizeTraining = validPitches.length;

    const avgTrainingTalkRatio =
      sampleSizeTraining > 0
        ? validPitches.reduce((s, p) => s + (p.talk_time_ratio ?? 0), 0) / sampleSizeTraining
        : null;

    const avgTrainingDiscovery =
      sampleSizeTraining > 0
        ? (() => {
            const withPain = validPitches.filter(
              (p) => p.meddic_scores && typeof p.meddic_scores === "object" &&
                typeof (p.meddic_scores as Record<string, unknown>).identifyPain === "number",
            );
            if (withPain.length === 0) return null;
            return (
              withPain.reduce(
                (s, p) => s + ((p.meddic_scores as Record<string, number>).identifyPain ?? 0),
                0,
              ) / withPain.length
            );
          })()
        : null;

    // Compute meddic_avg across all 6 MEDDIC fields
    const MEDDIC_KEYS = [
      "metrics",
      "economicBuyer",
      "decisionCriteria",
      "decisionProcess",
      "identifyPain",
      "champion",
    ] as const;

    const weightings = (org?.meddic_weightings as Record<string, number> | null) ?? null;

    let meddicAvg: number | null = null;
    if (sampleSizeTraining > 0) {
      const perPitch: number[] = [];
      for (const p of validPitches) {
        if (!p.meddic_scores || typeof p.meddic_scores !== "object") continue;
        const scores = p.meddic_scores as Record<string, unknown>;
        const available = MEDDIC_KEYS
          .map((k) => ({ key: k, value: scores[k] }))
          .filter((e): e is { key: string; value: number } => typeof e.value === "number");
        if (available.length > 0) {
          let total = 0;
          let weightSum = 0;
          for (const { key, value } of available) {
            const w = weightings?.[key] ?? 1;
            total += value * w;
            weightSum += w;
          }
          perPitch.push(total / weightSum);
        }
      }
      if (perPitch.length > 0) {
        meddicAvg = perPitch.reduce((a, b) => a + b, 0) / perPitch.length;
      }
    }

    // Query deal_outcomes
    const { data: dealRows } = await supabase
      .from("deal_outcomes")
      .select("outcome")
      .eq("user_id", targetUserId)
      .eq("org_id", orgId);

    const sampleSizeDeals = (dealRows ?? []).length;
    const wonCount = (dealRows ?? []).filter((d) => d.outcome === "won").length;
    const insufficientDealData = sampleSizeDeals < 5;
    const dealWinRate = insufficientDealData ? null : (wonCount / sampleSizeDeals) * 100;

    // Compute delivery_gap_score
    let deliveryGapScore: number | null = null;
    if (
      avgTrainingTalkRatio !== null &&
      avgLiveTalkRatio !== null &&
      avgTrainingDiscovery !== null &&
      avgLiveDiscovery !== null
    ) {
      const talkDelta = Math.abs(avgTrainingTalkRatio - avgLiveTalkRatio);
      const discoveryDelta = Math.abs(avgTrainingDiscovery - avgLiveDiscovery);
      deliveryGapScore = Math.min(100, Math.max(0, (talkDelta + discoveryDelta) / 2));
    }

    // Compute readiness_gap_score
    let readinessGapScore: number | null = null;
    let proxyOnly = false;
    if (meddicAvg !== null) {
      if (!insufficientDealData && dealWinRate !== null) {
        // Higher MEDDIC * higher win rate = lower gap
        readinessGapScore = Math.min(100, Math.max(0, 100 - (meddicAvg * (dealWinRate / 100))));
        proxyOnly = false;
      } else {
        readinessGapScore = Math.min(100, Math.max(0, 100 - meddicAvg));
        proxyOnly = true;
      }
    }

    const row = {
      org_id: orgId,
      user_id: targetUserId,
      period_start: periodStart,
      period_end: periodEnd,
      delivery_gap_score: deliveryGapScore,
      readiness_gap_score: readinessGapScore,
      talk_ratio_training: avgTrainingTalkRatio,
      talk_ratio_live: avgLiveTalkRatio,
      discovery_training: avgTrainingDiscovery,
      discovery_live: avgLiveDiscovery,
      meddic_avg: meddicAvg,
      deal_win_rate: dealWinRate,
      sample_size_live: sampleSizeLive,
      sample_size_training: sampleSizeTraining,
      sample_size_deals: sampleSizeDeals,
      insufficient_deal_data: insufficientDealData,
      proxy_only: proxyOnly,
      computed_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertError } = await supabase
      .from("transfer_gap_scores")
      .upsert(row, { onConflict: "user_id,period_start,period_end" })
      .select()
      .single();

    if (upsertError) {
      console.error("[transfer-gap] upsert error:", upsertError);
      return err("Failed to save transfer gap scores");
    }

    return ok(upserted);
  } catch (error) {
    console.error("[transfer-gap] unhandled error:", error);
    return err("An unexpected error occurred.");
  }
});
