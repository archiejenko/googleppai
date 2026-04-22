import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── HubSpot industry → industry_profiles slug ────────────────────────────────

const INDUSTRY_MAP: Record<string, string> = {
  COMPUTER_SOFTWARE: "saas",
  INFORMATION_TECHNOLOGY_AND_SERVICES: "saas",
  INTERNET: "saas",
  COMPUTER_HARDWARE: "saas",
  COMPUTER_NETWORKING: "saas",
  FINANCIAL_SERVICES: "fintech",
  BANKING: "fintech",
  INSURANCE: "fintech",
  INVESTMENT_BANKING: "fintech",
  CAPITAL_MARKETS: "fintech",
  STAFFING_AND_RECRUITING: "recruitment",
  HUMAN_RESOURCES: "recruitment",
};

function mapIndustry(hubspotIndustry: string | null): string {
  if (!hubspotIndustry) return "saas";
  const key = hubspotIndustry.toUpperCase().replace(/[\s&-]/g, "_");
  return INDUSTRY_MAP[key] ?? "saas";
}

function mapSize(employees: string | null): string {
  const n = parseInt(employees ?? "0", 10);
  if (isNaN(n) || n <= 10) return "startup";
  if (n <= 200) return "smb";
  if (n <= 1000) return "mid_market";
  return "enterprise";
}

function mapStage(lifecycle: string | null): string {
  switch (lifecycle?.toLowerCase()) {
    case "subscriber":
    case "lead":
      return "cold";
    case "marketingqualifiedlead":
    case "salesqualifiedlead":
      return "discovery";
    case "opportunity":
      return "evaluation";
    case "customer":
      return "closed_won";
    case "evangelist":
      return "closed_won";
    default:
      return "cold";
  }
}

