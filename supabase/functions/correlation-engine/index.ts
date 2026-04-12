/**
 * OAST: Correlation Engine Edge Function
 *
 * Computes per-rep Transfer Gap snapshots by comparing training simulation scores
 * (pitches.score, aggregated as max-per-session then averaged) against live call
 * scores (live_scores.overall_score, qualified calls only).
 *
 * Routes:
 *   POST /correlation-engine/compute        — triggered post-call by telephony-webhook
 *   GET  /correlation-engine/training-efficacy — org-wide efficacy summary for manager view
 *   GET  /correlation-engine/:repId         — per-rep snapshot + 90-day trend
 *
 * Multi-tenancy: scoped by team_id (profiles.team_id). org_id in legacy code = team_id here.
 *
 * Null contract:
 *   All gap/score values are null when there is insufficient data (e.g. new rep with
 *   no live calls). The UI must treat null as "no data", never coerce to zero.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from '../_shared/cors.ts'

// ── Constants ────────────────────────────────────────────────────────────────

const WINDOW_DAYS = 90          // lookback window for averages
const DECAY_THRESHOLD = 10      // pts drop from peak to flag knowledge_decay
const PRESSURE_GAP_DELTA = 5    // training rising but live flat/declining by this much

// Role Readiness constants (T10)
const READINESS_SESSION_BENCHMARK = 3    // sessions/week target
const READINESS_GAP_MAX           = 50   // gap at which gap_inverted score hits 0
const READINESS_TREND_THRESHOLD   = 5    // pts delta between halves to call improving/declining

// ── DB client helpers ────────────────────────────────────────────────────────

function adminClient(): SupabaseClient {
  return createClient(
    (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, ''),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

function authedClient(req: Request): SupabaseClient {
  return createClient(
    (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, ''),
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
  )
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

interface AuthedUser {
  id: string
  team_id: string | null
  role: 'user' | 'admin' | 'team_lead'
}

async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const client = authedClient(req)
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await adminClient()
    .from('profiles')
    .select('team_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  return { id: user.id, team_id: profile.team_id, role: profile.role }
}

function isManager(user: AuthedUser): boolean {
  return user.role === 'admin' || user.role === 'team_lead'
}

// ── Computation helpers ──────────────────────────────────────────────────────

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function gap(training: number | null, live: number | null): number | null {
  if (training === null || live === null) return null
  return training - live
}

interface TrainingStats {
  avg_overall: number | null
  sessions_count: number
}

/**
 * Fetch training stats for a rep over the window.
 * Strategy: max(pitch.score) per training_session, then avg across sessions.
 * Rationale: rep should get credit for their passing attempt, not be penalised
 * by failed attempts in the same session.
 */
async function getTrainingStats(
  db: SupabaseClient,
  repId: string,
  windowDays: number
): Promise<TrainingStats> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all scored pitches for this rep within the window, linked to a training session
  const { data: pitches, error } = await db
    .from('pitches')
    .select('training_session_id, score')
    .eq('user_id', repId)
    .not('training_session_id', 'is', null)
    .not('score', 'is', null)
    .gte('created_at', since)

  if (error || !pitches || pitches.length === 0) {
    return { avg_overall: null, sessions_count: 0 }
  }

  // Group by training_session_id, take max score per session
  const sessionMaxes = new Map<string, number>()
  for (const p of pitches) {
    const current = sessionMaxes.get(p.training_session_id) ?? -Infinity
    if (p.score > current) sessionMaxes.set(p.training_session_id, p.score)
  }

  const sessionScores = Array.from(sessionMaxes.values())
  return {
    avg_overall: avg(sessionScores),
    sessions_count: sessionScores.length,
  }
}

interface LiveStats {
  avg_overall: number | null
  avg_talk_ratio: number | null
  avg_discovery: number | null
  avg_engagement: number | null
  avg_objection_handling: number | null
  calls_count: number
  // For decay/regression analysis — chronologically ordered overall scores
  ordered_scores: Array<{ score: number; recorded_at: string }>
}

