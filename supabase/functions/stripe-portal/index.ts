import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const APP_URL = Deno.env.get("APP_URL") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:5173";

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

    // Rate limit: 5 portal sessions/min burst, 30/hr sustained — per user
    const { data: isAllowed, error: rateLimitError } = await supabase
      .rpc("check_rate_limit_hardened", {
        dimension_keys:           [`user:${user.id}`],
        cost:                     1,
        burst_limit:              5,
        burst_window_seconds:     60,
        sustained_limit:          30,
        sustained_window_seconds: 3600,
      });
    if (rateLimitError) {
      console.error("[stripe-portal] rate limit check failed:", rateLimitError);
    } else if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the org's Stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    const { data: org } = await supabase
      .from("organisations")
      .select("stripe_customer_id")
      .eq("id", profile?.org_id)
      .maybeSingle();

    if (!org?.stripe_customer_id) {
      throw new Error("No active subscription found. Please contact support.");
    }

    // Create billing portal session
    const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: org.stripe_customer_id,
        return_url: `${APP_URL}/settings/billing`,
      }),
    });

    const portal = await portalRes.json();
    if (!portalRes.ok) throw new Error(portal.error?.message ?? "Failed to create portal session");

    return new Response(
      JSON.stringify({ portalUrl: portal.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
