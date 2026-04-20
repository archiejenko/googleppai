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
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    const orgId = profile?.org_id ?? null;
    if (!orgId) return err("Forbidden: no org_id resolved for user", 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? new URL(req.url).searchParams.get("action");

    if (action === "manual-start") {
      const sessionId = crypto.randomUUID();
      const callId = sessionId;

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        rep_id: user.id,
        org_id: orgId,
        session_id: sessionId,
        call_id: callId,
        status: "active",
        call_started_at: new Date().toISOString(),
      };

      if (body.prospect_name) insertData.prospect_name = body.prospect_name;
      if (body.company_name) insertData.company_name = body.company_name;

      const { data: row, error: insertError } = await supabase
        .from("live_scores")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError) {
        console.error("[telephony-webhook] insert error:", insertError);
        return err("Failed to create live score row");
      }

      return ok({
        session_id: sessionId,
        call_id: callId,
        live_score_id: row.id,
      });
    }

    if (action === "manual-end") {
      const sessionId = body.session_id ?? body.call_id;
      if (!sessionId) return err("session_id or call_id required", 400);

      const now = new Date().toISOString();

      const { data: row, error: updateError } = await supabase
        .from("live_scores")
        .update({ status: "completed", call_ended_at: now })
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .select("id, session_id")
        .single();

      if (updateError) {
        console.error("[telephony-webhook] update error:", updateError);
        return err("Failed to end session");
      }

      // Trigger call-intelligence-scorer asynchronously
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      fetch(`${supabaseUrl}/functions/v1/call-intelligence-scorer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          live_score_id: row.id,
          session_id: row.session_id,
        }),
      }).catch((e) => console.error("[telephony-webhook] scorer trigger error:", e));

      return ok({
        session_id: sessionId,
        ended_at: now,
      });
    }

    return err("Unknown action. Use 'manual-start' or 'manual-end'.", 400);
  } catch (error) {
    console.error("[telephony-webhook] unhandled error:", error);
    return err("An unexpected error occurred.");
  }
});
