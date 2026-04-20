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
      .select("tier")
      .eq("id", orgId)
      .single();

    if (org?.tier !== "revenue_intelligence") {
      return err("Revenue Intelligence tier required", 403);
    }

    const url = new URL(req.url);
    const periodDays = parseInt(url.searchParams.get("period_days") ?? "90", 10);
    const scope = url.searchParams.get("scope") ?? "rep";
    const requestedUserId = url.searchParams.get("user_id");

    if (scope !== "rep" && scope !== "team") {
      return err("scope must be 'rep' or 'team'", 400);
    }

    let targetUserId = user.id;
    if (requestedUserId && requestedUserId !== user.id) {
      if (profile?.role !== "admin") return err("Forbidden", 403);
      targetUserId = requestedUserId;
    }

    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    let targetUserIds: string[];
    if (scope === "team") {
      const { data: teamProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", orgId);
      targetUserIds = (teamProfiles ?? []).map(p => p.id);
    } else {
      targetUserIds = [targetUserId];
    }

    const { data: dealRows } = await supabase
      .from("deal_outcomes")
      .select("id, user_id, outcome, live_score_session_id")
      .in("user_id", targetUserIds)
      .gte("close_date", periodStart);

    const deals = dealRows ?? [];
    const wonDeals = deals.filter(d => d.outcome === "won");
    const lostDeals = deals.filter(d => d.outcome === "lost");

    if (wonDeals.length < 3 || lostDeals.length < 3) {
      return ok({
        insufficient_data: true,
        sample_size_won: wonDeals.length,
        sample_size_lost: lostDeals.length,
        won_avg_discovery: null,
        lost_avg_discovery: null,
        won_avg_objection_handling: null,
        lost_avg_objection_handling: null,
        won_avg_engagement: null,
        lost_avg_engagement: null,
        won_avg_talk_ratio: null,
        lost_avg_talk_ratio: null,
        won_avg_meddic: null,
        lost_avg_meddic: null,
      });
    }

    async function getAvgScores(dealSet: typeof deals) {
      const sessionIds = dealSet
        .map(d => d.live_score_session_id)
        .filter(Boolean);

      let avgDiscovery: number | null = null;
      let avgObjectionHandling: number | null = null;
      let avgEngagement: number | null = null;
      let avgTalkRatio: number | null = null;

      if (sessionIds.length > 0) {
        const { data: scores } = await supabase
          .from("live_scores")
          .select("discovery_score, objection_handling_score, engagement_score, talk_ratio_score")
          .in("id", sessionIds);

        const s = scores ?? [];
        if (s.length > 0) {
          const avg = (arr: (number | null)[]) => {
            const valid = arr.filter((v): v is number => v !== null);
            return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
          };
          avgDiscovery = avg(s.map(r => r.discovery_score));
          avgObjectionHandling = avg(s.map(r => r.objection_handling_score));
          avgEngagement = avg(s.map(r => r.engagement_score));
          avgTalkRatio = avg(s.map(r => r.talk_ratio_score));
        }
      }

      return { avgDiscovery, avgObjectionHandling, avgEngagement, avgTalkRatio };
    }

    async function getAvgMeddic(userIds: string[]) {
      const { data: pitchRows } = await supabase
        .from("pitches")
        .select("meddic_scores")
        .in("user_id", userIds)
        .gte("created_at", periodStart)
        .not("meddic_scores", "is", null);

      const MEDDIC_KEYS = [
        "metrics", "economicBuyer", "decisionCriteria",
        "decisionProcess", "identifyPain", "champion",
      ];

      const pitches = pitchRows ?? [];
      const perPitch: number[] = [];
      for (const p of pitches) {
        if (!p.meddic_scores || typeof p.meddic_scores !== "object") continue;
        const scores = p.meddic_scores as Record<string, unknown>;
        const vals = MEDDIC_KEYS
          .map(k => scores[k])
          .filter((v): v is number => typeof v === "number");
        if (vals.length > 0) {
          perPitch.push(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      }
      return perPitch.length > 0
        ? perPitch.reduce((a, b) => a + b, 0) / perPitch.length
        : null;
    }

    const [wonScores, lostScores] = await Promise.all([
      getAvgScores(wonDeals),
      getAvgScores(lostDeals),
    ]);

    const wonUserIds = [...new Set(wonDeals.map(d => d.user_id))];
    const lostUserIds = [...new Set(lostDeals.map(d => d.user_id))];

    const [wonMeddic, lostMeddic] = await Promise.all([
      getAvgMeddic(wonUserIds),
      getAvgMeddic(lostUserIds),
    ]);

    const row = {
      org_id: orgId,
      user_id: scope === "rep" ? targetUserId : null,
      period_start: periodStart,
      period_end: periodEnd,
      scope,
      won_avg_discovery: wonScores.avgDiscovery,
      lost_avg_discovery: lostScores.avgDiscovery,
      won_avg_objection_handling: wonScores.avgObjectionHandling,
      lost_avg_objection_handling: lostScores.avgObjectionHandling,
      won_avg_engagement: wonScores.avgEngagement,
      lost_avg_engagement: lostScores.avgEngagement,
      won_avg_talk_ratio: wonScores.avgTalkRatio,
      lost_avg_talk_ratio: lostScores.avgTalkRatio,
      won_avg_meddic: wonMeddic,
      lost_avg_meddic: lostMeddic,
      sample_size_won: wonDeals.length,
      sample_size_lost: lostDeals.length,
      computed_at: now.toISOString(),
    };

    const { data: upserted, error: upsertError } = await supabase
      .from("win_loss_analysis")
      .upsert(row, { onConflict: "org_id,user_id,period_start,period_end,scope" })
      .select()
      .single();

    if (upsertError) {
      console.error("[win-loss-analysis] upsert error:", upsertError);
      return err("Failed to save win/loss analysis");
    }

    return ok(upserted);
  } catch (error) {
    console.error("[win-loss-analysis] unhandled error:", error);
    return err("An unexpected error occurred.");
  }
});
