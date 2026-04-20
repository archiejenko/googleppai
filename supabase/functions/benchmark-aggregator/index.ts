import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const METRICS = [
  "delivery_gap",
  "readiness_gap",
  "talk_ratio_gap",
  "discovery_gap",
  "meddic_avg",
  "win_rate",
] as const;

const METRIC_COLUMN_MAP: Record<string, string> = {
  delivery_gap: "delivery_gap_score",
  readiness_gap: "readiness_gap_score",
  talk_ratio_gap: "talk_ratio_training",
  discovery_gap: "discovery_training",
  meddic_avg: "meddic_avg",
  win_rate: "deal_win_rate",
};

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

    const url = new URL(req.url);
    const periodDays = parseInt(url.searchParams.get("period_days") ?? "30", 10);

    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    let rowsInserted = 0;
    let rowsSkipped = 0;

    for (const metric of METRICS) {
      const col = METRIC_COLUMN_MAP[metric];

      const slices: Array<{ industry: string | null; company_size: string | null; label: string }> = [
        { industry: null, company_size: null, label: "global" },
      ];

      const { data: industries } = await supabase
        .from("organisations")
        .select("industry")
        .not("industry", "is", null);

      const uniqueIndustries = [...new Set((industries ?? []).map(r => r.industry).filter(Boolean))];
      for (const ind of uniqueIndustries) {
        slices.push({ industry: ind, company_size: null, label: `industry:${ind}` });
      }

      for (const cs of ["smb", "midmarket", "enterprise"]) {
        slices.push({ industry: null, company_size: cs, label: `company_size:${cs}` });
      }

      for (const slice of slices) {
        let filterClause = "";
        const params: Record<string, string> = {
          col_name: col,
          period_start: periodStart,
        };

        if (slice.industry) {
          filterClause = "AND o.industry = $3";
          params.filter_val = slice.industry;
        } else if (slice.company_size) {
          filterClause = "AND o.company_size = $3";
          params.filter_val = slice.company_size;
        }

        const filterParam = (slice.industry || slice.company_size) ? `, '${(slice.industry || slice.company_size)!.replace(/'/g, "''")}'` : "";

        const query = `
          SELECT
            COUNT(*)::integer AS sample_size,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY t.${col}) AS p25,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY t.${col}) AS p50,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY t.${col}) AS p75,
            PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY t.${col}) AS p90
          FROM transfer_gap_scores t
          JOIN profiles p ON p.id = t.user_id
          JOIN organisations o ON o.id = p.org_id
          WHERE t.${col} IS NOT NULL
            AND t.computed_at >= '${periodStart}'
            ${slice.industry ? `AND o.industry = '${slice.industry.replace(/'/g, "''")}'` : ""}
            ${slice.company_size ? `AND o.company_size = '${slice.company_size.replace(/'/g, "''")}'` : ""}
        `;

        const { data: result, error } = await supabase.rpc("exec_sql", { query }).maybeSingle();

        if (error) {
          const { data: rawResult } = await supabase
            .from("transfer_gap_scores")
            .select(col)
            .not(col, "is", null)
            .gte("computed_at", periodStart);

          if (!rawResult || rawResult.length < 10) {
            rowsSkipped++;
            continue;
          }

          const values = rawResult.map((r: Record<string, number>) => r[col]).sort((a: number, b: number) => a - b);
          const percentile = (p: number) => {
            const idx = (p / 100) * (values.length - 1);
            const lower = Math.floor(idx);
            const upper = Math.ceil(idx);
            if (lower === upper) return values[lower];
            return values[lower] + (values[upper] - values[lower]) * (idx - lower);
          };

          const { error: upsertErr } = await supabase
            .from("transfer_gap_benchmarks")
            .upsert({
              period_start: periodStart,
              period_end: periodEnd,
              metric,
              industry: slice.industry,
              company_size: slice.company_size,
              p25: percentile(25),
              p50: percentile(50),
              p75: percentile(75),
              p90: percentile(90),
              sample_size: values.length,
              computed_at: now.toISOString(),
            }, { onConflict: "period_start,period_end,metric,industry,company_size" });

          if (!upsertErr) rowsInserted++;
          else rowsSkipped++;
          continue;
        }

        const row = Array.isArray(result) ? result[0] : result;
        if (!row || row.sample_size < 10) {
          rowsSkipped++;
          continue;
        }

        const { error: upsertErr } = await supabase
          .from("transfer_gap_benchmarks")
          .upsert({
            period_start: periodStart,
            period_end: periodEnd,
            metric,
            industry: slice.industry,
            company_size: slice.company_size,
            p25: row.p25,
            p50: row.p50,
            p75: row.p75,
            p90: row.p90,
            sample_size: row.sample_size,
            computed_at: now.toISOString(),
          }, { onConflict: "period_start,period_end,metric,industry,company_size" });

        if (!upsertErr) rowsInserted++;
        else rowsSkipped++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, rows_inserted: rowsInserted, rows_skipped: rowsSkipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[benchmark-aggregator] unhandled error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
