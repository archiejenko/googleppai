import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { checkOrgAiLimit } from "../_shared/orgRateLimit.ts"
import { logTokenUsage } from "../_shared/tokenUsage.ts"
import { logAudit } from "../_shared/audit.ts"

const FN = "[call-summariser]"
const AI_ESTIMATED_TOKENS = 2500
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── Response validation ──────────────────────────────────────────────────────

interface CallSummary {
  commitments_made: { commitment: string; made_by: "rep" | "buyer"; fulfilled: null }[]
  objections_raised: { objection: string; handled_well: boolean; rep_response_summary: string }[]
  sentiment_delta: number
  stage_transition: string | null
  credibility_events: { event: string; impact: "positive" | "negative"; detail: string }[]
  key_takeaways: string[]
  call_quality_signals: {
    rep_talked_too_much: boolean
    rep_asked_good_questions: boolean
    rep_listened_to_answers: boolean
    rep_used_industry_language: boolean
    rep_referenced_prior_context: boolean
    buyer_engaged: boolean
    natural_next_step_agreed: boolean
  }
  commitments_resolved: { commitment: string; resolved: boolean; evidence: string }[]
}

function validateSummary(raw: unknown): CallSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  if (!Array.isArray(o.commitments_made)) return null
  for (const c of o.commitments_made) {
    if (!c || typeof c !== "object") return null
    if (typeof (c as any).commitment !== "string") return null
    if ((c as any).made_by !== "rep" && (c as any).made_by !== "buyer") return null
  }

  if (!Array.isArray(o.objections_raised)) return null
  for (const obj of o.objections_raised) {
    if (!obj || typeof obj !== "object") return null
    if (typeof (obj as any).objection !== "string") return null
    if (typeof (obj as any).handled_well !== "boolean") return null
    if (typeof (obj as any).rep_response_summary !== "string") return null
  }

  if (typeof o.sentiment_delta !== "number") return null
  if (o.sentiment_delta < -30 || o.sentiment_delta > 30) return null

  if (o.stage_transition !== null && typeof o.stage_transition !== "string") return null

  if (!Array.isArray(o.credibility_events)) return null
  for (const ce of o.credibility_events) {
    if (!ce || typeof ce !== "object") return null
    if (typeof (ce as any).event !== "string") return null
    if ((ce as any).impact !== "positive" && (ce as any).impact !== "negative") return null
    if (typeof (ce as any).detail !== "string") return null
  }

  if (!Array.isArray(o.key_takeaways)) return null
  for (const kt of o.key_takeaways) {
    if (typeof kt !== "string") return null
  }

  const cqs = o.call_quality_signals
  if (!cqs || typeof cqs !== "object" || Array.isArray(cqs)) return null
  const boolFields = [
    "rep_talked_too_much", "rep_asked_good_questions", "rep_listened_to_answers",
    "rep_used_industry_language", "rep_referenced_prior_context", "buyer_engaged",
    "natural_next_step_agreed",
  ]
  for (const f of boolFields) {
    if (typeof (cqs as any)[f] !== "boolean") return null
  }

  if (!Array.isArray(o.commitments_resolved)) return null
  for (const cr of o.commitments_resolved) {
    if (!cr || typeof cr !== "object") return null
    if (typeof (cr as any).commitment !== "string") return null
    if (typeof (cr as any).resolved !== "boolean") return null
    if (typeof (cr as any).evidence !== "string") return null
  }

  return {
    commitments_made: o.commitments_made as CallSummary["commitments_made"],
    objections_raised: o.objections_raised as CallSummary["objections_raised"],
    sentiment_delta: o.sentiment_delta as number,
    stage_transition: o.stage_transition as string | null,
    credibility_events: o.credibility_events as CallSummary["credibility_events"],
    key_takeaways: o.key_takeaways as string[],
    call_quality_signals: cqs as CallSummary["call_quality_signals"],
    commitments_resolved: o.commitments_resolved as CallSummary["commitments_resolved"],
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// ── Extraction prompt builder ────────────────────────────────────────────────

function buildExtractionPrompt(
  transcript: string,
  priorCommitments: { commitment: string; made_by: string }[],
): string {
  const commitmentsBlock = priorCommitments.length > 0
    ? `\n\nPrior commitments from earlier calls that you must check for resolution:\n${JSON.stringify(priorCommitments, null, 2)}`
    : "\n\nThere are no prior commitments to check. Return an empty commitments_resolved array."

  return `You are analysing a sales training call transcript. Extract the following structured data. Respond with JSON only, no preamble, no markdown.
${commitmentsBlock}

Transcript:
${transcript}

Return this exact JSON structure:
{
  "commitments_made": [
    { "commitment": "string describing what was promised", "made_by": "rep" | "buyer", "fulfilled": null }
  ],
  "objections_raised": [
    { "objection": "the specific objection", "handled_well": true | false, "rep_response_summary": "how the rep responded" }
  ],
  "sentiment_delta": number between -30 and +30 (positive = buyer warmed up, negative = buyer cooled down, 0 = no change),
  "stage_transition": "old_stage->new_stage" | null,
  "credibility_events": [
    { "event": "what happened", "impact": "positive" | "negative", "detail": "why it affected credibility" }
  ],
  "key_takeaways": ["string", "string"],
  "call_quality_signals": {
    "rep_talked_too_much": true | false,
    "rep_asked_good_questions": true | false,
    "rep_listened_to_answers": true | false,
    "rep_used_industry_language": true | false,
    "rep_referenced_prior_context": true | false,
    "buyer_engaged": true | false,
    "natural_next_step_agreed": true | false
  },
  "commitments_resolved": [
    { "commitment": "the original commitment text", "resolved": true | false, "evidence": "what in the transcript shows this was or was not addressed" }
  ]
}`
}

// ── Account state update ─────────────────────────────────────────────────────

async function updateAccountState(
  supabase: ReturnType<typeof createClient>,
  accountStateId: string,
  summary: CallSummary,
  callNumber: number,
  orgId: string,
): Promise<string | null> {
  const { data: state, error: fetchErr } = await supabase
    .from("account_states")
    .select("*")
    .eq("id", accountStateId)
    .single()

  if (fetchErr || !state) {
    console.error(`${FN} failed to fetch account_state id=${accountStateId}:`, fetchErr)
    return
  }

  const notes = (state.relationship_notes as Record<string, unknown>) || {}
  const unresolvedObjections = Array.isArray(notes.unresolved_objections)
    ? [...(notes.unresolved_objections as string[])]
    : []
  const commitmentsByRep = Array.isArray(notes.commitments_made_by_rep)
    ? [...(notes.commitments_made_by_rep as string[])]
    : []
  const commitmentsFulfilled = Array.isArray(notes.commitments_fulfilled)
    ? [...(notes.commitments_fulfilled as string[])]
    : []
  const keyMoments = Array.isArray(notes.key_moments)
    ? [...(notes.key_moments as string[])]
    : []
  let credibilityScore = typeof notes.credibility_score === "number" ? notes.credibility_score as number : 50
  let rapportLevel = typeof notes.rapport_level === "number" ? notes.rapport_level as number : 3

  // Append unresolved objections
  for (const obj of summary.objections_raised) {
    if (!obj.handled_well) {
      unresolvedObjections.push(obj.objection)
    }
  }

  // Append new commitments made by rep
  for (const c of summary.commitments_made) {
    if (c.made_by === "rep") {
      commitmentsByRep.push(c.commitment)
    }
  }

  // Process commitment resolutions from GPT
  for (const cr of summary.commitments_resolved) {
    if (cr.resolved && !commitmentsFulfilled.includes(cr.commitment)) {
      commitmentsFulfilled.push(cr.commitment)
    }
  }

  // Credibility: +5 positive, -10 negative, clamped 0-100
  for (const ce of summary.credibility_events) {
    credibilityScore += ce.impact === "positive" ? 5 : -10
    keyMoments.push(`${ce.event}: ${ce.detail}`)
  }
  credibilityScore = clamp(credibilityScore, 0, 100)

  // Rapport: based on call quality signals
  const cqs = summary.call_quality_signals
  if (cqs.rep_asked_good_questions && cqs.rep_listened_to_answers && cqs.buyer_engaged) {
    rapportLevel += 1
  }
  if (cqs.rep_talked_too_much || !cqs.buyer_engaged) {
    rapportLevel -= 1
  }
  rapportLevel = clamp(rapportLevel, 1, 5)

  // Sentiment
  const newSentiment = clamp(
    (Number(state.sentiment_score) || 50) + summary.sentiment_delta,
    0,
    100,
  )

  // Stage transition
  let newStage = state.current_stage
  if (summary.stage_transition) {
    const parts = summary.stage_transition.split("->")
    if (parts.length === 2) {
      newStage = parts[1].trim()
    }
  }

  const updatedNotes = {
    unresolved_objections: unresolvedObjections,
    commitments_made_by_rep: commitmentsByRep,
    commitments_fulfilled: commitmentsFulfilled,
    key_moments: keyMoments,
    credibility_score: credibilityScore,
    rapport_level: rapportLevel,
  }

  const { error: updateErr } = await supabase
    .from("account_states")
    .update({
      call_count: (state.call_count || 0) + 1,
      sentiment_score: newSentiment,
      current_stage: newStage,
      relationship_notes: updatedNotes,
      last_interaction_at: new Date().toISOString(),
    })
    .eq("id", accountStateId)

  if (updateErr) {
    console.error(`${FN} failed to update account_state id=${accountStateId}:`, updateErr)
    return
  }

  // Write call_summaries row — return id for downstream embedding
  const { data: insertedSummary, error: insertErr } = await supabase
    .from("call_summaries")
    .insert({
      org_id: orgId,
      account_state_id: accountStateId,
      call_number: callNumber,
      call_type: "simulated",
      commitments_made: summary.commitments_made,
      objections_raised: summary.objections_raised,
      sentiment_delta: summary.sentiment_delta,
      stage_transition: summary.stage_transition,
      credibility_events: summary.credibility_events,
      key_takeaways: summary.key_takeaways,
      call_quality_signals: summary.call_quality_signals,
    })
    .select("id")
    .single()

  if (insertErr) {
    console.error(`${FN} failed to insert call_summary for account_state_id=${accountStateId}:`, insertErr)
    return null
  }

  // Win/Loss event emission on terminal stage transitions
  const TERMINAL_STAGES = new Set(["closed_won", "closed_lost", "ghosted"])
  if (TERMINAL_STAGES.has(newStage)) {
    try {
      const { count: existingCount } = await supabase
        .from("win_loss_events")
        .select("id", { count: "exact", head: true })
        .eq("account_state_id", accountStateId)

      if ((existingCount ?? 0) === 0) {
        const { data: allSummaries } = await supabase
          .from("call_summaries")
          .select("call_number, sentiment_delta, stage_transition, key_takeaways, call_type, created_at")
          .eq("account_state_id", accountStateId)
          .order("call_number", { ascending: true })

        const trajectory = (allSummaries || []).map((cs: any) => ({
          call_number: cs.call_number,
          sentiment_delta: cs.sentiment_delta,
          stage_transition: cs.stage_transition,
          key_takeaways: cs.key_takeaways,
          call_type: cs.call_type,
        }))

        const firstCall = allSummaries?.[0]?.created_at
        const lastCall = allSummaries?.[allSummaries.length - 1]?.created_at
        const totalDurationDays = firstCall && lastCall
          ? Math.max(1, Math.round((new Date(lastCall).getTime() - new Date(firstCall).getTime()) / 86400000))
          : 1

        const outcomeMap: Record<string, string> = {
          closed_won: "won",
          closed_lost: "lost",
          ghosted: "ghosted",
        }

        const { error: wlErr } = await supabase
          .from("win_loss_events")
          .insert({
            org_id: orgId,
            user_id: state.user_id,
            account_state_id: accountStateId,
            outcome: outcomeMap[newStage],
            trajectory,
            total_calls: (state.call_count || 0) + 1,
            total_duration_days: totalDurationDays,
            final_sentiment: newSentiment,
            final_credibility: credibilityScore,
          })

        if (wlErr) {
          console.error(`${FN} failed to insert win_loss_event for account_state_id=${accountStateId}:`, wlErr)
        } else {
          console.log(`${FN} win_loss_event emitted: ${outcomeMap[newStage]} for account_state_id=${accountStateId}`)
        }
      }
    } catch (e) {
      console.error(`${FN} win_loss_event emission failed for account_state_id=${accountStateId}:`, e)
    }
  }

  return insertedSummary?.id ?? null
}

// ── Main handler ─────────────────────────────────────────────────────────────

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

    const body = await req.json()
    const { transcript, accountStateId, orgId, callNumber, priorCommitments } = body

    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "transcript required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }
    if (!accountStateId || typeof accountStateId !== "string") {
      return new Response(JSON.stringify({ error: "accountStateId required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }
    if (!orgId || typeof orgId !== "string") {
      return new Response(JSON.stringify({ error: "orgId required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }
    if (typeof callNumber !== "number") {
      return new Response(JSON.stringify({ error: "callNumber required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const openaiKey = Deno.env.get("OPENAI_API_KEY")!

    // Org AI budget check
    const orgLimit = await checkOrgAiLimit(supabase, orgId, "call-summariser", AI_ESTIMATED_TOKENS)
    if (!orgLimit.allowed) {
      return new Response(JSON.stringify({ error: orgLimit.message }), {
        status: orgLimit.httpStatus ?? 429,
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const prior = Array.isArray(priorCommitments) ? priorCommitments : []
    const prompt = buildExtractionPrompt(transcript, prior)

    // Attempt extraction, retry once on validation failure
    let summary: CallSummary | null = null
    let lastRawContent = ""

    for (let attempt = 0; attempt < 2; attempt++) {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 1500,
        }),
      })

      if (!resp.ok) {
        console.error(`${FN} OpenAI API error (attempt ${attempt + 1}):`, resp.status, await resp.text())
        continue
      }

      const json = await resp.json()
      lastRawContent = json.choices?.[0]?.message?.content ?? ""

      if (json.usage) {
        // Log token usage — use a synthetic user_id since this is service-to-service
        await logTokenUsage(supabase, {
          org_id: orgId,
          user_id: "system",
          function_name: "call-summariser",
          model: "gpt-4o-mini",
          input_tokens: json.usage.prompt_tokens ?? 0,
          output_tokens: json.usage.completion_tokens ?? 0,
        })
      }

      try {
        const parsed = JSON.parse(lastRawContent)
        summary = validateSummary(parsed)
        if (summary) break
        console.error(`${FN} validation failed (attempt ${attempt + 1}) for account_state_id=${accountStateId}`)
      } catch {
        console.error(`${FN} JSON parse failed (attempt ${attempt + 1}) for account_state_id=${accountStateId}`)
      }
    }

    // Fallback: minimal summary with just key_takeaways
    if (!summary) {
      console.error(`${FN} using fallback minimal summary for account_state_id=${accountStateId}`)
      let fallbackTakeaways: string[] = []
      try {
        const parsed = JSON.parse(lastRawContent)
        if (Array.isArray(parsed.key_takeaways)) {
          fallbackTakeaways = parsed.key_takeaways.filter((t: unknown) => typeof t === "string")
        }
      } catch { /* ignore */ }

      summary = {
        commitments_made: [],
        objections_raised: [],
        sentiment_delta: 0,
        stage_transition: null,
        credibility_events: [],
        key_takeaways: fallbackTakeaways.length > 0 ? fallbackTakeaways : ["Call completed — automated summary unavailable"],
        call_quality_signals: {
          rep_talked_too_much: false,
          rep_asked_good_questions: false,
          rep_listened_to_answers: false,
          rep_used_industry_language: false,
          rep_referenced_prior_context: false,
          buyer_engaged: false,
          natural_next_step_agreed: false,
        },
        commitments_resolved: [],
      }
    }

    const callSummaryId = await updateAccountState(supabase, accountStateId, summary, callNumber, orgId)

    if (callSummaryId) {
      await logAudit(supabase, {
        orgId, userId: null, action: 'call.summarised',
        resourceType: 'call_summary', resourceId: callSummaryId,
        metadata: {
          account_state_id: accountStateId,
          stage_transition: summary.stage_transition,
          sentiment_delta: summary.sentiment_delta,
        },
      })
    }

    return new Response(JSON.stringify({ success: true, summary, callSummaryId }), {
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
