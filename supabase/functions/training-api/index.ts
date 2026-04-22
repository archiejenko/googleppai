import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkOrgAiLimit } from '../_shared/orgRateLimit.ts'
import { validateBody } from '../_shared/validateBody.ts'
import { logAudit, extractRequestContext } from '../_shared/audit.ts'

const AI_ESTIMATED_TOKENS = 1500; // ~800 prompt (transcript) + 700 max output (gpt-4o-mini)

// Startup diagnostics — log env var presence (never values)
console.log('[training-api] env check — SUPABASE_URL length:', (Deno.env.get('SUPABASE_URL') ?? '').length,
    'SUPABASE_ANON_KEY length:', (Deno.env.get('SUPABASE_ANON_KEY') ?? '').length)

serve(async (req: Request) => {
    let corsHeaders: Record<string, string>
    try {
        corsHeaders = getCorsHeaders(req)
    } catch (e) {
        console.error('[training-api] CORS config error — ALLOWED_ORIGIN may not be set:', e)
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const reqCtx = extractRequestContext(req)

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error('[training-api] Missing Authorization header')
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser()

        if (authError) {
            console.error('[training-api] getUser error:', authError)
        }

        if (!user) {
            console.error('[training-api] getUser returned no user — authError:', JSON.stringify(authError),
                '| Authorization header prefix:', authHeader?.slice(0, 27) ?? 'missing')
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // Rate limit: 20 req/min burst, 100/hr sustained — per user
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
                sustained_limit:          100,
                sustained_window_seconds: 3600,
            })
        if (rateLimitError) {
            console.error('[training-api] rate limit check failed:', rateLimitError)
        } else if (!isAllowed) {
            return new Response(JSON.stringify({ error: 'Too many requests' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 429,
            })
        }

        // Extract org_id — prefer JWT app_metadata (fast), fall back to DB lookup
        // to handle JWT propagation delays after create-organisation.
        let orgId: string | undefined =
            user.app_metadata?.org_id ?? user.user_metadata?.org_id;
        if (!orgId) {
            const { data: profileRow } = await supabaseAdmin
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single();
            orgId = profileRow?.org_id ?? undefined;
        }

        const rawBody = await req.json().catch(() => null)
        const v = validateBody<{ action?: string; sessionId?: string; messages?: unknown[]; scenario?: string; difficulty?: string; targetPersona?: string; pitchGoal?: string; timeLimit?: number; language?: string; industryId?: string; audioUrl?: string; companyId?: string; personaId?: string; callStage?: string; callFocus?: string }>(rawBody, {
            action:        { type: 'string' },
            sessionId:     { type: 'string' },
            messages:      { type: 'array' },
            timeLimit:     { type: 'number' },
            audioUrl:      { type: 'string' },
            scenario:      { type: 'string' },
            difficulty:    { type: 'string' },
            targetPersona: { type: 'string' },
            pitchGoal:     { type: 'string' },
            language:      { type: 'string' },
            industryId:    { type: 'string' },
            companyId:     { type: 'string' },
            personaId:     { type: 'string' },
            callStage:     { type: 'string' },
            callFocus:     { type: 'string' },
        })
        if (!v.ok) return new Response(JSON.stringify({ error: v.error }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: v.status,
        })
        const body = v.body
        const { action, sessionId, messages, scenario, difficulty, targetPersona, pitchGoal, timeLimit, language, industryId, audioUrl, companyId, personaId, callStage, callFocus } = body

        // === ACTION: COMPLETE SESSION ===
        if (action === 'complete') {
            if (!sessionId) {
                return new Response(JSON.stringify({ error: 'Session ID required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            // Fetch session
            const { data: session, error: fetchError } = await supabaseClient
                .from('training_sessions')
                .select('*')
                .eq('id', sessionId)
                .single()

            if (fetchError || !session || session.user_id !== user.id) {
                return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            let pitchId = '';

            // OpenAI Analysis if messages exist
            if (messages && messages.length > 0) {
                // ── Per-org AI spend check ────────────────────────────────────
                if (!orgId) {
                    return new Response(JSON.stringify({ error: 'Forbidden: no org_id in token' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 403,
                    });
                }
                const orgLimit = await checkOrgAiLimit(supabaseAdmin, orgId, 'training-api', AI_ESTIMATED_TOKENS);
                if (!orgLimit.allowed) {
                    return new Response(JSON.stringify({ error: orgLimit.message }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 429,
                    });
                }
                // ─────────────────────────────────────────────────────────────

                for (const m of messages) {
                    if (typeof (m as any)?.role !== 'string') {
                        return new Response(JSON.stringify({ error: 'Each message must have a string role field' }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 400,
                        })
                    }
                }
                const transcript = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

                const prompt = `You are an expert sales coach. Analyze this transcript.
                Transcript:
                ${transcript}

                Return JSON with fields: score (0-100), feedback (string), sentimentScore (-1 to 1), confidenceScore (0-100), paceScore (0-100), clarityScore(0-100), duration(int seconds approx from word count).
                JSON ONLY.`

                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }],
                        response_format: { type: 'json_object' },
                        temperature: 0.3,
                    }),
                })

                if (!res.ok) throw new Error('AI service unavailable')

                const openaiJson = await res.json()
                const textResponse = openaiJson.choices?.[0]?.message?.content ?? ''
                const analysis = JSON.parse(textResponse)

                // Use service role to bypass any RLS ambiguity on pitches insert
                const { data: pitch, error: pitchError } = await supabaseAdmin
                    .from('pitches')
                    .insert({
                        user_id: user.id,
                        training_session_id: sessionId,
                        audio_url: audioUrl || 'text-based-session',
                        transcript: transcript,
                        analysis: analysis,
                        score: analysis.score || 0,
                        feedback: analysis.feedback,
                        sentiment_score: analysis.sentimentScore,
                        confidence_score: analysis.confidenceScore,
                        pace_score: analysis.paceScore,
                        clarity_score: analysis.clarityScore,
                        duration: analysis.duration,
                    })
                    .select()
                    .single()

                if (pitchError) {
                    console.error('[training-api] pitch insert failed:', pitchError)
                    throw new Error('Failed to save session analysis')
                }

                pitchId = pitch.id;

                // Dispatch targeted drills based on weakest skill areas
                type SkillEntry = { area: string; score: number; weakness: string };
                const skillScores: SkillEntry[] = [
                    { area: 'Delivery & Confidence', score: analysis.confidenceScore ?? 100, weakness: 'Low confidence detected in delivery' },
                    { area: 'Clarity & Structure',   score: analysis.clarityScore    ?? 100, weakness: 'Clarity of message needs improvement' },
                    { area: 'Pacing & Rhythm',        score: analysis.paceScore       ?? 100, weakness: 'Pacing issues identified during session' },
                ]
                const weakSkills = skillScores
                    .filter(s => s.score < 70)
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 2)

                if (weakSkills.length > 0) {
                    const drills = weakSkills.map((s: SkillEntry) => ({
                        user_id:             user.id,
                        pitch_id:            pitchId,
                        focus_area:          s.area,
                        weakness_identified: s.weakness,
                        difficulty:          s.score < 40 ? 'easy' : s.score < 60 ? 'medium' : 'hard',
                        drill_type:          s.area,
                        context:             `Score: ${Math.round(s.score)}/100 in your last session`,
                    }))
                    const { error: drillError } = await supabaseAdmin
                        .from('dispatched_drills')
                        .insert(drills)
                    if (drillError) {
                        return new Response(JSON.stringify({ error: 'Failed to create drills: ' + drillError.message }), {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            status: 500,
                        })
                    }
                }
            }

            // Trigger call-summariser for company/persona sessions
            if (session.company_id && session.persona_id && orgId && messages && messages.length > 0) {
                const summaryTranscript = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
                const { data: accountState } = await supabaseAdmin
                    .from('account_states')
                    .select('id, call_count, relationship_notes')
                    .eq('org_id', orgId)
                    .eq('user_id', user.id)
                    .eq('company_id', session.company_id)
                    .eq('persona_id', session.persona_id)
                    .single();

                if (accountState) {
                    const notes = (accountState.relationship_notes as Record<string, unknown>) || {};
                    const existingCommitments = Array.isArray(notes.commitments_made_by_rep)
                        ? (notes.commitments_made_by_rep as string[])
                            .filter((c: string) => {
                                const fulfilled = Array.isArray(notes.commitments_fulfilled) ? notes.commitments_fulfilled as string[] : [];
                                return !fulfilled.includes(c);
                            })
                            .map((c: string) => ({ commitment: c, made_by: 'rep' }))
                        : [];

                    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
                    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

                    // Await summariser to get callSummaryId, then fire-and-forget embedder
                    try {
                        const sumResp = await fetch(`${supabaseUrl}/functions/v1/call-summariser`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${serviceKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                transcript: summaryTranscript,
                                accountStateId: accountState.id,
                                orgId,
                                callNumber: (accountState.call_count || 0) + 1,
                                priorCommitments: existingCommitments,
                            }),
                        });

                        if (sumResp.ok) {
                            const sumBody = await sumResp.json();
                            if (sumBody.callSummaryId) {
                                fetch(`${supabaseUrl}/functions/v1/embed-transcript`, {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Bearer ${serviceKey}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        transcript: summaryTranscript,
                                        callSummaryId: sumBody.callSummaryId,
                                        orgId,
                                    }),
                                }).catch((e) => console.error(`[training-api] embed-transcript failed for call_summary_id=${sumBody.callSummaryId}:`, e));
                            }
                        } else {
                            console.error(`[training-api] call-summariser returned ${sumResp.status} for account_state_id=${accountState.id}`);
                        }
                    } catch (e) {
                        console.error(`[training-api] call-summariser failed for account_state_id=${accountState.id}:`, e);
                    }
                } else {
                    console.error(`[training-api] no account_state found for company=${session.company_id} persona=${session.persona_id} user=${user.id}`);
                }
            }

            // Calculate XP
            const xpMap: Record<string, number> = { easy: 50, medium: 100, hard: 200 };
            const xpEarned = xpMap[session.difficulty] || 50;

            const { error: sessionUpdateError } = await supabaseClient
                .from('training_sessions')
                .update({ completed: true, xp_earned: xpEarned })
                .eq('id', sessionId)

            if (sessionUpdateError) {
                return new Response(JSON.stringify({ error: 'Failed to mark session complete: ' + sessionUpdateError.message }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                })
            }

            const { error: xpError } = await supabaseAdmin.rpc('increment_user_xp', { user_id: user.id, xp: xpEarned })
            if (xpError) {
                console.error('[training-api] increment_user_xp RPC failed:', xpError)
            }

            if (orgId) {
                await logAudit(supabaseAdmin, {
                    orgId, userId: user.id, action: 'call.completed',
                    resourceType: 'training_session', resourceId: sessionId,
                    metadata: { pitch_id: pitchId || null, xp_earned: xpEarned },
                    ...reqCtx,
                })
            }

            return new Response(JSON.stringify({ success: true, pitchId, xpEarned }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // === ACTION: CREATE SESSION (Default) ===
        const sessionInsert: Record<string, unknown> = {
            user_id: user.id,
            scenario,
            difficulty,
            target_persona: targetPersona,
            pitch_goal: pitchGoal,
            time_limit: timeLimit,
            language: language || 'en',
            industry_id: industryId,
        }
        if (companyId)  sessionInsert.company_id = companyId;
        if (personaId)  sessionInsert.persona_id = personaId;
        if (callStage)  sessionInsert.call_stage = callStage;
        if (callFocus)  sessionInsert.call_focus = callFocus;

        const { data: session, error } = await supabaseClient
            .from('training_sessions')
            .insert(sessionInsert)
            .select()
            .single()

        if (error) throw error

        // Initialise account_state for company/persona pair if first interaction
        if (companyId && personaId && orgId) {
            const { error: asError } = await supabaseClient
                .from('account_states')
                .upsert(
                    {
                        org_id: orgId,
                        user_id: user.id,
                        company_id: companyId,
                        persona_id: personaId,
                        current_stage: 'cold',
                        sentiment_score: 50,
                        relationship_notes: {},
                        call_count: 0,
                    },
                    { onConflict: 'org_id,user_id,company_id,persona_id', ignoreDuplicates: true },
                )
            if (asError) {
                console.error('[training-api] account_state init failed:', asError)
            }
        }

        if (orgId) {
            await logAudit(supabaseAdmin, {
                orgId, userId: user.id, action: 'call.started',
                resourceType: 'training_session', resourceId: session.id,
                metadata: {
                    industry_slug: industryId ?? null,
                    company_id: companyId ?? null,
                    persona_id: personaId ?? null,
                    call_stage: callStage ?? null,
                    difficulty: difficulty ?? null,
                },
                ...reqCtx,
            })
        }

        return new Response(JSON.stringify(session), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: unknown) {
        console.error('[training-api] unhandled error:', error);
        const status = (error instanceof Error && error.message === 'Unauthorised') ? 401
                     : (error instanceof Error && error.message === 'Too many requests') ? 429
                     : 500;
        const message = status === 401 ? 'Unauthorised'
                      : status === 429 ? 'Too many requests'
                      : 'An unexpected error occurred.';
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status,
        })
    }
})
