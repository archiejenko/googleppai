import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-5"; // Pattern analysis across deals

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    const body = await req.json();
    const { action } = body;

    // ── LIST OUTCOMES ─────────────────────────────────────────────────────────
    if (action === "list_outcomes") {
      const { data: outcomes, error } = await supabase
        .from("deal_outcomes")
        .select("*")
        .eq("org_id", profile?.org_id)
        .order("closed_at", { ascending: false })
        .limit(body.limit ?? 50);

      if (error && error.code === "42P01") {
        // Table doesn't exist yet — return empty
        return new Response(
          JSON.stringify({ ok: true, data: { outcomes: [] } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, data: { outcomes: outcomes ?? [] } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── LOG OUTCOME ───────────────────────────────────────────────────────────
    if (action === "log_outcome") {
      const { data: outcome, error } = await supabase
        .from("deal_outcomes")
        .insert({
          org_id: profile?.org_id,
          user_id: user.id,
          deal_name: body.deal_name,
          outcome: body.outcome,
          deal_value_gbp: body.deal_value_gbp ?? null,
          closed_at: body.closed_at ?? new Date().toISOString(),
          notes: body.notes ?? null,
          associated_pitch_ids: body.associated_pitch_ids ?? [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true, data: { outcome } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── DELETE OUTCOME ────────────────────────────────────────────────────────
    if (action === "delete_outcome") {
      const { error } = await supabase
        .from("deal_outcomes")
        .delete()
        .eq("id", body.id)
        .eq("org_id", profile?.org_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── INGEST FROM CRM ───────────────────────────────────────────────────────
    if (action === "ingest_from_crm") {
      // Placeholder — CRM webhook integration would populate deal_outcomes table
      return new Response(
        JSON.stringify({ ok: true, data: { ingested: 0, message: "CRM integration not yet configured." } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── GET CORRELATION ───────────────────────────────────────────────────────
    if (action === "get_correlation") {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

      // Fetch outcomes and associated pitch data
      const { data: outcomes } = await supabase
        .from("deal_outcomes")
        .select("deal_name, outcome, deal_value_gbp, notes, associated_pitch_ids, closed_at")
        .eq("org_id", profile?.org_id)
        .order("closed_at", { ascending: false })
        .limit(50);

      if (!outcomes || outcomes.length === 0) {
        return new Response(
          JSON.stringify({ ok: true, data: { correlations: [], insights: ["Log deal outcomes to unlock AI correlation analysis."] } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const wonCount = outcomes.filter(o => o.outcome === "won").length;
      const lostCount = outcomes.filter(o => o.outcome === "lost").length;
      const stalledCount = outcomes.filter(o => o.outcome === "stalled").length;

      const prompt = `You are a revenue analytics AI analysing deal outcome patterns for a sales team.

DEAL OUTCOMES (${outcomes.length} total: ${wonCount} won, ${lostCount} lost, ${stalledCount} stalled):
${outcomes.slice(0, 20).map(o =>
  `- ${o.outcome.toUpperCase()}: ${o.deal_name} (£${o.deal_value_gbp ?? 0} | ${o.closed_at?.slice(0, 10)}) ${o.notes ? `— ${o.notes}` : ""}`
).join("\n")}

Identify patterns and return ONLY a JSON object:
{
  "correlations": [
    {
      "factor": "<pattern or factor identified>",
      "impact": "positive" | "negative" | "neutral",
      "strength": <0.0-1.0>,
      "description": "<1-2 sentence explanation>",
      "affected_deals": <number>
    }
  ],
  "insights": ["<actionable insight 1>", "<actionable insight 2>", "<actionable insight 3>"]
}

Return ONLY the JSON, no markdown.`;

      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const aiData = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(aiData.error?.message ?? "AI error");

      let result: { correlations: unknown[]; insights: string[] };
      try {
        result = JSON.parse(aiData.content[0].text);
      } catch {
        result = { correlations: [], insights: ["Analysis could not be parsed. Please try again."] };
      }

      return new Response(
        JSON.stringify({ ok: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('[deal-outcomes] unhandled error:', error);
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
