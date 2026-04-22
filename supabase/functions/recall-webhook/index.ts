import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { validateBody } from "../_shared/validateBody.ts"
import { sanitizeTextField } from "../_shared/sanitizePromptField.ts"
import { checkOrgAiLimit } from "../_shared/orgRateLimit.ts"
import { logTokenUsage } from "../_shared/tokenUsage.ts"

const FN = "[recall-webhook]"
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function jsonResp(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

async function verifyRecallSignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get("RECALL_WEBHOOK_SECRET")
  if (!secret) return false

  const signature = req.headers.get("x-recall-signature") ?? ""
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return signature === expected
}

// ── bot-join: admin sends a bot to a meeting ────────────────────────────────

async function handleBotJoin(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<Response> {
  const v = validateBody<{ meetingUrl: string; orgId: string }>(body, {
    meetingUrl: { type: "string", required: true },
    orgId: { type: "string", required: true },
  })
  if (!v.ok) return jsonResp({ error: v.error }, v.status)

  const { meetingUrl, orgId } = v.body
  const recallApiKey = Deno.env.get("RECALL_API_KEY")
  if (!recallApiKey) {
    console.error(`${FN} RECALL_API_KEY not configured`)
    return jsonResp({ error: "Recall.ai integration not configured" }, 500)
  }

  const recallResp = await fetch("https://api.recall.ai/api/v1/bot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${recallApiKey}`,
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: "OAST Recording Bot",
      transcription_options: { provider: "default" },
    }),
  })

  if (!recallResp.ok) {
    const errText = await recallResp.text()
    console.error(`${FN} Recall.ai bot create failed: ${recallResp.status} ${errText}`)
    return jsonResp({ error: "Failed to create recording bot" }, 502)
  }

  const recallData = await recallResp.json()
  const recallBotId = recallData.id

  const { data: recording, error: insertErr } = await supabase
    .from("real_call_recordings")
    .insert({
      org_id: orgId,
      recall_bot_id: recallBotId,
      meeting_url: meetingUrl,
      recorded_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (insertErr) {
    console.error(`${FN} failed to insert recording: ${insertErr.message}`)
    return jsonResp({ error: "Failed to store recording" }, 500)
  }

  return jsonResp({ success: true, recordingId: recording.id, recallBotId })
}

// ── transcript-ready: Recall.ai webhook on transcript completion ────────────

async function handleTranscriptReady(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<Response> {
  const recallBotId = typeof body.bot_id === "string"
    ? body.bot_id
    : typeof body.recall_bot_id === "string"
      ? body.recall_bot_id
      : null

  if (!recallBotId) return jsonResp({ error: "bot_id required" }, 400)

  const transcript = typeof body.transcript === "string" ? body.transcript : null
  const durationSeconds = typeof body.duration_seconds === "number" ? body.duration_seconds : null

  if (!transcript) return jsonResp({ error: "transcript required" }, 400)

  const { data: recording, error: fetchErr } = await supabase
    .from("real_call_recordings")
    .select("*")
    .eq("recall_bot_id", recallBotId)
    .single()

  if (fetchErr || !recording) {
    console.error(`${FN} no recording found for recall_bot_id=${recallBotId}`)
    return jsonResp({ error: "Recording not found" }, 404)
  }

  const sanitizedTranscript = sanitizeTextField(transcript, 500000)

  const { error: updateErr } = await supabase
    .from("real_call_recordings")
    .update({
      transcript: sanitizedTranscript,
      duration_seconds: durationSeconds,
    })
    .eq("id", recording.id)

  if (updateErr) {
    console.error(`${FN} failed to update recording ${recording.id}: ${updateErr.message}`)
    return jsonResp({ error: "Failed to store transcript" }, 500)
  }

  if (recording.account_id && recording.persona_id) {
    await runSummariserPipeline(supabase, {
      recordingId: recording.id,
      orgId: recording.org_id,
      accountId: recording.account_id,
      personaId: recording.persona_id,
      transcript: sanitizedTranscript,
    })
  }

  return jsonResp({ success: true })
}

// ── link-recording: admin links a call to an account/persona ────────────────

async function handleLinkRecording(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<Response> {
  const v = validateBody<{
    recordingId: string
    accountId: string
    personaId: string
    orgId: string
    userId: string
  }>(body, {
    recordingId: { type: "string", required: true },
    accountId: { type: "string", required: true },
    personaId: { type: "string", required: true },
    orgId: { type: "string", required: true },
    userId: { type: "string", required: true },
  })
  if (!v.ok) return jsonResp({ error: v.error }, v.status)

  const { recordingId, accountId, personaId, orgId, userId } = v.body

  const { data: recording, error: fetchErr } = await supabase
    .from("real_call_recordings")
    .select("*")
    .eq("id", recordingId)
    .eq("org_id", orgId)
    .single()

  if (fetchErr || !recording) {
    console.error(`${FN} recording not found: ${recordingId}`)
    return jsonResp({ error: "Recording not found" }, 404)
  }

  const { error: updateErr } = await supabase
    .from("real_call_recordings")
    .update({ account_id: accountId, persona_id: personaId })
    .eq("id", recordingId)

  if (updateErr) {
    console.error(`${FN} failed to link recording ${recordingId}: ${updateErr.message}`)
    return jsonResp({ error: "Failed to link recording" }, 500)
  }

  if (recording.transcript) {
    // Find or create account_state for this org/user/company/persona
    let accountStateId: string | null = null

    const { data: existing } = await supabase
      .from("account_states")
      .select("id, call_count, relationship_notes")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("company_id", accountId)
      .eq("persona_id", personaId)
      .single()

    if (existing) {
      accountStateId = existing.id
    } else {
      const { data: created, error: createErr } = await supabase
        .from("account_states")
        .insert({
          org_id: orgId,
          user_id: userId,
          company_id: accountId,
          persona_id: personaId,
        })
        .select("id")
        .single()

      if (createErr) {
        console.error(`${FN} failed to create account_state: ${createErr.message}`)
        return jsonResp({ error: "Failed to create account state" }, 500)
      }
      accountStateId = created.id
    }

    await runSummariserPipeline(supabase, {
      recordingId,
      orgId,
      accountId,
      personaId,
      transcript: recording.transcript,
      accountStateId,
      callCount: existing?.call_count ?? 0,
      priorCommitments: existing?.relationship_notes,
    })
  }

  return jsonResp({ success: true })
}

// ── Shared: run call-summariser → embed-transcript pipeline ─────────────────

async function runSummariserPipeline(
  supabase: ReturnType<typeof createClient>,
  params: {
    recordingId: string
    orgId: string
    accountId: string
    personaId: string
    transcript: string
    accountStateId?: string
    callCount?: number
    priorCommitments?: unknown
  },
): Promise<void> {
  const {
    recordingId,
    orgId,
    accountId,
    personaId,
    transcript,
  } = params

  let accountStateId = params.accountStateId
  let callCount = params.callCount ?? 0
  let priorCommitments = params.priorCommitments

  if (!accountStateId) {
    const { data: states } = await supabase
      .from("account_states")
      .select("id, call_count, relationship_notes")
      .eq("org_id", orgId)
      .eq("company_id", accountId)
      .eq("persona_id", personaId)
      .limit(1)
      .single()

    if (!states) {
      console.error(`${FN} no account_state found for pipeline, recording=${recordingId}`)
      return
    }
    accountStateId = states.id
    callCount = states.call_count ?? 0
    priorCommitments = states.relationship_notes
  }

  const notes = (priorCommitments as Record<string, unknown>) || {}
  const existingCommitments = Array.isArray(notes.commitments_made_by_rep)
    ? (notes.commitments_made_by_rep as string[])
        .filter((c: string) => {
          const fulfilled = Array.isArray(notes.commitments_fulfilled)
            ? (notes.commitments_fulfilled as string[])
            : []
          return !fulfilled.includes(c)
        })
        .map((c: string) => ({ commitment: c, made_by: "rep" }))
    : []

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  try {
    const sumResp = await fetch(`${supabaseUrl}/functions/v1/call-summariser`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript,
        accountStateId,
        orgId,
        callNumber: callCount + 1,
        priorCommitments: existingCommitments,
      }),
    })

    if (sumResp.ok) {
      const sumBody = await sumResp.json()
      if (sumBody.callSummaryId) {
        // Update the call_summary row to mark call_type as 'real'
        await supabase
          .from("call_summaries")
          .update({ call_type: "real" })
          .eq("id", sumBody.callSummaryId)

        // Fire-and-forget embed-transcript
        fetch(`${supabaseUrl}/functions/v1/embed-transcript`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcript,
            callSummaryId: sumBody.callSummaryId,
            orgId,
          }),
        }).catch((e) =>
          console.error(`${FN} embed-transcript failed for call_summary_id=${sumBody.callSummaryId}:`, e),
        )
      }

      // Mark recording as processed
      await supabase
        .from("real_call_recordings")
        .update({ processed: true })
        .eq("id", recordingId)
    } else {
      console.error(`${FN} call-summariser returned ${sumResp.status} for recording=${recordingId}`)
    }
  } catch (e) {
    console.error(`${FN} pipeline failed for recording=${recordingId}:`, e)
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    const action = typeof body.action === "string" ? body.action : null

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    if (action === "bot-join") {
      const authHeader = req.headers.get("Authorization")
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      if (!authHeader || !authHeader.includes(serviceKey)) {
        return jsonResp({ error: "Unauthorized — service role only" }, 401)
      }
      return await handleBotJoin(supabase, body)
    }

    if (action === "transcript-ready") {
      const validSig = await verifyRecallSignature(req, rawBody)
      if (!validSig) {
        // Fall back to service-key auth for manual testing
        const authHeader = req.headers.get("Authorization")
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        if (!authHeader || !authHeader.includes(serviceKey)) {
          return jsonResp({ error: "Unauthorized — invalid webhook signature" }, 401)
        }
      }
      return await handleTranscriptReady(supabase, body)
    }

    if (action === "link-recording") {
      const authHeader = req.headers.get("Authorization")
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      if (!authHeader || !authHeader.includes(serviceKey)) {
        return jsonResp({ error: "Unauthorized — service role only" }, 401)
      }
      return await handleLinkRecording(supabase, body)
    }

    return jsonResp({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    console.error(`${FN} unhandled error:`, err)
    return jsonResp({ error: String(err) }, 500)
  }
})
