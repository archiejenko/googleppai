import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FN = "[performance-snapshot]"
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const STAGE_ORDER: Record<string, number> = {
  cold: 0,
  discovery: 1,
  evaluation: 2,
  negotiation: 3,
  closed_won: 4,
}

const TERMINAL_STAGES = new Set(["closed_won", "closed_lost", "ghosted"])

interface PeriodDef {
  type: "weekly" | "monthly" | "quarterly"
  start: string
  end: string
}

function getCurrentPeriods(now: Date): PeriodDef[] {
  const periods: PeriodDef[] = []

  // Weekly: ISO week (Monday–Sunday)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  periods.push({
    type: "weekly",
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  })

  // Monthly
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  periods.push({
    type: "monthly",
    start: monthStart.toISOString().slice(0, 10),
    end: monthEnd.toISOString().slice(0, 10),
  })

  // Quarterly
  const q = Math.floor(now.getMonth() / 3)
  const qStart = new Date(now.getFullYear(), q * 3, 1)
  const qEnd = new Date(now.getFullYear(), q * 3 + 3, 0)
  periods.push({
    type: "quarterly",
    start: qStart.toISOString().slice(0, 10),
    end: qEnd.toISOString().slice(0, 10),
  })

  return periods
}

interface Scores {
  stage_progression_rate: number | null
  credibility_maintenance: number | null
  commitment_follow_through: number | null
  objection_resolution_rate: number | null
  rapport_building_speed: number | null
  simulated_conversion_rate: number | null
  avg_sentiment_trajectory: number | null
}