function deriveSeniority(title: string | null): string {
  if (!title) return "junior";
  const t = title.toLowerCase();
  if (/\b(vp|vice president|director|head of|chief|c[a-z]o|cto|cfo|ceo|coo|cmo|cro)\b/.test(t)) return "senior";
  if (/\b(manager|lead|senior|principal)\b/.test(t)) return "mid";
  return "junior";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Auth: resolve user + org + require admin ──────────────────────────

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("org_id, role")
      .eq("id", user.id)
      .single();
    if (!profile?.org_id) throw new Error("No organisation found");
    const orgId = profile.org_id;

    if (profile.role !== "admin") {
      throw new Error("Only org admins can manage CRM sync");
    }

    const { data: org } = await supabaseAdmin
      .from("organisations")
      .select("tier")
      .eq("id", orgId)
      .single();
    if (org?.tier !== "revenue_intelligence") {
      throw new Error("Revenue Intelligence tier required");
    }

    // ── Action: get_status ───────────────────────────────────────────────

    if (action === "get_status") {
      const { data: connections } = await supabaseAdmin
        .from("crm_connections")
        .select("id, provider, instance_url, connected_at, last_synced_at, sync_status, sync_error, scopes, field_mappings")
        .eq("org_id", orgId);

      const enriched = await Promise.all(
        (connections ?? []).map(async (conn) => {
          const { count: companyCount } = await supabaseAdmin
            .from("simulated_companies")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .eq("external_provider", conn.provider);

          const { count: personaCount } = await supabaseAdmin
            .from("simulated_personas")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .eq("external_provider", conn.provider);

          const isExpired = conn.sync_status === "error" &&
            conn.sync_error?.includes("refresh failed");

          return {
            id: conn.id,
            provider: conn.provider,
            hub_id: null,
            instance_url: conn.instance_url,
            status: isExpired ? "expired" : "active",
            connected_at: conn.connected_at,
            last_synced_at: conn.last_synced_at,
            sync_status: conn.sync_status,
            sync_error: conn.sync_error,
            field_mappings: conn.field_mappings ?? {},
            company_count: companyCount ?? 0,
            persona_count: personaCount ?? 0,
          };
        }),
      );

      return json({ ok: true, data: { connections: enriched } });
    }

    // ── Action: exchange_code ────────────────────────────────────────────

    if (action === "exchange_code") {
      const { provider, code } = body;
      if (!provider || !code) return json({ ok: false, error: "provider and code required" }, 400);
      if (!["hubspot", "salesforce"].includes(provider)) {
        return json({ ok: false, error: "provider must be hubspot or salesforce" }, 400);
      }

      let accessToken: string;
      let refreshToken: string;
      let expiresAt: string;
      let instanceUrl: string | null = null;
      let grantedScopes: string[] = [];

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
        grantedScopes = (tokenData.scope ?? "").split(" ").filter(Boolean);
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
        grantedScopes = (tokenData.scope ?? "").split(" ").filter(Boolean);
      }

      const { data: encAccess } = await supabaseAdmin.rpc("encrypt_token", { plain_text: accessToken });
      const { data: encRefresh } = await supabaseAdmin.rpc("encrypt_token", { plain_text: refreshToken });

      const { error: upsertErr } = await supabaseAdmin
        .from("crm_connections")
        .upsert({
          org_id: orgId,
          provider,
          access_token: encAccess,
          refresh_token: encRefresh,
          token_expires_at: expiresAt,
          instance_url: instanceUrl,
          scopes: grantedScopes,
          sync_status: "pending",
          connected_at: new Date().toISOString(),
          connected_by: user.id,
        }, { onConflict: "org_id,provider" });

      if (upsertErr) throw upsertErr;
      return json({ ok: true, data: { connected: true, provider } });
    }

    // ── Action: disconnect ───────────────────────────────────────────────

    if (action === "disconnect") {
      const { provider } = body;
      if (!provider) return json({ ok: false, error: "provider required" }, 400);

      const { error } = await supabaseAdmin
        .from("crm_connections")
        .delete()
        .eq("org_id", orgId)
        .eq("provider", provider);

      if (error) throw error;
      return json({ ok: true });
    }

    // ── Action: update_field_mappings ────────────────────────────────────

    if (action === "update_field_mappings") {
      const { provider, field_mappings } = body;
      if (!provider || !field_mappings) {
        return json({ ok: false, error: "provider and field_mappings required" }, 400);
      }

      const { error } = await supabaseAdmin
        .from("crm_connections")
        .update({ field_mappings })
        .eq("org_id", orgId)
        .eq("provider", provider);

      if (error) throw error;
      return json({ ok: true });
    }

    // ── Action: manual_sync ──────────────────────────────────────────────

    if (action === "manual_sync") {
      const limit = Math.min(body.limit ?? 20, 100);

      const { data: conn } = await supabaseAdmin
        .from("crm_connections")
        .select("*")
        .eq("org_id", orgId)
        .single();

      if (!conn) return json({ ok: false, error: "No CRM connection found" }, 404);

      await supabaseAdmin
        .from("crm_connections")
        .update({ sync_status: "syncing", sync_error: null })
        .eq("id", conn.id);

      try {
        // Get fresh access token via crm-token-refresh
        const refreshRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-token-refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ org_id: orgId, provider: conn.provider }),
          },
        );
        const refreshData = await refreshRes.json();
        if (!refreshRes.ok) throw new Error(refreshData.error ?? "Token refresh failed");
        const accessToken = refreshData.access_token;

        let companiesSynced = 0;
        let personasSynced = 0;

        if (conn.provider === "hubspot") {
          // Fetch companies from HubSpot
          const companiesUrl = new URL("https://api.hubapi.com/crm/v3/objects/companies");
          companiesUrl.searchParams.set("limit", String(limit));
          companiesUrl.searchParams.set(
            "properties",
            "name,industry,numberofemployees,lifecyclestage,domain,description,city,country",
          );

          const companiesRes = await fetch(companiesUrl.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const companiesData = await companiesRes.json();
          if (!companiesRes.ok) {
            throw new Error(`HubSpot companies fetch failed: ${companiesData.message ?? companiesRes.status}`);
          }

          const companyIdMap = new Map<string, string>();

          for (const company of companiesData.results ?? []) {
            const props = company.properties ?? {};
            const { data: companyId } = await supabaseAdmin.rpc("upsert_crm_company", {
              p_org_id: orgId,
              p_external_id: `hubspot_${company.id}`,
              p_external_provider: "hubspot",
              p_name: props.name || `Company ${company.id}`,
              p_industry_slug: mapIndustry(props.industry),
              p_size: mapSize(props.numberofemployees),
              p_stage: mapStage(props.lifecyclestage),
              p_tech_stack: JSON.stringify([]),
              p_strategic_priorities: JSON.stringify(
                props.description ? [props.description] : [],
              ),
              p_pain_points: JSON.stringify([]),
            });

            if (companyId) {
              companyIdMap.set(company.id, companyId);
              companiesSynced++;
            }
          }

          // Fetch contacts associated with synced companies
          if (companyIdMap.size > 0) {
            for (const [hsCompanyId, dbCompanyId] of companyIdMap) {
              const contactsUrl = `https://api.hubapi.com/crm/v3/objects/companies/${hsCompanyId}/associations/contacts`;
              const assocRes = await fetch(contactsUrl, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              const assocData = await assocRes.json();
              if (!assocRes.ok) continue;

              const contactIds = (assocData.results ?? [])
                .map((a: { id?: string; toObjectId?: string }) => a.toObjectId ?? a.id)
                .filter(Boolean);

              if (contactIds.length === 0) continue;

              // Batch-read contact details
              const batchRes = await fetch(
                "https://api.hubapi.com/crm/v3/objects/contacts/batch/read",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    properties: ["firstname", "lastname", "jobtitle", "email"],
                    inputs: contactIds.map((id: string) => ({ id })),
                  }),
                },
              );
              const batchData = await batchRes.json();
              if (!batchRes.ok) continue;

              for (const contact of batchData.results ?? []) {
                const cp = contact.properties ?? {};
                const fullName = [cp.firstname, cp.lastname].filter(Boolean).join(" ") || `Contact ${contact.id}`;
                const title = cp.jobtitle || "Unknown Role";

                const { data: personaId } = await supabaseAdmin.rpc("upsert_crm_persona", {
                  p_org_id: orgId,
                  p_company_id: dbCompanyId,
                  p_external_id: `hubspot_${contact.id}`,
                  p_external_provider: "hubspot",
                  p_name: fullName,
                  p_title: title,
                  p_seniority: deriveSeniority(title),
                });

                if (personaId) personasSynced++;
              }
            }
          }
        }

        await supabaseAdmin
          .from("crm_connections")
          .update({
            sync_status: "complete",
            sync_error: null,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", conn.id);

        return json({
          ok: true,
          data: { companies_synced: companiesSynced, personas_synced: personasSynced },
        });
      } catch (syncErr: unknown) {
        const msg = syncErr instanceof Error ? syncErr.message : "Sync failed";
        console.error("[crm-sync] sync error:", syncErr);

        await supabaseAdmin
          .from("crm_connections")
          .update({ sync_status: "error", sync_error: msg })
          .eq("id", conn.id);

        return json({ ok: false, error: msg }, 500);
      }
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (error: unknown) {
    console.error("[crm-sync] error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    const status = message.includes("Unauthorized") || message.includes("authorization") ? 401
      : message.includes("admin") || message.includes("tier required") ? 403
      : 500;
    return json({ ok: false, error: message }, status);
  }
});
