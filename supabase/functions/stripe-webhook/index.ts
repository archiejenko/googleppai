// TODO: Register this endpoint in the Stripe Dashboard before deploying.
// URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events: checkout.session.completed, customer.subscription.updated,
//         customer.subscription.deleted, invoice.payment_failed
// Add the signing secret as STRIPE_WEBHOOK_SECRET in Supabase Vault.
// STRIPE_WEBHOOK_SECRET ≠ STRIPE_SECRET_KEY — they are different secrets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe-webhook] Missing required env vars");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // CRITICAL: Read raw body BEFORE any parsing — constructEvent requires the raw string
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify Stripe webhook signature
  let event: any;
  try {
    event = await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(supabase, event.data.object);
        break;

      default:
        // Unhandled event — return 200 to acknowledge receipt
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err.message);
    // Return 200 to prevent Stripe from retrying — log the error for manual resolution
    return new Response(JSON.stringify({ received: true, warning: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Verify Stripe webhook signature using HMAC-SHA256.
 * Must use the raw body string — do NOT parse JSON before calling this.
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<any> {
  // Parse the stripe-signature header: t=<timestamp>,v1=<sig1>,v1=<sig2>,...
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, rest.join("=")];
    }),
  );

  const timestamp = parts["t"];
  const signatures = signature.split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid stripe-signature format");
  }

  // Check timestamp tolerance (5 minutes)
  const tolerance = 300;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) {
    throw new Error("Stripe signature timestamp too old");
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );
  const expectedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const isValid = signatures.some((sig) => sig === expectedSig);
  if (!isValid) {
    throw new Error("Stripe signature mismatch");
  }

  return JSON.parse(payload);
}

/**
 * checkout.session.completed
 * Update org tier and store stripe_subscription_id.
 */
async function handleCheckoutCompleted(supabase: any, session: any) {
  const orgId = session.metadata?.org_id;
  const tier = session.metadata?.tier;
  const subscriptionId = session.subscription;

  if (!orgId) {
    console.warn("[stripe-webhook] checkout.session.completed: missing org_id in metadata");
    return;
  }

  const updates: Record<string, unknown> = {};
  if (tier) updates.tier = tier;
  if (subscriptionId) {
    // TODO: Ensure organisations table has stripe_subscription_id column
    updates.stripe_subscription_id = subscriptionId;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("organisations")
      .update(updates)
      .eq("id", orgId);

    if (error) throw new Error(`Failed to update org ${orgId}: ${error.message}`);
    console.log(`[stripe-webhook] Org ${orgId} updated: tier=${tier}, sub=${subscriptionId}`);
  }
}

/**
 * customer.subscription.updated
 * Resolve new tier from price ID and update org.
 */
async function handleSubscriptionUpdated(supabase: any, subscription: any) {
  const customerId = subscription.customer;
  const priceId = subscription.items?.data?.[0]?.price?.id;

  if (!customerId || !priceId) {
    console.warn("[stripe-webhook] subscription.updated: missing customer or price ID");
    return;
  }

  // Resolve tier from price ID
  const piPriceIds = [
    Deno.env.get("STRIPE_PI_MONTHLY_PRICE_ID"),
    Deno.env.get("STRIPE_PI_ANNUAL_PRICE_ID"),
  ].filter(Boolean);
  const newTier = piPriceIds.includes(priceId) ? "core" : "revenue_intelligence";

  // TODO: Ensure organisations table has stripe_customer_id column
  const { error } = await supabase
    .from("organisations")
    .update({ tier: newTier })
    .eq("stripe_customer_id", customerId);

  if (error) throw new Error(`Failed to update org by customer ${customerId}: ${error.message}`);
  console.log(`[stripe-webhook] Org (customer=${customerId}) tier updated to ${newTier}`);
}

/**
 * customer.subscription.deleted
 * Downgrade org to 'core' tier.
 */
async function handleSubscriptionDeleted(supabase: any, subscription: any) {
  const customerId = subscription.customer;

  if (!customerId) {
    console.warn("[stripe-webhook] subscription.deleted: missing customer ID");
    return;
  }

  // TODO: Ensure organisations table has stripe_customer_id column
  const { error } = await supabase
    .from("organisations")
    .update({ tier: "inactive", stripe_subscription_id: null })
    .eq("stripe_customer_id", customerId);

  if (error) throw new Error(`Failed to downgrade org for customer ${customerId}: ${error.message}`);
  console.log(`[stripe-webhook] Org (customer=${customerId}) downgraded to core`);
}

/**
 * invoice.payment_failed
 * Flag org with payment_failed — do NOT immediately downgrade.
 */
async function handlePaymentFailed(supabase: any, invoice: any) {
  const customerId = invoice.customer;

  if (!customerId) {
    console.warn("[stripe-webhook] invoice.payment_failed: missing customer ID");
    return;
  }

  // TODO: Ensure organisations table has payment_failed boolean column
  const { error } = await supabase
    .from("organisations")
    .update({ payment_failed: true })
    .eq("stripe_customer_id", customerId);

  if (error) throw new Error(`Failed to flag payment_failed for customer ${customerId}: ${error.message}`);
  console.log(`[stripe-webhook] Org (customer=${customerId}) flagged as payment_failed`);
}