function computeScores(
  accountStates: any[],
  callSummaries: any[],
): { scores: Scores; accountCount: number; callCount: number } {
  const accountCount = accountStates.length
  const callCount = callSummaries.length

  if (accountCount === 0) {
    return {
      scores: {
        stage_progression_rate: null,
        credibility_maintenance: null,
        commitment_follow_through: null,
        objection_resolution_rate: null,
        rapport_building_speed: null,
        simulated_conversion_rate: null,
        avg_sentiment_trajectory: null,
      },
      accountCount: 0,
      callCount: 0,
    }
  }

  // 1. stage_progression_rate
  const accountsWith2Calls = accountStates.filter((a) => (a.call_count ?? 0) >= 2)
  let advancedCount = 0
  for (const a of accountsWith2Calls) {
    const stageVal = STAGE_ORDER[a.current_stage] ?? 0
    if (stageVal > 0) advancedCount++
  }
  const stageProgressionRate =
    accountsWith2Calls.length > 0
      ? Math.round((advancedCount / accountsWith2Calls.length) * 100) / 100
      : null

  // 2. credibility_maintenance
  const activeAccounts = accountStates.filter(
    (a) => !TERMINAL_STAGES.has(a.current_stage),
  )
  let credSum = 0
  let credCount = 0
  for (const a of activeAccounts) {
    const notes = a.relationship_notes as Record<string, unknown> | null
    if (notes && typeof notes.credibility_score === "number") {
      credSum += notes.credibility_score
      credCount++
    }
  }
  const credibilityMaintenance =
    credCount > 0 ? Math.round((credSum / credCount) * 10) / 10 : null

  // 3. commitment_follow_through
  let totalCommitments = 0
  let fulfilledCommitments = 0
  for (const a of accountStates) {
    const notes = a.relationship_notes as Record<string, unknown> | null
    if (!notes) continue
    const made = Array.isArray(notes.commitments_made_by_rep)
      ? (notes.commitments_made_by_rep as string[]).length
      : 0
    const fulfilled = Array.isArray(notes.commitments_fulfilled)
      ? (notes.commitments_fulfilled as string[]).length
      : 0
    totalCommitments += made
    fulfilledCommitments += fulfilled
  }
  const commitmentFollowThrough =
    totalCommitments > 0
      ? Math.round((fulfilledCommitments / totalCommitments) * 100) / 100
      : null

  // 4. objection_resolution_rate
  let totalObjections = 0
  let handledWell = 0
  for (const cs of callSummaries) {
    const objs = cs.objections_raised
    if (!Array.isArray(objs)) continue
    for (const obj of objs) {
      totalObjections++
      if (obj && obj.handled_well === true) handledWell++
    }
  }
  const objectionResolutionRate =
    totalObjections > 0
      ? Math.round((handledWell / totalObjections) * 100) / 100
      : null

  // 5. rapport_building_speed
  // Group call_summaries by account_state_id, replay rapport logic
  const callsByAccount = new Map<string, any[]>()
  for (const cs of callSummaries) {
    const key = cs.account_state_id
    if (!callsByAccount.has(key)) callsByAccount.set(key, [])
    callsByAccount.get(key)!.push(cs)
  }

  const rapportCallNumbers: number[] = []
  for (const [, calls] of callsByAccount) {
    calls.sort((a: any, b: any) => (a.call_number ?? 0) - (b.call_number ?? 0))
    let rapport = 3 // starts at 3 in updateAccountState
    let reachedAt: number | null = null
    if (rapport >= 3) {
      // Already at 3 at start — check if it drops below then comes back
      // For simplicity, treat the initial state as rapport >= 3 at call 0
      reachedAt = 0
    }
    for (const call of calls) {
      const cqs = call.call_quality_signals
      if (!cqs || typeof cqs !== "object") continue
      if (cqs.rep_asked_good_questions && cqs.rep_listened_to_answers && cqs.buyer_engaged) {
        rapport += 1
      }
      if (cqs.rep_talked_too_much || !cqs.buyer_engaged) {
        rapport -= 1
      }
      rapport = Math.max(1, Math.min(5, rapport))
      if (rapport >= 3 && reachedAt === null) {
        reachedAt = call.call_number ?? 1
      }
    }
    if (reachedAt !== null && reachedAt > 0) {
      rapportCallNumbers.push(reachedAt)
    }
  }
  const rapportBuildingSpeed =
    rapportCallNumbers.length > 0
      ? Math.round(
          (rapportCallNumbers.reduce((s, n) => s + n, 0) / rapportCallNumbers.length) * 10,
        ) / 10
      : null

  // 6. simulated_conversion_rate
  const accountsWith3Calls = accountStates.filter((a) => (a.call_count ?? 0) >= 3)
  const closedWon = accountsWith3Calls.filter(
    (a) => a.current_stage === "closed_won",
  ).length
  const simulatedConversionRate =
    accountsWith3Calls.length > 0
      ? Math.round((closedWon / accountsWith3Calls.length) * 100) / 100
      : null

  // 7. avg_sentiment_trajectory
  let sentimentSum = 0
  let sentimentCount = 0
  for (const cs of callSummaries) {
    if (typeof cs.sentiment_delta === "number") {
      sentimentSum += cs.sentiment_delta
      sentimentCount++
    }
  }
  const avgSentimentTrajectory =
    sentimentCount > 0
      ? Math.round((sentimentSum / sentimentCount) * 10) / 10
      : null

  return {
    scores: {
      stage_progression_rate: stageProgressionRate,
      credibility_maintenance: credibilityMaintenance,
      commitment_follow_through: commitmentFollowThrough,
      objection_resolution_rate: objectionResolutionRate,
      rapport_building_speed: rapportBuildingSpeed,
      simulated_conversion_rate: simulatedConversionRate,
      avg_sentiment_trajectory: avgSentimentTrajectory,
    },
    accountCount,
    callCount,
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const authHeader = req.headers.get("Authorization")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    if (!authHeader || !authHeader.includes(serviceKey)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — service role only" }),
        { status: 401, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
    )

    const now = new Date()
    const periods = getCurrentPeriods(now)

    // Get all orgs with account_states
    const { data: orgRows, error: orgErr } = await supabase
      .from("account_states")
      .select("org_id")
    if (orgErr) throw orgErr

    const orgIds = [...new Set((orgRows || []).map((r: any) => r.org_id))]
    console.log(`${FN} processing ${orgIds.length} orgs`)

    let totalSnapshots = 0

    for (const orgId of orgIds) {
      // Get all account_states for this org
      const { data: allAccounts, error: accErr } = await supabase
        .from("account_states")
        .select("id, org_id, user_id, company_id, persona_id, current_stage, sentiment_score, relationship_notes, call_count, last_interaction_at, created_at")
        .eq("org_id", orgId)
      if (accErr) {
        console.error(`${FN} failed to fetch accounts for org=${orgId}:`, accErr)
        continue
      }
      if (!allAccounts || allAccounts.length === 0) continue

      // Get all call_summaries for this org
      const { data: allSummaries, error: csErr } = await supabase
        .from("call_summaries")
        .select("id, org_id, account_state_id, call_number, call_type, objections_raised, sentiment_delta, call_quality_signals, created_at")
        .eq("org_id", orgId)
      if (csErr) {
        console.error(`${FN} failed to fetch call_summaries for org=${orgId}:`, csErr)
        continue
      }

      const repIds = [...new Set(allAccounts.map((a: any) => a.user_id))]

      for (const period of periods) {
        const periodStart = new Date(period.start + "T00:00:00Z")
        const periodEnd = new Date(period.end + "T23:59:59Z")

        for (const repId of repIds) {
          // Filter accounts for this rep with activity in period
          const repAccounts = allAccounts.filter(
            (a: any) =>
              a.user_id === repId &&
              a.last_interaction_at &&
              new Date(a.last_interaction_at) >= periodStart,
          )
          if (repAccounts.length === 0) continue

          const accountIds = new Set(repAccounts.map((a: any) => a.id))

          // Filter call_summaries for this rep's accounts in period
          const repSummaries = (allSummaries || []).filter(
            (cs: any) =>
              accountIds.has(cs.account_state_id) &&
              new Date(cs.created_at) >= periodStart &&
              new Date(cs.created_at) <= periodEnd,
          )

          const { scores, accountCount, callCount } = computeScores(
            repAccounts,
            repSummaries,
          )

          if (accountCount === 0 && callCount === 0) continue

          const { error: upsertErr } = await supabase
            .from("rep_performance_snapshots")
            .upsert(
              {
                org_id: orgId,
                user_id: repId,
                period_type: period.type,
                period_start: period.start,
                period_end: period.end,
                scores,
                account_count: accountCount,
                call_count: callCount,
              },
              { onConflict: "org_id,user_id,period_type,period_start" },
            )

          if (upsertErr) {
            console.error(
              `${FN} upsert failed org=${orgId} rep=${repId} period=${period.type}:`,
              upsertErr,
            )
          } else {
            totalSnapshots++
          }
        }
      }
    }

    console.log(`${FN} completed: ${totalSnapshots} snapshots upserted`)
    return new Response(
      JSON.stringify({ success: true, snapshots: totalSnapshots }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error(`${FN} unhandled error:`, err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    })
  }
})
