import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    const { action, pitch_id, transcript, audio_url, duration_seconds, scenario, trainingSessionId } = await req.json();

    if (action === "analyse") {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

      const analysisPrompt = `You are an expert sales coach analysing a sales pitch for OAST.

Analyse the following pitch transcript and return a JSON object with this exact structure:
{
  "overall_score": <number 0-100>,
  "summary": "<2-3 sentence executive summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "meddic_scores": {
    "metrics": <0-100>,
    "economic_buyer": <0-100>,
    "decision_criteria": <0-100>,
    "decision_process": <0-100>,
    "identify_pain": <0-100>,
    "champion": <0-100>
  },
  "skill_scores": {
    "objection_handling": <0-100>,
    "rapport_building": <0-100>,
    "needs_discovery": <0-100>,
    "closing": <0-100>,
    "product_knowledge": <0-100>
  },
  "talk_time_ratio": <0.0-1.0>,
  "filler_word_count": <number>,
  "questions_asked": <number>,
  "coaching_notes": "<specific, actionable coaching paragraph>"
}

Scenario context: ${scenario ?? "Standard B2B sales call"}

Transcript:
${transcript}

Return ONLY the JSON object, no markdown, no preamble.`;

      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2048,
          messages: [{ role: "user", content: analysisPrompt }],
        }),
      });

      const aiData = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(aiData.error?.message ?? "AI analysis failed");

      let analysis;
      try {
        analysis = JSON.parse(aiData.content[0].text);
      } catch {
        throw new Error("AI returned malformed JSON");
      }

      const { error: updateError } = await supabase
        .from("pitches")
        .update({
          overall_score: analysis.overall_score,
          analysis_summary: analysis.summary,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          meddic_scores: analysis.meddic_scores,
          skill_scores: analysis.skill_scores,
          talk_time_ratio: analysis.talk_time_ratio,
          filler_word_count: analysis.filler_word_count,
          questions_asked: analysis.questions_asked,
          coaching_notes: analysis.coaching_notes,
          analysed_at: new Date().toISOString(),
        })
        .eq("id", pitch_id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Award 5 XP per pitch analysis
      await supabase.rpc("increment_xp", { user_id: user.id, xp_amount: 5 });

      return new Response(
        JSON.stringify({ success: true, analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const { error: insertError, data: pitch } = await supabase
        .from("pitches")
        .insert({
          user_id: user.id,
          audio_url,
          duration_seconds,
          scenario,
          transcript,
          session_id: trainingSessionId ?? null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, pitch }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
