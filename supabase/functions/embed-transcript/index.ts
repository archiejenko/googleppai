import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { checkOrgAiLimit } from "../_shared/orgRateLimit.ts"
import { logTokenUsage } from "../_shared/tokenUsage.ts"

const FN = "[embed-transcript]"
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const CHUNK_TARGET_CHARS = 2000 // ~500 tokens
const CHUNK_OVERLAP_CHARS = 200 // ~50 tokens
const EMBEDDING_MODEL = "text-embedding-3-small"
const TOKENS_PER_CHUNK_ESTIMATE = 600

// ── Chunking ─────────────────────────────────────────────────────────────────

interface SpeakerTurn {
  speaker: string
  text: string
}

function parseSpeakerTurns(transcript: string): SpeakerTurn[] {
  const lines = transcript.split("\n")
  const turns: SpeakerTurn[] = []

  for (const line of lines) {
    const match = line.match(/^([A-Z_]+):\s*(.+)$/s)
    if (match) {
      turns.push({ speaker: match[1], text: match[2].trim() })
    } else if (line.trim() && turns.length > 0) {
      turns[turns.length - 1].text += " " + line.trim()
    }
  }

  return turns
}

function splitAtSentenceBoundaries(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]

  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text]
  const segments: string[] = []
  let current = ""

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChars && current.length > 0) {
      segments.push(current.trim())
      current = ""
    }
    current += sentence
  }
  if (current.trim()) segments.push(current.trim())

  return segments
}

function chunkTranscript(transcript: string): string[] {
  const turns = parseSpeakerTurns(transcript)
  if (turns.length === 0) {
    if (transcript.length <= CHUNK_TARGET_CHARS) return [transcript]
    return splitAtSentenceBoundaries(transcript, CHUNK_TARGET_CHARS)
  }

  const chunks: string[] = []
  let currentChunk = ""

  for (const turn of turns) {
    const labelledText = `${turn.speaker}: ${turn.text}`

    if (labelledText.length > CHUNK_TARGET_CHARS) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ""
      }
      const subSegments = splitAtSentenceBoundaries(turn.text, CHUNK_TARGET_CHARS - turn.speaker.length - 2)
      for (const seg of subSegments) {
        chunks.push(`${turn.speaker}: ${seg}`)
      }
      continue
    }

    if (currentChunk.length + labelledText.length + 1 > CHUNK_TARGET_CHARS) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      // Overlap: carry the tail of the previous chunk
      if (currentChunk.length > CHUNK_OVERLAP_CHARS) {
        const overlapText = currentChunk.slice(-CHUNK_OVERLAP_CHARS)
        currentChunk = overlapText + "\n" + labelledText
      } else {
        currentChunk = labelledText
      }
    } else {
      currentChunk += (currentChunk ? "\n" : "") + labelledText
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
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
    const { transcript, callSummaryId, orgId } = body

    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "transcript required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }
    if (!callSummaryId || typeof callSummaryId !== "string") {
      return new Response(JSON.stringify({ error: "callSummaryId required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }
    if (!orgId || typeof orgId !== "string") {
      return new Response(JSON.stringify({ error: "orgId required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!

    // Idempotency: skip if chunks already exist for this call_summary_id
    const { count } = await supabase
      .from("call_transcript_chunks")
      .select("id", { count: "exact", head: true })
      .eq("call_summary_id", callSummaryId)

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "chunks already exist" }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const chunks = chunkTranscript(transcript)
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no chunks produced" }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    // Org AI budget check
    const estimatedTokens = chunks.length * TOKENS_PER_CHUNK_ESTIMATE
    const orgLimit = await checkOrgAiLimit(supabase, orgId, "embed-transcript", estimatedTokens)
    if (!orgLimit.allowed) {
      return new Response(JSON.stringify({ error: orgLimit.message }), {
        status: orgLimit.httpStatus ?? 429,
        headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    // Embed all chunks in a single batch request
    const embedResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: chunks,
      }),
    })

    if (!embedResp.ok) {
      const errText = await embedResp.text()
      console.error(`${FN} OpenAI embedding error for call_summary_id=${callSummaryId}:`, embedResp.status, errText)
      return new Response(JSON.stringify({ error: "Embedding API failed" }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    const embedJson = await embedResp.json()

    if (embedJson.usage) {
      await logTokenUsage(supabase, {
        org_id: orgId,
        user_id: "system",
        function_name: "embed-transcript",
        model: EMBEDDING_MODEL,
        input_tokens: embedJson.usage.prompt_tokens ?? embedJson.usage.total_tokens ?? 0,
        output_tokens: 0,
      })
    }

    const embeddings: number[][] = (embedJson.data || [])
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((d: { embedding: number[] }) => d.embedding)

    if (embeddings.length !== chunks.length) {
      console.error(`${FN} embedding count mismatch: ${embeddings.length} embeddings for ${chunks.length} chunks, call_summary_id=${callSummaryId}`)
      return new Response(JSON.stringify({ error: "Embedding count mismatch" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    // Write chunks to DB
    const rows = chunks.map((text, i) => ({
      org_id: orgId,
      call_summary_id: callSummaryId,
      chunk_index: i,
      chunk_text: text,
      embedding: JSON.stringify(embeddings[i]),
    }))

    const { error: insertErr } = await supabase
      .from("call_transcript_chunks")
      .insert(rows)

    if (insertErr) {
      console.error(`${FN} insert error for call_summary_id=${callSummaryId}:`, insertErr)
      return new Response(JSON.stringify({ error: "Failed to store chunks" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, chunks_stored: chunks.length }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`${FN} unhandled error:`, err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    })
  }
})
