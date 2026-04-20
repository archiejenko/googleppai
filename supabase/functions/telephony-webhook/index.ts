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
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const pathAction = pathSegments[pathSegments.length - 1];
    const action = body.action ?? url.searchParams.get("action") ?? (pathAction !== "telephony-webhook" ? pathAction : null);

    if (action === "manual-start") {
      const sessionId = crypto.randomUUID();
      const callId = sessionId;

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        rep_id: user.id,
        org_id: orgId,
        session_id: sessionId,
        call_id: callId,
        status: "pending_consent",
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
        org_id: orgId,
      });
    }

    if (action === "activate-session") {
      const sessionId = body.session_id;
      if (!sessionId) return err("session_id required", 400);

      // Verify consent record exists
      const { data: consent } = await supabase
        .from("call_consent_log")
        .select("id, consent_given, consented_at")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .eq("consent_given", true)
        .single();

      if (!consent) {
        return err("Consent not recorded. Session cannot start.", 403);
      }

      // Backfill server-side IP on the consent record
      await supabase
        .from("call_consent_log")
        .update({ ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      // Activate the session
      const { error: activateError } = await supabase
        .from("live_scores")
        .update({ status: "active" })
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .eq("status", "pending_consent");

      if (activateError) {
        console.error("[telephony-webhook] activate error:", activateError);
        return err("Failed to activate session");
      }

      return ok({ session_id: sessionId, status: "active" });
    }

    if (action === "update-status") {
      const sessionId = body.session_id;
      const newStatus = body.status;
      if (!sessionId) return err("session_id required", 400);
      if (!newStatus || !["abandoned"].includes(newStatus)) return err("Invalid status", 400);

      const { error: updateErr } = await supabase
        .from("live_scores")
        .update({ status: newStatus })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      if (updateErr) {
        console.error("[telephony-webhook] update-status error:", updateErr);
        return err("Failed to update status");
      }

      return ok({ session_id: sessionId, status: newStatus });
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

    return err("Unknown action. Use 'manual-start', 'activate-session', 'update-status', or 'manual-end'.", 400);
  } catch (error) {
    console.error("[telephony-webhook] unhandled error:", error);
    return err("An unexpected error occurred.");
  }
});
