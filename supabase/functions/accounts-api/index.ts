import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from '../_shared/cors.ts'
import { validateBody } from '../_shared/validateBody.ts'
import { sanitizeTextField } from '../_shared/sanitizePromptField.ts'

const FN = '[accounts-api]'

// Startup diagnostics — log env var presence (never values)
console.log(`${FN} env check — SUPABASE_URL length:`, (Deno.env.get('SUPABASE_URL') ?? '').length,
    'SUPABASE_ANON_KEY length:', (Deno.env.get('SUPABASE_ANON_KEY') ?? '').length)

// ────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ────────────────────────────────────────────────────────────────────────────

function isArrayOfStrings(v: unknown): v is string[] {
    return Array.isArray(v) && v.every((i) => typeof i === 'string')
}

function isValidPainPoints(v: unknown): boolean {
    if (!Array.isArray(v)) return false
    return v.every(
        (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.pain === 'string' &&
            typeof item.severity === 'number' &&
            item.severity >= 1 &&
            item.severity <= 5 &&
            typeof item.current_workaround === 'string' &&
            typeof item.cost_of_inaction === 'string',
    )
}

function isValidRecentEvents(v: unknown): boolean {
    if (!Array.isArray(v)) return false
    return v.every(
        (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.event === 'string' &&
            typeof item.impact_on_buying === 'string' &&
            (item.date === undefined || typeof item.date === 'string'),
    )
}

function isValidCompetitiveLandscape(v: unknown): boolean {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false
    const obj = v as Record<string, unknown>
    return (
        isArrayOfStrings(obj.current_vendors) &&
        isArrayOfStrings(obj.considered_alternatives) &&
        isArrayOfStrings(obj.switching_barriers)
    )
}

function isValidPersonalityProfile(v: unknown): boolean {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false
    const obj = v as Record<string, unknown>
    return (
        typeof obj.patience_level === 'number' &&
        obj.patience_level >= 0 &&
        obj.patience_level <= 100 &&
        typeof obj.detail_orientation === 'number' &&
        obj.detail_orientation >= 0 &&
        obj.detail_orientation <= 100 &&
        typeof obj.risk_tolerance === 'number' &&
        obj.risk_tolerance >= 0 &&
        obj.risk_tolerance <= 100 &&
        typeof obj.decision_speed === 'number' &&
        obj.decision_speed >= 0 &&
        obj.decision_speed <= 100 &&
        typeof obj.communication_style === 'string'
    )
}

function isValidTriggers(v: unknown): boolean {
    if (!Array.isArray(v)) return false
    return v.every(
        (item) =>
            item &&
            typeof item === 'object' &&
            typeof item.trigger_phrase_or_topic === 'string' &&
            typeof item.positive_or_negative === 'string' &&
            typeof item.reaction === 'string',
    )
}

function isPlainObject(v: unknown): boolean {
    return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** Validate JSONB fields on a company body. Returns error string or null. */
function validateCompanyJsonb(body: Record<string, unknown>): string | null {
    if (body.tech_stack !== undefined && !isArrayOfStrings(body.tech_stack))
        return 'tech_stack must be an array of strings'
    if (body.strategic_priorities !== undefined && !isArrayOfStrings(body.strategic_priorities))
        return 'strategic_priorities must be an array of strings'
    if (body.pain_points !== undefined && !isValidPainPoints(body.pain_points))
        return 'pain_points must be an array of { pain, severity (1-5), current_workaround, cost_of_inaction }'
    if (body.recent_events !== undefined && !isValidRecentEvents(body.recent_events))
        return 'recent_events must be an array of { event, impact_on_buying, date? }'
    if (body.competitive_landscape !== undefined && !isValidCompetitiveLandscape(body.competitive_landscape))
        return 'competitive_landscape must be { current_vendors: string[], considered_alternatives: string[], switching_barriers: string[] }'
    if (body.override_vocabulary !== undefined && !isPlainObject(body.override_vocabulary))
        return 'override_vocabulary must be an object'
    if (body.override_objection_patterns !== undefined && !isPlainObject(body.override_objection_patterns))
        return 'override_objection_patterns must be an object'
    if (body.override_compliance_flags !== undefined && !isPlainObject(body.override_compliance_flags))
        return 'override_compliance_flags must be an object'
    if (body.override_buying_committee !== undefined && !isPlainObject(body.override_buying_committee))
        return 'override_buying_committee must be an object'
    return null
}

/** Validate JSONB fields on a persona body. Returns error string or null. */
function validatePersonaJsonb(body: Record<string, unknown>): string | null {
    if (body.personality_profile !== undefined && !isValidPersonalityProfile(body.personality_profile))
        return 'personality_profile must be { patience_level (0-100), detail_orientation (0-100), risk_tolerance (0-100), decision_speed (0-100), communication_style: string }'
    if (body.priorities !== undefined && !isArrayOfStrings(body.priorities))
        return 'priorities must be an array of strings'
    if (body.skepticisms !== undefined && !isArrayOfStrings(body.skepticisms))
        return 'skepticisms must be an array of strings'
    if (body.triggers !== undefined && !isValidTriggers(body.triggers))
        return 'triggers must be an array of { trigger_phrase_or_topic, positive_or_negative, reaction }'
    return null
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: JSON error response
// ────────────────────────────────────────────────────────────────────────────

function jsonError(
    message: string,
    status: number,
    corsHeaders: Record<string, string>,
): Response {
    return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    })
}

function jsonOk(
    data: unknown,
    corsHeaders: Record<string, string>,
    status = 200,
): Response {
    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    })
}

