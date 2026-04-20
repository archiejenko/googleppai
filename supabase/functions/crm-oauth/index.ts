import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const provider = url.searchParams.get("provider");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const resolveUser = async () => {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing authorization header");
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error } = await userClient.auth.getUser();
      if (error || !user) throw new Error("Unauthorized");
      return user;
    };

    const resolveOrgId = async (userId: string) => {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("org_id, role")
        .eq("id", userId)
        .single();
      if (!profile?.org_id) throw new Error("No organisation found");
      return { orgId: profile.org_id, role: profile.role };
    };

    const requireAdmin = (role: string) => {
      if (role !== "admin") {
        throw new Error("Only org admins can manage CRM connections");
      }
    };

    // ── CONNECT: build OAuth redirect URL ──────────────────────────────────
    if (action === "connect" && req.method === "GET") {
      if (!provider || !["hubspot", "salesforce"].includes(provider)) {
        return new Response(
          JSON.stringify({ error: "provider must be hubspot or salesforce" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const user = await resolveUser();
      const { role } = await resolveOrgId(user.id);
      requireAdmin(role);

      let redirectUrl: string;

      if (provider === "hubspot") {
        const clientId = Deno.env.get("HUBSPOT_CLIENT_ID");
        const redirectUri = Deno.env.get("HUBSPOT_REDIRECT_URI");
        if (!clientId || !redirectUri) throw new Error("HubSpot OAuth env vars not configured");
        const scopes = "crm.objects.deals.read crm.objects.owners.read";
        redirectUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
      } else {
        const clientId = Deno.env.get("SALESFORCE_CLIENT_ID");
        const redirectUri = Deno.env.get("SALESFORCE_REDIRECT_URI");
        if (!clientId || !redirectUri) throw new Error("Salesforce OAuth env vars not configured");
        redirectUrl = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      }

      return new Response(
        JSON.stringify({ url: redirectUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── CALLBACK: exchange code for tokens ─────────────────────────────────
    if (action === "callback" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!provider || !["hubspot", "salesforce"].includes(provider)) {
        return new Response(
          JSON.stringify({ error: "provider must be hubspot or salesforce" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing code parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const user = await resolveUser();
      const { orgId } = await resolveOrgId(user.id);

      let accessToken: string;
      let refreshToken: string;
      let expiresAt: string;
      let instanceUrl: string | null = null;

      if (provider === "hubspot") {
        const clientId = Deno.env.get("HUBSPOT_CLIENT_ID")!;
        const clientSecret = Deno.env.get("HUBSPOT_CLIENT_SECRET")!;
        const redirectUri = Deno.env.get("HUBSPOT_REDIRECT_URI")!;

        const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code,
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(`HubSpot token exchange failed: ${tokenData.message}`);

        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;
        expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      } else {
        const clientId = Deno.env.get("SALESFORCE_CLIENT_ID")!;
        const clientSecret = Deno.env.get("SALESFORCE_CLIENT_SECRET")!;
        const redirectUri = Deno.env.get("SALESFORCE_REDIRECT_URI")!;

        const tokenRes = await fetch("https://login.salesforce.com/services/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code,
          }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(`Salesforce token exchange failed: ${tokenData.error_description}`);

        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;
        instanceUrl = tokenData.instance_url;
        expiresAt = new Date(Date.now() + 7200 * 1000).toISOString();
      }

      const { error: upsertError } = await supabaseAdmin
        .from("crm_connections")
        .upsert({
          org_id: orgId,
          provider,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: expiresAt,
          instance_url: instanceUrl,
          connected_at: new Date().toISOString(),
          connected_by: user.id,
        }, { onConflict: "org_id,provider" });

      if (upsertError) throw upsertError;

      return new Response(
        JSON.stringify({ connected: true, provider }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── DISCONNECT ─────────────────────────────────────────────────────────
    if (action === "disconnect" && req.method === "POST") {
      if (!provider || !["hubspot", "salesforce"].includes(provider)) {
        return new Response(
          JSON.stringify({ error: "provider must be hubspot or salesforce" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const user = await resolveUser();
      const { orgId, role } = await resolveOrgId(user.id);
      requireAdmin(role);

      const { error } = await supabaseAdmin
        .from("crm_connections")
        .delete()
        .eq("org_id", orgId)
        .eq("provider", provider);

      if (error) throw error;

      return new Response(
        JSON.stringify({ disconnected: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── STATUS ─────────────────────────────────────────────────────────────
    if (action === "status" && req.method === "GET") {
      const user = await resolveUser();
      const { orgId } = await resolveOrgId(user.id);

      const { data: connections, error } = await supabaseAdmin
        .from("crm_connections")
        .select("provider, connected_at, last_synced_at, sync_error")
        .eq("org_id", orgId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ connections: connections ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use connect, callback, disconnect, or status." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[crm-oauth] error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    const status = message.includes("Unauthorized") || message.includes("authorization") ? 401
      : message.includes("admin") ? 403
      : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