async function getLiveStats(
  db: SupabaseClient,
  repId: string,
  windowDays: number
): Promise<LiveStats> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: calls, error } = await db
    .from('live_scores')
    .select(
      'overall_score, talk_ratio_score, discovery_score, engagement_score, objection_handling_score, call_started_at'
    )
    .eq('rep_id', repId)
    .eq('qualified', true)
    .not('overall_score', 'is', null)
    .gte('call_started_at', since)
    .order('call_started_at', { ascending: true })

  if (error || !calls || calls.length === 0) {
    return {
      avg_overall: null,
      avg_talk_ratio: null,
      avg_discovery: null,
      avg_engagement: null,
      avg_objection_handling: null,
      calls_count: 0,
      ordered_scores: [],
    }
  }

  const pick = (key: keyof typeof calls[0]) =>
    calls.map(c => c[key]).filter((v): v is number => typeof v === 'number')

  return {
    avg_overall: avg(pick('overall_score')),
    avg_talk_ratio: avg(pick('talk_ratio_score')),
    avg_discovery: avg(pick('discovery_score')),
    avg_engagement: avg(pick('engagement_score')),
    avg_objection_handling: avg(pick('objection_handling_score')),
    calls_count: calls.length,
    ordered_scores: calls
      .filter(c => c.overall_score !== null)
      .map(c => ({ score: c.overall_score as number, recorded_at: c.call_started_at })),
  }
}

/**
 * Detect knowledge decay: live overall score has dropped more than DECAY_THRESHOLD
 * points from the peak value within the window.
 */
function detectKnowledgeDecay(orderedScores: LiveStats['ordered_scores']): boolean {
  if (orderedScores.length < 3) return false
  const scores = orderedScores.map(s => s.score)
  const peak = Math.max(...scores)
  const latest = scores[scores.length - 1]
  return peak - latest >= DECAY_THRESHOLD
}

/**
 * Detect pressure regression: training avg is rising (positive trend over first
 * vs second half of window) while live avg is flat or declining.
 * Requires at least 4 live calls to have a meaningful split.
 */
function detectPressureRegression(
  orderedScores: LiveStats['ordered_scores'],
  trainingAvg: number | null
): boolean {
  if (orderedScores.length < 4 || trainingAvg === null) return false
  const scores = orderedScores.map(s => s.score)
  const mid = Math.floor(scores.length / 2)
  const firstHalfAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid
  const secondHalfAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid)

  // Live is declining or flat (second half avg not improving meaningfully)
  const liveStagnant = secondHalfAvg - firstHalfAvg < PRESSURE_GAP_DELTA

  // We don't have historical training snapshots here for trend, so we approximate:
  // if live is stagnant and the current transfer gap is large (>15pts), flag it.
  const currentGap = trainingAvg - secondHalfAvg
  return liveStagnant && currentGap > 15
}

/**
 * Identify which dimensions have a gap larger than 15pts (significant weakness).
 * Returns the dimension key names as used in live_scores columns.
 */
function findDecayingDimensions(
  trainingAvg: number | null,
  liveStats: LiveStats
): string[] {
  if (trainingAvg === null) return []

  // For dimension-level decay we compare the dimension gap against a threshold.
  // A dimension gap > 20pts is flagged. Overall gap serves as training proxy for
  // dimensions (we don't have per-dimension training scores yet — T2 will add those).
  const decaying: string[] = []
  const threshold = 20
  const check = (liveAvg: number | null, key: string) => {
    if (liveAvg !== null && trainingAvg - liveAvg > threshold) decaying.push(key)
  }

  check(liveStats.avg_talk_ratio, 'talk_ratio_score')
  check(liveStats.avg_discovery, 'discovery_score')
  check(liveStats.avg_engagement, 'engagement_score')
  check(liveStats.avg_objection_handling, 'objection_handling_score')

  return decaying
}

// ── Role Readiness computation (T10) ─────────────────────────────────────────

export interface RoleReadinessInputs {
  skillAvg:         number | null   // training_avg_overall, 0–100
  transferGap:      number | null   // transfer_gap_overall; null → gap_inverted treated as null
  callScoreTrend:   number | null   // 0 | 50 | 100; null → treated as 50 neutral
  sessionFrequency: number | null   // 0–100 from sessions/wk vs benchmark; null → 50
  retentionRate:    number | null   // 0–100 from first→last attempt; null → 50 neutral
}

