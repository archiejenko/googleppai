import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody } from "../_shared/validateBody.ts";

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

    // Rate limit: 5 checkout sessions/min burst, 20/hr sustained — per user
    const { data: isAllowed, error: rateLimitError } = await supabase
      .rpc("check_rate_limit_hardened", {
        dimension_keys:           [`user:${user.id}`],
        cost:                     1,
        burst_limit:              5,
        burst_window_seconds:     60,
        sustained_limit:          20,
        sustained_window_seconds: 3600,
      });
    if (rateLimitError) {
      console.error("[stripe-checkout] rate limit check failed:", rateLimitError);
    } else if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json().catch(() => null);
    const sv = validateBody<{ tier: string; billing_cycle?: string; seat_count?: number; triggered_from?: string; include_deployment_fee?: boolean; is_founding_member?: boolean }>(rawBody, {
      tier:                   { type: 'string',  required: true },
      billing_cycle:          { type: 'string' },
      seat_count:             { type: 'number' },
      triggered_from:         { type: 'string' },
      include_deployment_fee: { type: 'boolean' },
      is_founding_member:     { type: 'boolean' },
    });
    if (!sv.ok) return new Response(JSON.stringify({ error: sv.error }), {
      status: sv.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const {
      tier,
      billing_cycle = "monthly",
      seat_count = 1,
      triggered_from,
      include_deployment_fee = false,
      is_founding_member = false,
    } = sv.body;

    const validTiers = ["core", "revenue_intelligence"];
    if (!validTiers.includes(tier)) {
      return new Response(
        JSON.stringify({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validBillingCycles = ["monthly", "annual"];
    if (!validBillingCycles.includes(billing_cycle)) {
      return new Response(
        JSON.stringify({ error: `Invalid billing_cycle. Must be one of: ${validBillingCycles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // TODO: Founding member price lock — grandfathering via Stripe coupon not yet implemented.
    // For now, the founding member discount is handled at the pricing page level.
    // When implementing: create a Stripe coupon with 100% off the deployment fee and attach it here.

    // Resolve price ID from Supabase vault based on tier + billing cycle
    const priceIdMap: Record<string, string> = {
      "core:monthly": Deno.env.get("STRIPE_PI_MONTHLY_PRICE_ID") ?? "",
      "core:annual": Deno.env.get("STRIPE_PI_ANNUAL_PRICE_ID") ?? "",
      "revenue_intelligence:monthly": Deno.env.get("STRIPE_RI_MONTHLY_PRICE_ID") ?? "",
      "revenue_intelligence:annual": Deno.env.get("STRIPE_RI_ANNUAL_PRICE_ID") ?? "",
    };

    const priceIdKey = `${tier}:${billing_cycle}`;
    let PRICE_ID = priceIdMap[priceIdKey];

    // Legacy fallback: if new vault secrets aren't set, try the old single-price-ID secret
    if (!PRICE_ID) {
      PRICE_ID = Deno.env.get("STRIPE_REVENUE_INTEL_PRICE_ID") ?? "";
    }

    if (!PRICE_ID) {
      return new Response(
        JSON.stringify({ error: "STRIPE_NOT_CONFIGURED" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch user's org to get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id, name, email")
      .eq("id", user.id)
      .single();

    const { data: org } = await supabase
      .from("organisations")
      .select("id, name, stripe_customer_id")
      .eq("id", profile?.org_id)
      .maybeSingle();

    let customerId = org?.stripe_customer_id;

    // Create Stripe customer if not exists
    if (!customerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email!,
          name: org?.name ?? profile?.name ?? user.email!,
          "metadata[org_id]": org?.id ?? "",
          "metadata[user_id]": user.id,
        }),
      });
      const customer = await customerRes.json();
      if (!customerRes.ok) throw new Error(customer.error?.message ?? "Failed to create Stripe customer");

      customerId = customer.id;

      // Persist Stripe customer ID back to org
      if (org?.id) {
        const { error: customerIdUpdateError } = await supabase
          .from("organisations")
          .update({ stripe_customer_id: customerId })
          .eq("id", org.id);
        if (customerIdUpdateError) {
          throw new Error("Failed to persist Stripe customer ID: " + customerIdUpdateError.message);
        }
      }
    }

    // Build checkout session line items
    const checkoutParams = new URLSearchParams({
      "customer": customerId,
      "mode": "subscription",
      "line_items[0][price]": PRICE_ID,
      "line_items[0][quantity]": String(seat_count),
      "success_url": `${APP_URL}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${APP_URL}/settings/billing?checkout=cancelled`,
      "metadata[org_id]": org?.id ?? "",
      "metadata[user_id]": user.id,
      "metadata[tier]": tier,
      "metadata[billing_cycle]": billing_cycle,
      "metadata[triggered_from]": triggered_from ?? "unknown",
      "metadata[is_founding_member]": String(is_founding_member),
      "allow_promotion_codes": "true",
      "billing_address_collection": "required",
    });

    // Add deployment fee on the first subscription invoice via add_invoice_items.
    // This keeps mode: "subscription" — Stripe rejects one-time line_items in subscription sessions.
    if (include_deployment_fee) {
      const DEPLOYMENT_FEE_PRICE_ID = Deno.env.get("STRIPE_DEPLOYMENT_FEE_PRICE_ID");
      if (DEPLOYMENT_FEE_PRICE_ID) {
        checkoutParams.set("subscription_data[add_invoice_items][0][price]", DEPLOYMENT_FEE_PRICE_ID);
        checkoutParams.set("subscription_data[add_invoice_items][0][quantity]", "1");
      } else {
        console.warn("[stripe-checkout] include_deployment_fee=true but STRIPE_DEPLOYMENT_FEE_PRICE_ID not set — skipping fee");
      }
    }

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: checkoutParams,
    });

    const session = await sessionRes.json();
    if (!sessionRes.ok) throw new Error(session.error?.message ?? "Failed to create checkout session");

    return new Response(
      JSON.stringify({ checkoutUrl: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error('[stripe-checkout] unhandled error:', error);
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
