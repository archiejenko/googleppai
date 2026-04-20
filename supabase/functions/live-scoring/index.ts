import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  function ok(data: unknown) {
    return new Response(JSON.stringify(data), {
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
      .select("org_id")
      .eq("id", user.id)
      .single();

    const orgId = profile?.org_id ?? null;
    if (!orgId) return err("Forbidden: no org_id resolved for user", 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? new URL(req.url).searchParams.get("action") ?? "snapshot";

    if (action !== "snapshot") return err("Unknown action", 400);

    const sessionId = body.session_id ?? body.call_id;
    const transcriptChunk: string = body.transcript_chunk ?? body.transcript_text ?? "";

    if (!sessionId) return err("session_id required", 400);
    if (!transcriptChunk.trim()) return err("transcript_chunk required", 400);

    const { data: row, error: fetchError } = await supabase
      .from("live_scores")
      .select("id, session_id, status, transcript, snapshot_count")
      .eq("session_id", sessionId)
      .single();

    if (fetchError || !row) return err("Session not found", 404);
    if (row.status !== "active") return err("Session is not active", 400);

    const updatedTranscript = row.transcript
      ? row.transcript + "\n" + transcriptChunk.trim()
      : transcriptChunk.trim();

    // Lightweight scoring via Claude
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    let scores: Record<string, number | null> = {
      talk_ratio_score: null,
      engagement_score: null,
      question_quality_score: null,
      filler_rate_per_min: null,
    };

    if (anthropicKey && updatedTranscript.length > 50) {
      try {
        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 200,
            system: "You are a sales call scorer. Return JSON only, no preamble.",
            messages: [
              {
                role: "user",
                content: `Score this in-progress sales call transcript. Return running estimates (not final scores).

Transcript so far:
${updatedTranscript.slice(-3000)}

Return ONLY valid JSON:
{"talk_ratio_score": <0-100>, "engagement_score": <0-100>, "question_quality_score": <0-100>, "filler_rate_per_min": <numeric>}`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiJson = await aiResp.json();
          const content = aiJson.content?.[0]?.text ?? "";
          const parsed = JSON.parse(content);
          scores = {
            talk_ratio_score: typeof parsed.talk_ratio_score === "number" ? parsed.talk_ratio_score : null,
            engagement_score: typeof parsed.engagement_score === "number" ? parsed.engagement_score : null,
            question_quality_score: typeof parsed.question_quality_score === "number" ? parsed.question_quality_score : null,
            filler_rate_per_min: typeof parsed.filler_rate_per_min === "number" ? parsed.filler_rate_per_min : null,
          };
        }
      } catch (e) {
        console.error("[live-scoring] AI scoring error:", e);
      }
    }

    const newSnapshotCount = (row.snapshot_count ?? 0) + 1;

    const { error: updateError } = await supabase
      .from("live_scores")
      .update({
        transcript: updatedTranscript,
        snapshot_count: newSnapshotCount,
        ...scores,
      })
      .eq("id", row.id);

    if (updateError) {
      console.error("[live-scoring] update error:", updateError);
      return err("Failed to update scores");
    }

    return ok({
      session_id: sessionId,
      scores,
      snapshot_count: newSnapshotCount,
    });
  } catch (error) {
    console.error("[live-scoring] unhandled error:", error);
    return err("An unexpected error occurred.");
  }
});