export interface RoleReadinessResult {
  score:   number
  band:    'Not Ready' | 'Developing' | 'Ready' | 'Exceptional'
  factors: {
    skill_avg:         number
    gap_inverted:      number
    call_score_trend:  number
    session_frequency: number
    retention_rate:    number
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Assigns a readiness band from a composite score.
 * Not Ready < 40, Developing 40–59, Ready 60–79, Exceptional 80+
 */
export function assignBand(score: number): RoleReadinessResult['band'] {
  if (score >= 80) return 'Exceptional'
  if (score >= 60) return 'Ready'
  if (score >= 40) return 'Developing'
  return 'Not Ready'
}

/**
 * Computes the composite Role Readiness score (0–100) and band.
 *
 * Weights: skill_avg 25%, gap_inverted 30%, call_score_trend 20%,
 *          session_frequency 15%, retention_rate 10%.
 * Null inputs default to 50 (neutral), except transferGap which maps to 50 inverted
 * (a null gap means no live data — we don't penalise, but don't reward either).
 */
export function computeRoleReadiness(inputs: RoleReadinessInputs): RoleReadinessResult {
  const skillAvg = inputs.skillAvg !== null
    ? clamp(inputs.skillAvg, 0, 100)
    : 50

  const gapInverted = inputs.transferGap !== null
    ? clamp(100 - (inputs.transferGap / READINESS_GAP_MAX) * 100, 0, 100)
    : 50

  const callScoreTrend = inputs.callScoreTrend !== null
    ? clamp(inputs.callScoreTrend, 0, 100)
    : 50

  const sessionFrequency = inputs.sessionFrequency !== null
    ? clamp(inputs.sessionFrequency, 0, 100)
    : 50

  const retentionRate = inputs.retentionRate !== null
    ? clamp(inputs.retentionRate, 0, 100)
    : 50

  const score = (
    skillAvg         * 0.25 +
    gapInverted      * 0.30 +
    callScoreTrend   * 0.20 +
    sessionFrequency * 0.15 +
    retentionRate    * 0.10
  )

  const roundedScore = Math.round(score * 100) / 100

  return {
    score: roundedScore,
    band:  assignBand(roundedScore),
    factors: {
      skill_avg:         skillAvg,
      gap_inverted:      gapInverted,
      call_score_trend:  callScoreTrend,
      session_frequency: sessionFrequency,
      retention_rate:    retentionRate,
    },
  }
}

/**
 * Derives a 0 | 50 | 100 trend score from the last 4 live call scores.
 * Compares mean of first half vs mean of second half.
 * Improving (100): second half mean > first half mean + READINESS_TREND_THRESHOLD
 * Declining (0):   second half mean < first half mean - READINESS_TREND_THRESHOLD
 * Stable (50):     otherwise
 */
function callTrendScore(orderedScores: LiveStats['ordered_scores']): number {
  const last4 = orderedScores.slice(-4)
  if (last4.length < 2) return 50
  const mid      = Math.floor(last4.length / 2)
  const firstAvg = last4.slice(0, mid).reduce((a, b) => a + b.score, 0) / mid
  const secondAvg = last4.slice(mid).reduce((a, b) => a + b.score, 0) / (last4.length - mid)
  const delta    = secondAvg - firstAvg
  if (delta > READINESS_TREND_THRESHOLD)  return 100
  if (delta < -READINESS_TREND_THRESHOLD) return 0
  return 50
}

/**
 * Queries training_attempts for the rep to compute first→last attempt retention %.
 * For each scenario with >= 2 attempts: retention = last_score / first_score * 100.
 * Returns null if no scenario has both a first and a later scored attempt.
 */
async function computeRetentionRate(db: SupabaseClient, repId: string): Promise<number | null> {
  const { data, error } = await db
    .from('training_attempts')
    .select('scenario_id, attempt_number, score')
    .eq('rep_id', repId)
    .not('score', 'is', null)
    .order('attempt_number', { ascending: true })

  if (error || !data || data.length === 0) return null

  // Group by scenario, find first and latest scored attempt
  const scenarioMap = new Map<string, { first: number; last: number }>()
  for (const row of data) {
    if (row.score === null) continue
    const existing = scenarioMap.get(row.scenario_id)
    if (!existing) {
      scenarioMap.set(row.scenario_id, { first: row.score, last: row.score })
    } else {
      existing.last = row.score  // ordered asc by attempt_number → last overwrite wins
    }
  }

  const retentions = [...scenarioMap.values()]
    .filter(s => s.first > 0 && s.first !== s.last)
    .map(s => clamp((s.last / s.first) * 100, 0, 150))  // cap at 150% (improvement)

  if (retentions.length === 0) return null
  return clamp(retentions.reduce((a, b) => a + b, 0) / retentions.length, 0, 100)
}

// ── Route: POST /compute ─────────────────────────────────────────────────────
// Called by telephony-webhook after each committed live_score. Service-role only.

async function handleCompute(req: Request): Promise<Response> {
  const corsHeaders = { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  // Verify service-role call: must carry service role key or be called internally.
  // We check for the service role key in the Authorization header.
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!authHeader.includes(serviceKey) && serviceKey !== '') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
  }

  const body = await req.json().catch(() => ({}))
  const repId: string | undefined = body.rep_id

  if (!repId) {
    return new Response(JSON.stringify({ error: 'rep_id required' }), { status: 400, headers: corsHeaders })
  }

  const db = adminClient()

  // Fetch rep's team_id
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('team_id')
    .eq('id', repId)
    .single()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Rep not found' }), { status: 404, headers: corsHeaders })
  }

