/**
 * drill-generation
 *
 * Translates a coaching trigger (or identified rep weakness) into a
 * targeted, pre-configured training_sessions row the client can launch
 * directly into chat-ai as a one-tap "practice this now" drill.
 *
 * POST body:
 *   rep_id            uuid    — required
 *   trigger_id        uuid    — optional; pulls skill context from coaching_triggers
 *   skill_key         string  — optional; overrides skill derived from trigger/snapshot
 *   difficulty_override string — optional: 'easy' | 'medium' | 'hard'
 *
 * org_id is extracted from the authenticated user's JWT — never accepted from the request body.
 *
 * Returns:
 *   { session: training_sessions row, coaching_focus: string, drill_label: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from '../_shared/cors.ts'

// Human-readable labels for each skill key
const SKILL_LABELS: Record<string, string> = {
  meddic_qualification: 'MEDDIC Qualification',
  champion_building:    'Champion Building',
  discovery_questioning: 'Discovery Questioning',
  value_articulation:  'Value Articulation',
  active_listening:    'Active Listening',
  closing_commitment:  'Closing Commitment',
}

// Difficulty thresholds derived from rep's current skill score
function deriveDifficulty(score: number | null): 'easy' | 'medium' | 'hard' {
  if (score == null || score < 40) return 'easy'
  if (score < 65) return 'medium'
  return 'hard'
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
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

    // ── Extract org_id from JWT — never trust request body ──────────────────
    const org_id: string | undefined =
      user.user_metadata?.org_id ?? user.app_metadata?.org_id

    if (!org_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: no org_id in token' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Rate limit ──────────────────────────────────────────────────────────
    // Cost: 5 tokens (moderate — one AI call per drill generation)
    // Burst: 10 tokens / 1 min | Sustained: 50 tokens / 1 hour
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
    const ipData = new TextEncoder().encode(clientIp + (Deno.env.get('SUPABASE_ANON_KEY') || 'salt'))
    const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', ipData)))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin
      .rpc('check_rate_limit_hardened', {
        dimension_keys: [`ip:${ipHash}`, `user:${user.id}`],
        cost: 5,
        burst_limit: 10,
        burst_window_seconds: 60,
        sustained_limit: 50,
        sustained_window_seconds: 3600,
      })

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError)
      throw new Error('Security check failed')
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait before generating more drills.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse input ─────────────────────────────────────────────────────────
    const { rep_id, trigger_id, skill_key: bodySkillKey, difficulty_override } = await req.json()

    if (!rep_id) {
      return new Response(JSON.stringify({ error: 'rep_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Resolve skill key + score ────────────────────────────────────────────
    let skillKey: string | null = bodySkillKey ?? null
    let skillScore: number | null = null
    let triggerSeverity: string | null = null
    let triggerType: string | null = null

    if (trigger_id) {
      const { data: trigger } = await supabaseAdmin
        .from('coaching_triggers')
        .select('trigger_type, severity, trigger_data')
        .eq('id', trigger_id)
        .eq('org_id', org_id)
        .single()

      if (trigger) {
        triggerType = trigger.trigger_type
        triggerSeverity = trigger.severity

        // skill_decay carries a skill_key; other types do not
        if (trigger.trigger_type === 'skill_decay' && trigger.trigger_data?.skill_key) {
          skillKey = skillKey ?? trigger.trigger_data.skill_key
          skillScore = trigger.trigger_data.day0_score ?? null
        }
      }
    }

    // If still no skill key, find the rep's weakest skill from their latest snapshot
    if (!skillKey) {
      const { data: snapshot } = await supabaseAdmin
        .from('rep_correlation_snapshots')
        .select('meddic_qualification_score, champion_building_score, discovery_questioning_score, value_articulation_score, active_listening_score, closing_commitment_score')
        .eq('rep_id', rep_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (snapshot) {
        const candidates: [string, number | null][] = [
          ['meddic_qualification',  snapshot.meddic_qualification_score],
          ['champion_building',     snapshot.champion_building_score],
          ['discovery_questioning', snapshot.discovery_questioning_score],
          ['value_articulation',    snapshot.value_articulation_score],
          ['active_listening',      snapshot.active_listening_score],
          ['closing_commitment',    snapshot.closing_commitment_score],
        ]

        // Pick the lowest non-null score
        const sorted = candidates
          .filter(([, v]) => v != null)
          .sort((a, b) => (a[1] as number) - (b[1] as number))

        if (sorted.length) {
          skillKey = sorted[0][0]
          skillScore = sorted[0][1]
        }
      }
    }

    // Final fallback
    if (!skillKey) skillKey = 'discovery_questioning'

    // ── Fetch rep profile — verify rep belongs to caller's org ──────────────
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, sales_role, org_id')
      .eq('id', rep_id)
      .single()

    if (!profile || profile.org_id !== org_id) {
      return new Response(JSON.stringify({ error: 'Forbidden: rep does not belong to your organisation' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const salesRole = profile?.sales_role ?? 'Sales Representative'
    const skillLabel = SKILL_LABELS[skillKey] ?? skillKey.replace(/_/g, ' ')
    const difficulty = difficulty_override ?? deriveDifficulty(skillScore)

    // ── Build GPT-4o-mini prompt ─────────────────────────────────────────────
    const triggerContext = triggerType
      ? `This drill was triggered by a ${triggerType.replace(/_/g, ' ')} alert (severity: ${triggerSeverity ?? 'unknown'}).`
      : 'This drill targets the rep\'s weakest identified skill.'

    const scoreContext = skillScore != null
      ? `The rep's current score on this skill is ${Math.round(skillScore)}/100.`
      : 'No current score available for this skill.'

    const prompt = `You are an expert B2B sales training designer. Create a focused 5-minute roleplay drill for a ${salesRole} who needs to improve their "${skillLabel}" skill.

Context:
- Skill to drill: ${skillLabel}
- ${scoreContext}
- ${triggerContext}
- Difficulty level: ${difficulty}

Design a realistic, specific drill scenario. The prospect persona should create natural pressure around the target skill — e.g. for Discovery Questioning, the prospect should be guarded and require probing; for Closing Commitment, they should hedge and need a clear commitment question.

Return ONLY valid JSON matching this schema exactly:
{
  "scenario": "2-sentence situation briefing the rep reads before starting",
  "target_persona": "Job title and company type, e.g. 'VP of Operations at a 200-person logistics company'",
  "pitch_goal": "Specific, measurable objective for this drill, e.g. 'Uncover 3 business pains and get verbal commitment to a next call'",
  "opening_gambit": "The prospect's exact opening line to kick off the roleplay",
  "drill_label": "Short label, e.g. 'Discovery Depth Drill'",
  "coaching_focus": "One sentence on what the rep should consciously practise — specific behaviour, not generic advice"
}`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 400,
      }),
    })

    if (!openaiRes.ok) {
      throw new Error(`OpenAI error: ${await openaiRes.text()}`)
    }

    const openaiJson = await openaiRes.json()
    const generated = JSON.parse(openaiJson.choices?.[0]?.message?.content ?? '{}')

    // ── Insert training_sessions row ─────────────────────────────────────────
    const { data: session, error: insertError } = await supabaseAdmin
      .from('training_sessions')
      .insert({
        user_id:        rep_id,
        scenario:       generated.scenario,
        difficulty:     difficulty,
        target_persona: generated.target_persona,
        pitch_goal:     generated.pitch_goal,
        language:       'en',
        source:         'drill',
        drill_trigger_id: trigger_id ?? null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify({
      session,
      coaching_focus: generated.coaching_focus,
      drill_label:    generated.drill_label,
      opening_gambit: generated.opening_gambit,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('[drill-generation] unhandled error:', error);
    const status = (error instanceof Error && error.message === 'Unauthorised') ? 401
                 : (error instanceof Error && error.message === 'Too many requests') ? 429
                 : 500;
    const message = status === 401 ? 'Unauthorised'
                  : status === 429 ? 'Too many requests'
                  : 'An unexpected error occurred.';
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
