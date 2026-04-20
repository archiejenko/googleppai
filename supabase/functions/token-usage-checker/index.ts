import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface OrgRow {
  id: string;
  seats_licensed: number;
  monthly_token_allowance: number;
  token_allowance_override: number | null;
  token_overage_enabled: boolean;
  token_warning_sent_75: boolean;
  token_warning_sent_90: boolean;
  token_warning_reset_at: string | null;
}

async function sendWarningEmail(
  to: string[],
  subject: string,
  body: string,
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey || to.length === 0) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "OAST <notifications@oast-ai.com>",
      to,
      subject,
      text: body,
    }),
  });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: "Service role only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString();

    const { data: orgs } = await supabase
      .from("organisations")
      .select(
        "id, seats_licensed, monthly_token_allowance, token_allowance_override, token_overage_enabled, token_warning_sent_75, token_warning_sent_90, token_warning_reset_at",
      )
      .eq("tier", "revenue_intelligence");

    if (!orgs || orgs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, orgs_checked: 0, warnings_sent: 0, orgs_over_100: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let warningsSent = 0;
    let orgsOver100 = 0;

    for (const org of orgs as OrgRow[]) {
      const { data: usageRows } = await supabase
        .from("token_usage_log")
        .select("total_tokens")
        .eq("org_id", org.id)
        .gte("logged_at", monthStartIso);

      const tokensUsed = (usageRows ?? []).reduce(
        (sum: number, r: { total_tokens: number }) => sum + (r.total_tokens ?? 0),
        0,
      );

      const effectiveAllowance = org.token_allowance_override ?? org.monthly_token_allowance * org.seats_licensed;
      if (effectiveAllowance <= 0) continue;

      const usagePct = (tokensUsed / effectiveAllowance) * 100;

      const resetNeeded =
        !org.token_warning_reset_at || new Date(org.token_warning_reset_at) < monthStart;

      if (resetNeeded) {
        await supabase
          .from("organisations")
          .update({
            token_warning_sent_75: false,
            token_warning_sent_90: false,
            token_warning_reset_at: monthStartIso,
          })
          .eq("id", org.id);
        org.token_warning_sent_75 = false;
        org.token_warning_sent_90 = false;
      }

      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("org_id", org.id)
        .eq("role", "admin");

      const adminIds = (admins ?? []).map((a: { id: string }) => a.id);
      const adminEmails: string[] = [];
      for (const aid of adminIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(aid);
        if (userData?.user?.email) adminEmails.push(userData.user.email);
      }

      const usedStr = formatTokens(tokensUsed);
      const allowedStr = formatTokens(effectiveAllowance);

      if (usagePct >= 75 && !org.token_warning_sent_75) {
        await supabase.from("token_usage_warnings").insert({
          org_id: org.id,
          threshold: 75,
          tokens_used: tokensUsed,
          tokens_allowed: effectiveAllowance,
        });
        await supabase
          .from("organisations")
          .update({ token_warning_sent_75: true })
          .eq("id", org.id);

        await sendWarningEmail(
          adminEmails,
          "OAST: Your team is approaching the monthly AI usage limit",
          `Your team has used 75% of your monthly AI token allowance (${usedStr} of ${allowedStr} tokens). This covers live call scoring, AI coaching, and meeting transcription. You have plenty of headroom remaining. No action is needed. If you expect higher usage this month, contact your account manager.`,
        );
        warningsSent++;
      }

      if (usagePct >= 90 && !org.token_warning_sent_90) {
        await supabase.from("token_usage_warnings").insert({
          org_id: org.id,
          threshold: 90,
          tokens_used: tokensUsed,
          tokens_allowed: effectiveAllowance,
        });
        await supabase
          .from("organisations")
          .update({ token_warning_sent_90: true })
          .eq("id", org.id);

        await sendWarningEmail(
          adminEmails,
          "OAST: Your team has used 90% of your monthly AI usage limit",
          `Your team has used 90% of your monthly AI token allowance (${usedStr} of ${allowedStr} tokens). Usage will continue uninterrupted. If you regularly exceed this level, get in touch and we will review your plan.`,
        );
        warningsSent++;
      }

      if (usagePct >= 100) {
        orgsOver100++;

        const { data: existing100 } = await supabase
          .from("token_usage_warnings")
          .select("id")
          .eq("org_id", org.id)
          .eq("threshold", 100)
          .gte("sent_at", monthStartIso)
          .limit(1);

        if (!existing100 || existing100.length === 0) {
          await supabase.from("token_usage_warnings").insert({
            org_id: org.id,
            threshold: 100,
            tokens_used: tokensUsed,
            tokens_allowed: effectiveAllowance,
          });

          if (!org.token_overage_enabled) {
            await sendWarningEmail(
              adminEmails,
              "OAST: Your team has exceeded the monthly AI fair use allowance",
              `Your team has exceeded your monthly AI token allowance (${usedStr} of ${allowedStr} tokens). Your access continues uninterrupted. We will be in touch to discuss your usage and whether an adjusted plan makes sense for your team.`,
            );
            warningsSent++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        orgs_checked: orgs.length,
        warnings_sent: warningsSent,
        orgs_over_100: orgsOver100,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[token-usage-checker] error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