  const [training, live] = await Promise.all([
    getTrainingStats(db, repId, WINDOW_DAYS),
    getLiveStats(db, repId, WINDOW_DAYS),
  ])

  const transferGapOverall = gap(training.avg_overall, live.avg_overall)
  const decayDetected = detectKnowledgeDecay(live.ordered_scores)
  const pressureRegression = detectPressureRegression(live.ordered_scores, training.avg_overall)
  const decayingDimensions = findDecayingDimensions(training.avg_overall, live)

  // T10: Role Readiness computation
  const trendScore = callTrendScore(live.ordered_scores)
  const retentionRateVal = await computeRetentionRate(db, repId)
  const sessionsPerWeek = training.sessions_count / (WINDOW_DAYS / 7)
  const sessionFreqScore = clamp((sessionsPerWeek / READINESS_SESSION_BENCHMARK) * 100, 0, 100)

  const readiness = computeRoleReadiness({
    skillAvg:         training.avg_overall,
    transferGap:      transferGapOverall,
    callScoreTrend:   trendScore,
    sessionFrequency: sessionFreqScore,
    retentionRate:    retentionRateVal,
  })

  // Upsert — one row per rep per calendar day
  const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

  const { error: upsertError } = await db
    .from('rep_correlation_snapshots')
    .upsert(
      {
        rep_id: repId,
        team_id: profile.team_id,
        snapshot_date: today,
        training_avg_overall: training.avg_overall,
        live_avg_overall: live.avg_overall,
        transfer_gap_overall: transferGapOverall,
        talk_ratio_gap: gap(training.avg_overall, live.avg_talk_ratio),
        discovery_gap: gap(training.avg_overall, live.avg_discovery),
        engagement_gap: gap(training.avg_overall, live.avg_engagement),
        objection_handling_gap: gap(training.avg_overall, live.avg_objection_handling),
        pressure_regression: pressureRegression,
        knowledge_decay_detected: decayDetected,
        decaying_dimensions: decayingDimensions,
        refresher_nudge_queued: false,
        training_sessions_count: training.sessions_count,
        live_calls_count: live.calls_count,
        window_days: WINDOW_DAYS,
        // T10: Role Readiness
        role_readiness_score:   readiness.score,
        role_readiness_band:    readiness.band,
        role_readiness_factors: readiness.factors,
      },
      { onConflict: 'rep_id,snapshot_date' }
    )

  if (upsertError) {
    console.error('[correlation-engine] upsert failed:', upsertError.message)
    return new Response(
      JSON.stringify({ error: 'Snapshot write failed', detail: upsertError.message }),
      { status: 500, headers: corsHeaders }
    )
  }

  console.log(
    `[correlation-engine] snapshot written — rep=${repId} gap=${transferGapOverall} ` +
    `decay=${decayDetected} pressure=${pressureRegression}`
  )

  return new Response(
    JSON.stringify({
      rep_id: repId,
      snapshot_date: today,
      transfer_gap_overall: transferGapOverall,
      knowledge_decay_detected: decayDetected,
      pressure_regression: pressureRegression,
    }),
    { headers: corsHeaders }
  )
}

// ── Route: GET /training-efficacy ────────────────────────────────────────────
// Returns org-wide Transfer Gap summary for the manager dashboard.
// Auth: manager (team_lead or admin) only.

