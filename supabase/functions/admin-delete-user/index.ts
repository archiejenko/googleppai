import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { writeAuditLog } from "../_shared/auditLog.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the calling user is an admin
    const { data: { user: caller }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();

    if (authError || !caller) throw new Error("Unauthorized");

    const { data: callerProfile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      throw new Error("Forbidden: admin role required");
    }

    // Rate limit: 5 deletions/min burst, 20/hr sustained — per admin user
    const { data: isAllowed, error: rateLimitError } = await serviceClient
      .rpc("check_rate_limit_hardened", {
        dimension_keys:          [`user:${caller.id}`],
        cost:                    1,
        burst_limit:             5,
        burst_window_seconds:    60,
        sustained_limit:         20,
        sustained_window_seconds: 3600,
      });
    if (rateLimitError) {
      console.error("[admin-delete-user] rate limit check failed:", rateLimitError);
    } else if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) throw new Error("targetUserId is required");

    // Prevent self-deletion
    if (targetUserId === caller.id) {
      throw new Error("Cannot delete your own account");
    }

    // Delete user from Supabase Auth (cascades to profiles via FK)
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) throw deleteError;

    await writeAuditLog(serviceClient, {
      actor_id:    caller.id,
      actor_role:  "admin",
      action:      "delete_user",
      target_type: "user",
      target_id:   targetUserId,
      metadata:    { deleted_at: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error('[admin-delete-user] unhandled error:', error);
    const status = (error instanceof Error && error.message === 'Unauthorised') ? 401
                 : (error instanceof Error && error.message === 'Too many requests') ? 429
                 : 500;
    const message = status === 401 ? 'Unauthorised'
                  : status === 429 ? 'Too many requests'
                  : 'An unexpected error occurred.';
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
