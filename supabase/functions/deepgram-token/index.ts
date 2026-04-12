/**
 * deepgram-token — issues short-lived Deepgram API keys for authenticated users.
 *
 * Security properties:
 *   - Requires a valid Supabase JWT (verify_jwt = true in config.toml)
 *   - Rate-limited: 20 tokens per user per hour via check_rate_limit_hardened RPC
 *   - TTL: 10 seconds — the client opens its WebSocket immediately; the master key
 *     is never sent to the browser
 *   - Errors returned to callers are generic; full details are logged server-side only
 *
 * Client contract (useDeepgramSTT.ts):
 *   POST /deepgram-token   Authorization: Bearer <supabase_jwt>
 *   → { key: string }      short-lived Deepgram key for WebSocket auth
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Verify identity ────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await anonClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Rate limit: 20 tokens per user per hour ────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin
      .rpc('check_rate_limit_hardened', {
        dimension_keys: [`user:${user.id}`],
        cost: 1,
        burst_limit: 5,
        burst_window_seconds: 60,
        sustained_limit: 20,
        sustained_window_seconds: 3600,
      })

    if (rateLimitError) {
      console.error('[deepgram-token] rate limit check failed:', rateLimitError)
      throw new Error('Security check failed')
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait before requesting another token.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Generate short-lived Deepgram token (TTL 10 seconds) ──────────────
    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
    const deepgramProjectId = Deno.env.get('DEEPGRAM_PROJECT_ID')

    if (!deepgramApiKey || !deepgramProjectId) {
      console.error('[deepgram-token] DEEPGRAM_API_KEY or DEEPGRAM_PROJECT_ID not set')
      throw new Error('Deepgram credentials not configured')
    }

    const dgRes = await fetch(
      `https://api.deepgram.com/v1/projects/${deepgramProjectId}/keys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: `session-${user.id}-${Date.now()}`,
          scopes: ['usage:write'],
          ttl_seconds: 10,
        }),
      },
    )

    if (!dgRes.ok) {
      const dgErr = await dgRes.text()
      console.error('[deepgram-token] Deepgram key creation failed:', dgErr)
      throw new Error('Failed to create Deepgram session token')
    }

    const { key } = await dgRes.json()

    // Return only the short-lived token — never expose the master key
    return new Response(JSON.stringify({ key }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('[deepgram-token] unhandled error:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