async function handleTrainingEfficacy(req: Request): Promise<Response> {
  const corsHeaders = { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  const user = await getAuthedUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }
  if (!isManager(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
  }
  if (!user.team_id) {
    return new Response(JSON.stringify({ error: 'No team assigned' }), { status: 400, headers: corsHeaders })
  }

  const db = adminClient()

  // Latest snapshot per rep in the team: get distinct rep_ids then latest for each
  const { data: snapshots, error } = await db
    .from('rep_correlation_snapshots')
    .select(
      'rep_id, transfer_gap_overall, knowledge_decay_detected, pressure_regression, snapshot_date'
    )
    .eq('team_id', user.team_id)
    .order('snapshot_date', { ascending: false })

  if (error) {
    console.error('[correlation-engine] training-efficacy query failed:', error.message)
    return new Response(JSON.stringify({ error: 'Query failed' }), { status: 500, headers: corsHeaders })
  }

  // Deduplicate: keep only the latest snapshot per rep
  const latestByRep = new Map<string, typeof snapshots[0]>()
  for (const s of (snapshots ?? [])) {
    if (!latestByRep.has(s.rep_id)) latestByRep.set(s.rep_id, s)
  }
  const repSnapshots = Array.from(latestByRep.values())

  // Compute summary metrics — only over reps who have a non-null transfer gap
  const gapsWithData = repSnapshots
    .map(s => s.transfer_gap_overall)
    .filter((v): v is number => v !== null)

  const avgTransferGap = avg(gapsWithData)

  return new Response(
    JSON.stringify({
      total_reps_analysed: repSnapshots.length,
      avg_transfer_gap: avgTransferGap,         // null if no rep has data yet
      reps_with_decay: repSnapshots.filter(s => s.knowledge_decay_detected).length,
      reps_with_pressure_regression: repSnapshots.filter(s => s.pressure_regression).length,
      rep_snapshots: repSnapshots,
    }),
    { headers: corsHeaders }
  )
}

// ── Route: GET /:repId ───────────────────────────────────────────────────────
// Returns the latest snapshot + 90-day trend for a single rep.
// Auth: the rep themselves, or a manager in the same team.

async function handleRepDetail(req: Request, repId: string): Promise<Response> {
  const corsHeaders = { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  const user = await getAuthedUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const isSelf = user.id === repId
  const canView = isSelf || isManager(user)
  if (!canView) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
  }

  const db = adminClient()

  // Fetch last 90 days of snapshots for this rep
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: snapshots, error } = await db
    .from('rep_correlation_snapshots')
    .select('*')
    .eq('rep_id', repId)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true })

  if (error) {
    console.error('[correlation-engine] rep-detail query failed:', error.message)
    return new Response(JSON.stringify({ error: 'Query failed' }), { status: 500, headers: corsHeaders })
  }

  const rows = snapshots ?? []
  const latest = rows.length > 0 ? rows[rows.length - 1] : null

  // Trend: date-stamped overall scores for the sparkline
  const trend = rows.map(s => ({
    snapshot_date: s.snapshot_date,
    training_avg_overall: s.training_avg_overall,
    live_avg_overall: s.live_avg_overall,
    transfer_gap_overall: s.transfer_gap_overall,
  }))

  // Shape latest to match RepLatestSnapshot type in useTransferGap.ts
  const latestShaped = latest
    ? {
        org_id: latest.team_id,      // hook uses org_id — maps to team_id in our schema
        rep_id: latest.rep_id,
        snapshot_date: latest.snapshot_date,
        training_avg_overall: latest.training_avg_overall,
        live_avg_overall: latest.live_avg_overall,
        transfer_gap_overall: latest.transfer_gap_overall,
        talk_ratio_gap: latest.talk_ratio_gap,
        discovery_gap: latest.discovery_gap,
        engagement_gap: latest.engagement_gap,
        objection_handling_gap: latest.objection_handling_gap,
        pressure_regression: latest.pressure_regression,
        knowledge_decay_detected: latest.knowledge_decay_detected,
        decaying_dimensions: latest.decaying_dimensions,
        refresher_nudge_queued: latest.refresher_nudge_queued,
      }
    : null

  return new Response(
    JSON.stringify({ latest: latestShaped, trend }),
    { headers: corsHeaders }
  )
}

// ── Router ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const corsHeaders = { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    // Strip the function name prefix from the path
    const path = url.pathname.replace(/^\/correlation-engine/, '').replace(/\/$/, '')

    if (req.method === 'POST' && path === '/compute') {
      return await handleCompute(req)
    }

    if (req.method === 'GET' && path === '/training-efficacy') {
      return await handleTrainingEfficacy(req)
    }

    // GET /:repId
    const repMatch = path.match(/^\/([0-9a-f-]{36})$/)
    if (req.method === 'GET' && repMatch) {
      return await handleRepDetail(req, repMatch[1])
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[correlation-engine]', message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders })
  }
})