// ────────────────────────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    let corsHeaders: Record<string, string>
    try {
        corsHeaders = getCorsHeaders(req)
    } catch (e) {
        console.error(`${FN} CORS config error — ALLOWED_ORIGIN may not be set:`, e)
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── Auth ─────────────────────────────────────────────────────────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            console.error(`${FN} Missing Authorization header`)
            return jsonError('Unauthorized', 401, corsHeaders)
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } },
        )

        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser()

        if (authError) {
            console.error(`${FN} getUser error:`, authError)
        }

        if (!user) {
            console.error(
                `${FN} getUser returned no user — authError:`,
                JSON.stringify(authError),
                '| Authorization header prefix:',
                authHeader?.slice(0, 27) ?? 'missing',
            )
            return jsonError('Unauthorized', 401, corsHeaders)
        }

        // ── Rate limit: 20 req/min burst, 100/hr sustained — per user ────
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )
        const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc(
            'check_rate_limit_hardened',
            {
                dimension_keys: [`user:${user.id}`],
                cost: 1,
                burst_limit: 20,
                burst_window_seconds: 60,
                sustained_limit: 100,
                sustained_window_seconds: 3600,
            },
        )
        if (rateLimitError) {
            console.error(`${FN} rate limit check failed:`, rateLimitError)
        } else if (!isAllowed) {
            return jsonError('Too many requests', 429, corsHeaders)
        }

        // ── Extract org_id ───────────────────────────────────────────────────
        let orgId: string | undefined =
            user.app_metadata?.org_id ?? user.user_metadata?.org_id
        if (!orgId) {
            const { data: profileRow } = await supabaseAdmin
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single()
            orgId = profileRow?.org_id ?? undefined
        }
        if (!orgId) {
            return jsonError('Forbidden: no org_id found for user', 403, corsHeaders)
        }

        // ── Routing ──────────────────────────────────────────────────────────
        const url = new URL(req.url)
        const pathParts = url.pathname
            .replace(/^\/accounts-api\/?/, '')
            .split('/')
            .filter(Boolean)
        const method = req.method

        // ────────────────────────────────────────────────────────────────────
        // COMPANY routes
        // ────────────────────────────────────────────────────────────────────

        // GET / — list companies for org
        if (method === 'GET' && pathParts.length === 0) {
            const { data, error } = await supabaseClient
                .from('simulated_companies')
                .select('*, industry:industry_profiles(display_name), simulated_personas(count)')
                .order('created_at', { ascending: false })

            if (error) {
                console.error(`${FN} list companies error:`, error)
                return jsonError('Failed to list companies', 500, corsHeaders)
            }

            return jsonOk(data, corsHeaders)
        }

        // POST / — create company
        if (method === 'POST' && pathParts.length === 0) {
            const rawBody = await req.json().catch(() => null)
            const v = validateBody<Record<string, unknown>>(rawBody, {
                name:            { type: 'string', required: true },
                industry_slug:   { type: 'string', required: true },
                size:            { type: 'string', required: true },
                stage:           { type: 'string', required: true },
                difficulty_tier: { type: 'string' },
                tech_stack:      { type: 'array' },
                strategic_priorities: { type: 'array' },
                recent_events:   { type: 'array' },
                pain_points:     { type: 'array' },
                competitive_landscape: { type: 'object' },
                override_vocabulary:          { type: 'object' },
                override_objection_patterns:  { type: 'object' },
                override_compliance_flags:    { type: 'object' },
                override_buying_committee:    { type: 'object' },
            })
            if (!v.ok) return jsonError(v.error, v.status, corsHeaders)
            const body = v.body

            const jsonbErr = validateCompanyJsonb(body)
            if (jsonbErr) return jsonError(jsonbErr, 400, corsHeaders)

            const insert: Record<string, unknown> = {
                org_id:          orgId,
                name:            sanitizeTextField(body.name as string, 200),
                industry_slug:   sanitizeTextField(body.industry_slug as string, 200),
                size:            sanitizeTextField(body.size as string, 200),
                stage:           sanitizeTextField(body.stage as string, 200),
            }
            if (body.difficulty_tier !== undefined) insert.difficulty_tier = sanitizeTextField(body.difficulty_tier as string, 200)
            if (body.tech_stack !== undefined) insert.tech_stack = body.tech_stack
            if (body.strategic_priorities !== undefined) insert.strategic_priorities = body.strategic_priorities
            if (body.recent_events !== undefined) insert.recent_events = body.recent_events
            if (body.pain_points !== undefined) insert.pain_points = body.pain_points
            if (body.competitive_landscape !== undefined) insert.competitive_landscape = body.competitive_landscape
            if (body.override_vocabulary !== undefined) insert.override_vocabulary = body.override_vocabulary
            if (body.override_objection_patterns !== undefined) insert.override_objection_patterns = body.override_objection_patterns
            if (body.override_compliance_flags !== undefined) insert.override_compliance_flags = body.override_compliance_flags
            if (body.override_buying_committee !== undefined) insert.override_buying_committee = body.override_buying_committee

            const { data, error } = await supabaseClient
                .from('simulated_companies')
                .insert(insert)
                .select('*, industry:industry_profiles(display_name)')
                .single()

            if (error) {
                console.error(`${FN} create company error:`, error)
                return jsonError('Failed to create company', 500, corsHeaders)
            }

            return jsonOk(data, corsHeaders, 201)
        }

        // PUT /:id — update company
        if (method === 'PUT' && pathParts.length === 1 && pathParts[0] !== 'personas') {
            const companyId = pathParts[0]
            const rawBody = await req.json().catch(() => null)
            const v = validateBody<Record<string, unknown>>(rawBody, {
                name:            { type: 'string' },
                industry_slug:   { type: 'string' },
                size:            { type: 'string' },
                stage:           { type: 'string' },
                difficulty_tier: { type: 'string' },
                tech_stack:      { type: 'array' },
                strategic_priorities: { type: 'array' },
                recent_events:   { type: 'array' },
                pain_points:     { type: 'array' },
                competitive_landscape: { type: 'object' },
                override_vocabulary:          { type: 'object' },
                override_objection_patterns:  { type: 'object' },
                override_compliance_flags:    { type: 'object' },
                override_buying_committee:    { type: 'object' },
            })
            if (!v.ok) return jsonError(v.error, v.status, corsHeaders)
            const body = v.body

            const jsonbErr = validateCompanyJsonb(body)
            if (jsonbErr) return jsonError(jsonbErr, 400, corsHeaders)

            const update: Record<string, unknown> = {}
            if (body.name !== undefined) update.name = sanitizeTextField(body.name as string, 200)
            if (body.industry_slug !== undefined) update.industry_slug = sanitizeTextField(body.industry_slug as string, 200)
            if (body.size !== undefined) update.size = sanitizeTextField(body.size as string, 200)
            if (body.stage !== undefined) update.stage = sanitizeTextField(body.stage as string, 200)
            if (body.difficulty_tier !== undefined) update.difficulty_tier = sanitizeTextField(body.difficulty_tier as string, 200)
            if (body.tech_stack !== undefined) update.tech_stack = body.tech_stack
            if (body.strategic_priorities !== undefined) update.strategic_priorities = body.strategic_priorities
            if (body.recent_events !== undefined) update.recent_events = body.recent_events
            if (body.pain_points !== undefined) update.pain_points = body.pain_points
            if (body.competitive_landscape !== undefined) update.competitive_landscape = body.competitive_landscape
            if (body.override_vocabulary !== undefined) update.override_vocabulary = body.override_vocabulary
            if (body.override_objection_patterns !== undefined) update.override_objection_patterns = body.override_objection_patterns
            if (body.override_compliance_flags !== undefined) update.override_compliance_flags = body.override_compliance_flags
            if (body.override_buying_committee !== undefined) update.override_buying_committee = body.override_buying_committee

            if (Object.keys(update).length === 0) {
                return jsonError('No fields to update', 400, corsHeaders)
            }

            const { data, error } = await supabaseClient
                .from('simulated_companies')
                .update(update)
                .eq('id', companyId)
                .select('*, industry:industry_profiles(display_name)')
                .single()

            if (error) {
                console.error(`${FN} update company error:`, error)
                return jsonError('Failed to update company', 500, corsHeaders)
            }

            return jsonOk(data, corsHeaders)
        }

        // DELETE /:id — delete company (FK cascades handle children)
        if (method === 'DELETE' && pathParts.length === 1 && pathParts[0] !== 'personas') {
            const companyId = pathParts[0]

            const { error } = await supabaseClient
                .from('simulated_companies')
                .delete()
                .eq('id', companyId)

            if (error) {
                console.error(`${FN} delete company error:`, error)
                return jsonError('Failed to delete company', 500, corsHeaders)
            }

            return jsonOk({ success: true }, corsHeaders)
        }

        // ────────────────────────────────────────────────────────────────────
        // PERSONA routes — nested under company
        // ────────────────────────────────────────────────────────────────────

        // GET /:id/personas — list personas for a company
        if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'personas') {
            const companyId = pathParts[0]

            const { data, error } = await supabaseClient
                .from('simulated_personas')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error(`${FN} list personas error:`, error)
                return jsonError('Failed to list personas', 500, corsHeaders)
            }

            return jsonOk(data, corsHeaders)
        }

        // POST /:id/personas — create persona for a company
        if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'personas') {
            const companyId = pathParts[0]

            const rawBody = await req.json().catch(() => null)
            const v = validateBody<Record<string, unknown>>(rawBody, {
                name:                { type: 'string', required: true },
                title:               { type: 'string', required: true },
                seniority:           { type: 'string', required: true },
                personality_profile: { type: 'object' },
                priorities:          { type: 'array' },
                skepticisms:         { type: 'array' },
                triggers:            { type: 'array' },
                reports_to:          { type: 'string' },
                direct_reports_count:{ type: 'number' },
                tenure_at_company:   { type: 'string' },
                background:          { type: 'string' },
            })
            if (!v.ok) return jsonError(v.error, v.status, corsHeaders)
            const body = v.body

            const jsonbErr = validatePersonaJsonb(body)
            if (jsonbErr) return jsonError(jsonbErr, 400, corsHeaders)

            const insert: Record<string, unknown> = {
                org_id:     orgId,
                company_id: companyId,
                name:       sanitizeTextField(body.name as string, 200),
                title:      sanitizeTextField(body.title as string, 200),
                seniority:  sanitizeTextField(body.seniority as string, 200),
            }
            if (body.personality_profile !== undefined) insert.personality_profile = body.personality_profile
            if (body.priorities !== undefined) insert.priorities = body.priorities
            if (body.skepticisms !== undefined) insert.skepticisms = body.skepticisms
            if (body.triggers !== undefined) insert.triggers = body.triggers
            if (body.reports_to !== undefined) insert.reports_to = sanitizeTextField(body.reports_to as string, 200)
            if (body.direct_reports_count !== undefined) insert.direct_reports_count = body.direct_reports_count
            if (body.tenure_at_company !== undefined) insert.tenure_at_company = sanitizeTextField(body.tenure_at_company as string, 200)
            if (body.background !== undefined) insert.background = sanitizeTextField(body.background as string, 200)

            const { data, error } = await supabaseClient
                .from('simulated_personas')
                .insert(insert)
                .select()
                .single()

            if (error) {
                console.error(`${FN} create persona error:`, error)
                return jsonError('Failed to create persona', 500, corsHeaders)
            }

            return jsonOk(data, corsHeaders, 201)
        }

        // ────────────────────────────────────────────────────────────────────
        // PERSONA routes — direct by persona ID
        // ────────────────────────────────────────────────────────────────────

        // PUT /personas/:id — update persona
        if (method === 'PUT' && pathParts.length === 2 && pathParts[0] === 'personas') {
            const personaId = pathParts[1]

            const rawBody = await req.json().catch(() => null)
            const v = validateBody<Record<string, unknown>>(rawBody, {
                name:                { type: 'string' },
                title:               { type: 'string' },
                seniority:           { type: 'string' },
                personality_profile: { type: 'object' },
                priorities:          { type: 'array' },
                skepticisms:         { type: 'array' },
                triggers:            { type: 'array' },
                reports_to:          { type: 'string' },
                direct_reports_count:{ type: 'number' },
                tenure_at_company:   { type: 'string' },
                background:          { type: 'string' },
            })
            if (!v.ok) return jsonError(v.error, v.status, corsHeaders)
            const body = v.body

            const jsonbErr = validatePersonaJsonb(body)
            if (jsonbErr) return jsonError(jsonbErr, 400, corsHeaders)

            const update: Record<string, unknown> = {}
            if (body.name !== undefined) update.name = sanitizeTextField(body.name as string, 200)
            if (body.title !== undefined) update.title = sanitizeTextField(body.title as string, 200)
            if (body.seniority !== undefined) update.seniority = sanitizeTextField(body.seniority as string, 200)
            if (body.personality_profile !== undefined) update.personality_profile = body.personality_profile
            if (body.priorities !== undefined) update.priorities = body.priorities
            if (body.skepticisms !== undefined) update.skepticisms = body.skepticisms
            if (body.triggers !== undefined) update.triggers = body.triggers
            if (body.reports_to !== undefined) update.reports_to = sanitizeTextField(body.reports_to as string, 200)
            if (body.direct_reports_count !== undefined) update.direct_reports_count = body.direct_reports_count
            if (body.tenure_at_company !== undefined) update.tenure_at_company = sanitizeTextField(body.tenure_at_company as string, 200)
            if (body.background !== undefined) update.background = sanitizeTextField(body.background as string, 200)

            if (Object.keys(update).length === 0) {
                return jsonError('No fields to update', 400, corsHeaders)
            }

            const { data, error } = await supabaseClient
                .from('simulated_personas')
                .update(update)
                .eq('id', personaId)
                .select()
                .single()

            if (error) {
                console.error(`${FN} update persona error:`, error)
                return jsonError('Failed to update persona', 500, corsHeaders)
            }

            return jsonOk(data, corsHeaders)
        }

        // DELETE /personas/:id — delete persona
        if (method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'personas') {
            const personaId = pathParts[1]

            const { error } = await supabaseClient
                .from('simulated_personas')
                .delete()
                .eq('id', personaId)

            if (error) {
                console.error(`${FN} delete persona error:`, error)
                return jsonError('Failed to delete persona', 500, corsHeaders)
            }

            return jsonOk({ success: true }, corsHeaders)
        }

        // ────────────────────────────────────────────────────────────────────
        // ACCOUNT STATE routes
        // ──────────��────────────────────────────���────────────────────────────

        // POST /accounts/:accountStateId/reset — reset account state to defaults
        if (method === 'POST' && pathParts.length === 3 && pathParts[0] === 'accounts' && pathParts[2] === 'reset') {
            const accountStateId = pathParts[1]

            const { data: accountState, error: asErr } = await supabaseClient
                .from('account_states')
                .select('id, org_id, user_id')
                .eq('id', accountStateId)
                .single()

            if (asErr || !accountState) {
                return jsonError('Account state not found', 404, corsHeaders)
            }

            if (accountState.org_id !== orgId) {
                return jsonError('Forbidden', 403, corsHeaders)
            }

            const { error: archiveErr } = await supabaseAdmin
                .from('call_summaries')
                .update({ archived_at: new Date().toISOString() })
                .eq('account_state_id', accountStateId)
                .is('archived_at', null)

            if (archiveErr) {
                console.error(`${FN} archive call_summaries error:`, archiveErr)
                return jsonError('Failed to archive call summaries', 500, corsHeaders)
            }

            const { data: resetState, error: resetErr } = await supabaseClient
                .from('account_states')
                .update({
                    current_stage: 'cold',
                    sentiment_score: 50,
                    relationship_notes: {},
                    call_count: 0,
                    last_interaction_at: null,
                    next_scheduled_touchpoint: null,
                })
                .eq('id', accountStateId)
                .select()
                .single()

            if (resetErr) {
                console.error(`${FN} reset account_state error:`, resetErr)
                return jsonError('Failed to reset account state', 500, corsHeaders)
            }

            return jsonOk(resetState, corsHeaders)
        }

        return jsonError('Not found', 404, corsHeaders)

    } catch (error: unknown) {
        console.error(`${FN} unhandled error:`, error)
        const message = 'An unexpected error occurred.'
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
