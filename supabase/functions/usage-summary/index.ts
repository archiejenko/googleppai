import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return new Response(
        JSON.stringify({ error: "No organisation found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: usage, error } = await supabase.rpc("get_token_usage_summary", {
      p_org_id: profile.org_id,
    });

    if (error) {
      const { data: fallback } = await supabase
        .from("token_usage_log")
        .select("function_name, model, input_tokens, output_tokens, total_tokens, logged_at")
        .eq("org_id", profile.org_id)
        .order("logged_at", { ascending: false })
        .limit(500);

      const summary: Record<string, { function_name: string; model: string; total_tokens: number; month: string }> = {};
      for (const row of fallback ?? []) {
        const month = row.logged_at?.slice(0, 7) ?? "unknown";
        const key = `${row.function_name}:${row.model}:${month}`;
        if (!summary[key]) {
          summary[key] = {
            function_name: row.function_name,
            model: row.model,
            total_tokens: 0,
            month,
          };
        }
        summary[key].total_tokens += row.total_tokens ?? 0;
      }

      return new Response(
        JSON.stringify({ ok: true, data: Object.values(summary) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, data: usage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[usage-summary] error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    const status = message.includes("Unauthorized") || message.includes("authorization") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
