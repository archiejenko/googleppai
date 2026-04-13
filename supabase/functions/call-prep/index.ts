import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkOrgAiLimit } from "../_shared/orgRateLimit.ts";

const MODEL = "claude-sonnet-4-5"; // Contextual reasoning over historical data
// Estimated tokens per generate_brief call: ~950 prompt + 2048 max output
const ESTIMATED_TOKENS = 3000;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    const { action, session_id, session_title, session_type, prospect_company } = await req.json();

    // ── GET BRIEF ─────────────────────────────────────────────────────────────
    if (action === "get_brief") {
      const { data: brief } = await supabase
        .from("call_prep_briefs")
        .select("*")
        .eq("session_id", session_id)
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify({ ok: true, data: { brief: brief ?? null } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── GENERATE BRIEF ────────────────────────────────────────────────────────
    if (action === "generate_brief") {
      // ── Org-level daily budget check ────────────────────────────────────────
      const orgId: string | undefined =
        user.app_metadata?.org_id ?? user.user_metadata?.org_id;
      if (!orgId) throw new Error("Forbidden: no org_id in token");

      const rateLimit = await checkOrgAiLimit(supabase, orgId, "call-prep", ESTIMATED_TOKENS);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({ ok: false, error: rateLimit.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch rep's historical pitch performance (last 30 days)
      const { data: recentPitches } = await supabase
        .from("pitches")
        .select("score, talk_time_ratio, meddic_scores, coaching_notes, scenario, created_at")
        .eq("user_id", user.id)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      const avgScore30d = recentPitches && recentPitches.length > 0
        ? Math.round(recentPitches.reduce((s, p) => s + (p.score ?? 0), 0) / recentPitches.length)
        : null;

      const avgTalkRatio30d = recentPitches && recentPitches.length > 0
        ? Math.round(
            recentPitches
              .filter(p => p.talk_time_ratio != null)
              .reduce((s, p) => s + p.talk_time_ratio, 0) /
            recentPitches.filter(p => p.talk_time_ratio != null).length * 100,
          ) || null
        : null;

      // Identify weaknesses from coaching notes
      const coachingNotes = recentPitches
        ?.filter(p => p.coaching_notes)
        .map(p => p.coaching_notes)
        .slice(0, 5)
        .join("\n- ") ?? "";

      const prompt = `You are an elite sales coach preparing a rep for an upcoming ${session_type ?? "sales"} call.

REP PERFORMANCE CONTEXT (last 30 days):
- Average pitch score: ${avgScore30d !== null ? `${avgScore30d}/100` : "No data yet"}
- Average talk ratio: ${avgTalkRatio30d !== null ? `${avgTalkRatio30d}%` : "No data yet"}
- Recent coaching notes: ${coachingNotes || "None available"}

UPCOMING CALL:
- Title: ${session_title ?? "Sales Call"}
- Type: ${session_type ?? "discovery"}
- Prospect company: ${prospect_company ?? "Unknown"}

Generate a pre-call brief. Return ONLY a JSON object with this exact structure:
{
  "brief_summary": "<2-3 sentence overview of the call objective and approach>",
  "key_talking_points": [
    { "point": "<talking point>", "rationale": "<why this matters for this call type>" }
  ],
  "objection_prep": [
    { "objection": "<likely objection>", "suggested_response": "<how to handle it>" }
  ],
  "meddic_checklist": [
    { "element": "Metrics", "question": "<specific question to ask>", "status": "pending" },
    { "element": "Economic Buyer", "question": "<specific question>", "status": "pending" },
    { "element": "Decision Criteria", "question": "<specific question>", "status": "pending" },
    { "element": "Decision Process", "question": "<specific question>", "status": "pending" },
    { "element": "Identify Pain", "question": "<specific question>", "status": "pending" },
    { "element": "Champion", "question": "<specific question>", "status": "pending" }
  ],
  "competitive_notes": "<brief competitive positioning notes if relevant>",
  "success_metrics": ["<what success looks like for this specific call type>"]
}

Tailor everything to a ${session_type ?? "discovery"} call. Return ONLY the JSON, no markdown.`;

      let aiResponse: Response;
      try {
        aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
          }),
        });
      } catch (fetchErr) {
        console.error("[call-prep] Anthropic fetch failed:", fetchErr);
        return new Response(
          JSON.stringify({ ok: false, error: "AI provider is temporarily unavailable. Please try again in a moment.", retryable: true }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const aiData = await aiResponse.json();
      if (!aiResponse.ok) {
        console.error("[call-prep] Anthropic error response:", aiData);
        return new Response(
          JSON.stringify({ ok: false, error: "AI provider returned an error. Please try again.", retryable: true }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let briefContent: Record<string, unknown>;
      try {
        briefContent = JSON.parse(aiData.content[0].text);
      } catch {
        throw new Error("AI returned malformed JSON");
      }

      const briefRow = {
        user_id: user.id,
        session_id: session_id ?? null,
        session_title: session_title ?? null,
        session_type: session_type ?? null,
        prospect_company: prospect_company ?? null,
        ...briefContent,
        avg_score_30d: avgScore30d,
        avg_talk_ratio_30d: avgTalkRatio30d,
        generated_at: new Date().toISOString(),
      };

      const { data: brief, error: insertError } = await supabase
        .from("call_prep_briefs")
        .insert(briefRow)
        .select()
        .single();

      if (insertError) {
        // Table may not exist yet — return the brief without persisting
        console.warn("call_prep_briefs insert failed:", insertError.message);
        return new Response(
          JSON.stringify({ ok: true, data: { brief: { id: "unsaved", ...briefRow } } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, data: { brief } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('[call-prep] unhandled error:', error);
    const status = (error instanceof Error && error.message === 'Unauthorised') ? 401
                 : (error instanceof Error && error.message === 'Too many requests') ? 429
                 : 500;
    const message = status === 401 ? 'Unauthorised'
                  : status === 429 ? 'Too many requests'
                  : 'An unexpected error occurred.';
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
