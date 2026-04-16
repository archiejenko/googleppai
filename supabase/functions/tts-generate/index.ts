import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { MODELS } from "../_shared/models.ts"
import { getCorsHeaders } from "../_shared/cors.ts"
import { validateBody } from "../_shared/validateBody.ts"

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Keepwarm — return immediately without hitting ElevenLabs
  if (req.headers.get('x-keepwarm') === 'true') return new Response('ok', { headers: corsHeaders })

  try {
    // Auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limit: 20 TTS req/min burst, 200/hr sustained — per user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin
      .rpc('check_rate_limit_hardened', {
        dimension_keys:           [`user:${user.id}`],
        cost:                     1,
        burst_limit:              20,
        burst_window_seconds:     60,
        sustained_limit:          200,
        sustained_window_seconds: 3600,
      })
    if (rateLimitError) {
      console.error('[tts-generate] rate limit check failed:', rateLimitError)
    } else if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body
    const rawBody = await req.json().catch(() => null)
    const v = validateBody<{ text: string; voice_id?: string }>(rawBody, {
      text:     { type: 'string', required: true },
      voice_id: { type: 'string' },
    })
    if (!v.ok) return new Response(JSON.stringify({ error: v.error }), {
      status: v.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    const { text, voice_id } = v.body

    const voiceId = voice_id ?? MODELS.ELEVENLABS_DEFAULT_VOICE_ID

    // Guard: fail fast with a clear error rather than letting the request reach
    // ElevenLabs with no key and silently triggering the browser TTS fallback.
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsKey) {
      console.error('[tts-generate] ELEVENLABS_API_KEY is not set')
      return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call ElevenLabs
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        output_format: 'mp3_44100_128',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[tts-generate] ElevenLabs error:', res.status, errText)
      return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Stream binary response back to client.
    // Content-Type is set to application/octet-stream so the Supabase JS client
    // SDK auto-detects binary and returns a Blob rather than decoding as text.
    return new Response(res.body, {
      headers: { ...corsHeaders, 'Content-Type': 'application/octet-stream' },
    })
  } catch (err) {
    console.error('[tts-generate] unhandled error:', err)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
