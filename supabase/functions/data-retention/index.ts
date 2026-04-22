import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { logAudit } from "../_shared/audit.ts"

const FN = "[data-retention]"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Soft-delete column name varies per table
const SOFT_DELETE_COLUMN: Record<string, string> = {
  call_summaries: "archived_at",
  account_states: "deleted_at",
  real_call_recordings: "deleted_at",
  call_transcript_chunks: "deleted_at",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const authHeader = req.headers.get("Authorization")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    if (!authHeader || !authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized — service role only" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: entries, error: fetchErr } = await supabase
      .from("data_classification_registry")
      .select("table_name, column_name, classification, retention_days")
      .not("retention_days", "is", null)

    if (fetchErr) {
      console.error(`${FN} failed to fetch classification registry:`, fetchErr)
      return new Response(JSON.stringify({ error: "Failed to read classification registry" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    if (!entries || entries.length === 0) {
      console.log(`${FN} no retention rules configured`)
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    // Group by table_name — take the shortest retention_days if multiple entries exist
    const tableRetention = new Map<string, { days: number; classification: string }>()
    for (const entry of entries) {
      const existing = tableRetention.get(entry.table_name)
      if (!existing || entry.retention_days < existing.days) {
        tableRetention.set(entry.table_name, {
          days: entry.retention_days,
          classification: entry.classification,
        })
      }
    }

    const results: { table: string; action: string; count: number }[] = []

    for (const [tableName, { days, classification }] of tableRetention) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      const cutoffIso = cutoff.toISOString()

      if (classification === "restricted") {
        // RESTRICTED: hard delete
        const { count, error: delErr } = await supabase
          .from(tableName)
          .delete({ count: "exact" })
          .lt("created_at", cutoffIso)

        if (delErr) {
          console.error(`${FN} hard delete failed for ${tableName}:`, delErr)
          continue
        }

        const deleted = count ?? 0
        if (deleted > 0) {
          results.push({ table: tableName, action: "hard_delete", count: deleted })
          await logAudit(supabase, {
            orgId: "system",
            userId: null,
            action: "retention.deleted",
            resourceType: tableName,
            resourceId: null,
            metadata: { table_name: tableName, row_count: deleted, classification, retention_days: days },
          })
        }
      } else {
        // CONFIDENTIAL: soft delete
        const softDeleteCol = SOFT_DELETE_COLUMN[tableName]
        if (!softDeleteCol) {
          console.warn(`${FN} no soft-delete column mapped for ${tableName} — skipping`)
          continue
        }

        const { count, error: softErr } = await supabase
          .from(tableName)
          .update({ [softDeleteCol]: new Date().toISOString() })
          .lt("created_at", cutoffIso)
          .is(softDeleteCol, null)
          .select("id", { count: "exact", head: true })

        if (softErr) {
          console.error(`${FN} soft delete failed for ${tableName}:`, softErr)
          continue
        }

        const softDeleted = count ?? 0
        if (softDeleted > 0) {
          results.push({ table: tableName, action: "soft_delete", count: softDeleted })
          await logAudit(supabase, {
            orgId: "system",
            userId: null,
            action: "retention.deleted",
            resourceType: tableName,
            resourceId: null,
            metadata: { table_name: tableName, row_count: softDeleted, classification, retention_days: days },
          })
        }
      }
    }

    console.log(`${FN} completed:`, JSON.stringify(results))
    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`${FN} unhandled error:`, err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }
})
