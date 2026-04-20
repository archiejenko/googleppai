import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logTokenUsage } from "../_shared/tokenUsage.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { meeting_session_id } = await req.json();
    if (!meeting_session_id) {
      return new Response(
        JSON.stringify({ error: "meeting_session_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const RECALL_API_KEY = Deno.env.get("RECALL_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!RECALL_API_KEY || !ANTHROPIC_API_KEY) {
      throw new Error("RECALL_API_KEY and ANTHROPIC_API_KEY must be configured");
    }

    const { data: session } = await supabase
      .from("meeting_sessions")
      .select("org_id, user_id")
      .eq("id", meeting_session_id)
      .single();

    if (session?.org_id) {
      const { data: org } = await supabase
        .from("organisations")
        .select("tier")
        .eq("id", session.org_id)
        .single();

      if (org?.tier !== "revenue_intelligence") {
        return new Response(
          JSON.stringify({ error: "Revenue Intelligence tier required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    await supabase
      .from("meeting_sessions")
      .update({ transcript_status: "processing" })
      .eq("id", meeting_session_id);

    const recallRes = await fetch(
      `https://api.recall.ai/api/v1/bot/${meeting_session_id}/transcript`,
      { headers: { Authorization: `Token ${RECALL_API_KEY}` } },
    );

    if (recallRes.status === 404 || recallRes.status === 202) {
      await supabase
        .from("meeting_sessions")
        .update({ transcript_status: "pending" })
        .eq("id", meeting_session_id);

      return new Response(
        JSON.stringify({ status: "pending", message: "Transcript not yet available" }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!recallRes.ok) {
      throw new Error(`Recall.ai API returned ${recallRes.status}`);
    }

    const recallData = await recallRes.json();
    const rawTranscript = Array.isArray(recallData)
      ? recallData.map((seg: { speaker: string; words: Array<{ text: string }> }) =>
          `${seg.speaker}: ${seg.words.map((w: { text: string }) => w.text).join(" ")}`
        ).join("\n")
      : typeof recallData.transcript === "string"
        ? recallData.transcript
        : JSON.stringify(recallData);

    await supabase
      .from("meeting_sessions")
      .update({ transcript: rawTranscript, transcript_status: "complete" })
      .eq("id", meeting_session_id);

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are a meeting analyst. Extract a summary and action items from the transcript. Return JSON only, no preamble. Schema: { summary: string, action_items: [{ owner: string, action: string, due_date_hint: string }] }",
        messages: [{ role: "user", content: `Meeting transcript:\n\n${rawTranscript.slice(0, 12000)}` }],
      }),
    });

    if (!aiRes.ok) {
      console.error("[meeting-transcript-processor] Claude API error:", await aiRes.text());
      throw new Error("AI analysis failed");
    }

    const aiData = await aiRes.json();

    if (aiData.usage && session?.org_id && session?.user_id) {
      await logTokenUsage(supabase, {
        org_id: session.org_id,
        user_id: session.user_id,
        function_name: "meeting-transcript-processor",
        model: "claude-sonnet-4-6",
        input_tokens: aiData.usage.input_tokens ?? 0,
        output_tokens: aiData.usage.output_tokens ?? 0,
      });
    }

    let parsed: { summary: string; action_items: Array<{ owner: string; action: string; due_date_hint: string }> };
    try {
      parsed = JSON.parse(aiData.content[0].text);
    } catch {
      parsed = { summary: "Could not parse AI response.", action_items: [] };
    }

    await supabase
      .from("meeting_sessions")
      .update({
        summary: parsed.summary,
        action_items: parsed.action_items,
      })
      .eq("id", meeting_session_id);

    return new Response(
      JSON.stringify({ status: "complete", summary: parsed.summary, action_items: parsed.action_items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[meeting-transcript-processor] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
