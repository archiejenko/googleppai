import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  try {
    const { org_id, provider } = await req.json();
    if (!org_id || !provider) {
      return new Response(
        JSON.stringify({ error: "org_id and provider are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conn, error } = await supabase
      .from("crm_connections")
      .select("*")
      .eq("org_id", org_id)
      .eq("provider", provider)
      .single();

    if (error || !conn) {
      return new Response(
        JSON.stringify({ error: "No CRM connection found for this org and provider" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: decryptedAccess } = await supabase.rpc("decrypt_token", { cipher_text: conn.access_token });
    const { data: decryptedRefresh } = await supabase.rpc("decrypt_token", { cipher_text: conn.refresh_token });

    if (!decryptedAccess || !decryptedRefresh) {
      throw new Error("Failed to decrypt stored tokens");
    }

    const expiresAt = new Date(conn.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      return new Response(
        JSON.stringify({ access_token: decryptedAccess, instance_url: conn.instance_url }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    let newAccessToken: string;
    let newExpiresAt: string;
    let newInstanceUrl: string | null = conn.instance_url;

    if (provider === "hubspot") {
      const clientId = Deno.env.get("HUBSPOT_CLIENT_ID")!;
      const clientSecret = Deno.env.get("HUBSPOT_CLIENT_SECRET")!;

      const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: decryptedRefresh,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`HubSpot refresh failed: ${tokenData.message}`);

      newAccessToken = tokenData.access_token;
      newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    } else {
      const clientId = Deno.env.get("SALESFORCE_CLIENT_ID")!;
      const clientSecret = Deno.env.get("SALESFORCE_CLIENT_SECRET")!;

      const tokenRes = await fetch(`${conn.instance_url}/services/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: decryptedRefresh,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`Salesforce refresh failed: ${tokenData.error_description}`);

      newAccessToken = tokenData.access_token;
      newInstanceUrl = tokenData.instance_url ?? conn.instance_url;
      newExpiresAt = new Date(Date.now() + 7200 * 1000).toISOString();
    }

    const { data: encNewAccess } = await supabase.rpc("encrypt_token", { plain_text: newAccessToken });

    const { error: updateError } = await supabase
      .from("crm_connections")
      .update({
        access_token: encNewAccess,
        token_expires_at: newExpiresAt,
        instance_url: newInstanceUrl,
      })
      .eq("id", conn.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ access_token: newAccessToken, instance_url: newInstanceUrl }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[crm-token-refresh] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Token refresh failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
