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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, sessionId, messages, audioUrl } = body;

    if (action === "create") {
      const {
        scenario, difficulty, methodology, type, moduleId,
        targetPersona, pitchGoal, timeLimit, language,
        industryId, personaCategory, isMultiPersona,
      } = body;

      const { data: session, error: insertError } = await supabase
        .from("training_sessions")
        .insert({
          user_id: user.id,
          scenario: scenario ?? "Standard Sales Call",
          difficulty: difficulty ?? "medium",
          methodology: methodology ?? null,
          type: type ?? "simulation",
          module_id: moduleId ?? null,
          buyer_persona: targetPersona ?? null,
          context_notes: pitchGoal ?? null,
          time_limit: timeLimit ?? null,
          language: language ?? "en",
          industry_id: industryId ?? null,
          persona_category: personaCategory ?? null,
          is_multi_persona: isMultiPersona ?? false,
          status: "active",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ id: session.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "complete") {
      // Fetch training session metadata
      const { data: session, error: sessionError } = await supabase
        .from("training_sessions")
        .select("scenario, difficulty, methodology")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (sessionError) throw sessionError;

      // Build transcript from message array
      const transcript = (messages as Array<{ role: string; text: string }>)
        .map((m) => `${m.role === "user" ? "Rep" : "Buyer"}: ${m.text}`)
        .join("\n");

      // Calculate rough duration from message count (approx 30s per exchange)
      const durationSeconds = messages.length * 30;

      // Create pitch record
      const { data: pitch, error: pitchError } = await supabase
        .from("pitches")
        .insert({
          user_id: user.id,
          session_id: sessionId,
          audio_url: audioUrl ?? null,
          transcript,
          duration_seconds: durationSeconds,
          scenario: session?.scenario ?? "Training Session",
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (pitchError) throw pitchError;

      // Mark training session as completed
      await supabase
        .from("training_sessions")
        .update({ completed_at: new Date().toISOString(), status: "completed" })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      // Trigger pitch analysis asynchronously (fire-and-forget)
      // The pitch-api function will update the pitch row with analysis results
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      fetch(`${SUPABASE_URL}/functions/v1/pitch-api`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "analyse",
          pitch_id: pitch.id,
          transcript,
          scenario: session?.scenario ?? "Training Session",
        }),
      }).catch(() => {/* fire-and-forget — analysis runs in background */});

      return new Response(
        JSON.stringify({ success: true, pitchId: pitch.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
