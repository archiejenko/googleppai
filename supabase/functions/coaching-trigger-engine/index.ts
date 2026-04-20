/**
 * OAST: Coaching Trigger Engine — T7
 *
 * Detects three coaching triggers per rep and inserts into coaching_triggers.
 * Deduplication: INSERT WHERE NOT EXISTS — resolved triggers remain in history
 * and can be re-fired; only unresolved duplicates are suppressed.
 *
 * Triggers:
 *   skill_decay       — T4 bucket logic: day0 vs day30 retention drop > 15pts, per skill
 *   live_score_drop   — latest snapshot > 10pts below 30-day rolling avg
 *   gap_widening      — transfer_gap_overall increased > 5pts week-over-week
 *
 * Runs at 02:30 UTC daily (30 min after pain-point-engine).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Constants ─────────────────────────────────────────────────────────────────

const SKILL_DECAY_THRESHOLD   = 15   // pts drop day0→day30 to fire trigger
const LIVE_DROP_THRESHOLD     = 10   // pts below 30-day rolling avg
const GAP_WIDEN_THRESHOLD     = 5    // pts increase week-over-week
const GAP_CRITICAL_THRESHOLD  = 25   // pts transfer gap → critical severity

// Bucket definitions (mirrors T4 useRetentionDecay)
const BUCKETS = [
  { key: 'day0',  minDays: 0,  maxDays: 2  },
  { key: 'day30', minDays: 25, maxDays: 35 },
] as const

// Skills that have data sources (mirrors benchmarks.ts dataQuality !== 'none')
const SCORABLE_SKILLS = [
  { key: 'meddic_qualification', extract: (a: MeddicScores) => avgMeddic(a) },
  { key: 'champion_building',    extract: (a: MeddicScores) => safeNum(a.champion) },
  { key: 'discovery_questioning',extract: (a: MeddicScores) => safeNum(a.identifyPain) },
  { key: 'value_articulation',   extract: (_: MeddicScores, p: PitchRow) => safeNum(p.clarity_score) },
  { key: 'active_listening',     extract: (_: MeddicScores, p: PitchRow) => safeNum(p.confidence_score) },
  { key: 'closing_commitment',   extract: (a: MeddicScores) => safeNum(a.decisionProcess) },
] as const

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeddicScores {
  metrics?: number; economicBuyer?: number; decisionCriteria?: number
  decisionProcess?: number; identifyPain?: number; champion?: number
}

interface PitchRow {
  training_session_id: string
  user_id:             string
  score:               number | null
  confidence_score:    number | null
  clarity_score:       number | null
  analysis:            { meddicScores?: MeddicScores } | null
  created_at:          string
}

interface SessionRow {
  id:           string
  user_id:      string
  completed_at: string | null
  created_at:   string
}

interface SnapshotRow {
  rep_id:                 string
  snapshot_date:          string
  transfer_gap_overall:   number | null
  live_avg_overall:       number | null
}

interface TriggerPayload {
  org_id:       string
  rep_id:       string
  manager_id:   string | null
  trigger_type: 'skill_decay' | 'live_score_drop' | 'gap_widening'
  skill_name:   string | null
  severity:     'critical' | 'warning'
  trigger_data: Record<string, unknown>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) return v
  return null
}

function avgMeddic(m: MeddicScores): number | null {
  const vals = [m.metrics, m.economicBuyer, m.decisionCriteria, m.decisionProcess, m.identifyPain, m.champion]
    .map(safeNum).filter((v): v is number => v !== null)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/**
 * Checks whether an unresolved trigger already exists for (rep_id, trigger_type, skill_name).
 * Returns true if a duplicate exists (should skip insert).
 */
async function duplicateExists(
  supabase:    SupabaseClient,
  repId:       string,
  triggerType: string,
  skillName:   string | null
): Promise<boolean> {
  let query = supabase
    .from('coaching_triggers')
    .select('id', { count: 'exact', head: true })
    .eq('rep_id', repId)
    .eq('trigger_type', triggerType)
    .is('resolved_at', null)

  if (skillName !== null) {
    query = query.eq('skill_name', skillName)
  } else {
    query = query.is('skill_name', null)
  }

  const { count } = await query
  return (count ?? 0) > 0
}

// ── Detector: skill_decay ─────────────────────────────────────────────────────

async function detectSkillDecay(
  supabase:    SupabaseClient,
  orgId:       string,
  repIds:      string[],
  managerId:   string | null,
  sessions:    SessionRow[],
  pitches:     PitchRow[]
): Promise<TriggerPayload[]> {
  const triggers: TriggerPayload[] = []
  const now = Date.now()

  // Build session→completedAt map
  const sessionCompletedAt = new Map<string, number>()
  for (const s of sessions) {
    sessionCompletedAt.set(s.id, new Date(s.completed_at ?? s.created_at).getTime())
  }

  // Per-rep, per-skill bucket accumulators
  type BucketKey = 'day0' | 'day30'
  const repSkillBuckets = new Map<string, Map<string, Record<BucketKey, number[]>>>()

  for (const repId of repIds) {
    repSkillBuckets.set(repId, new Map())
    for (const skill of SCORABLE_SKILLS) {
      repSkillBuckets.get(repId)!.set(skill.key, { day0: [], day30: [] })
    }
  }

  for (const pitch of pitches) {
    const sessionTs = sessionCompletedAt.get(pitch.training_session_id)
    if (sessionTs === undefined) continue

    const pitchTs     = new Date(pitch.created_at).getTime()
    const elapsedDays = (pitchTs - sessionTs) / 86_400_000
    const meddic      = pitch.analysis?.meddicScores ?? {}

    for (const skill of SCORABLE_SKILLS) {
      const score = skill.extract(meddic as MeddicScores, pitch)
      if (score === null) continue

      const bucket = BUCKETS.find(b => elapsedDays >= b.minDays && elapsedDays <= b.maxDays)
      if (!bucket) continue

      const repMap = repSkillBuckets.get(pitch.user_id)
      if (!repMap) continue
      repMap.get(skill.key)?.[bucket.key].push(score)
    }
  }

  // Fire triggers for reps with > 15pt decay (day0 → day30)
  for (const repId of repIds) {
    const skillMap = repSkillBuckets.get(repId)!
    for (const skill of SCORABLE_SKILLS) {
      const buckets = skillMap.get(skill.key)!
      const day0  = avg(buckets.day0)
      const day30 = avg(buckets.day30)

      if (day0 === null || day30 === null) continue
      const drop = day0 - day30
      if (drop <= SKILL_DECAY_THRESHOLD) continue

      // Deduplication
      if (await duplicateExists(supabase, repId, 'skill_decay', skill.key)) continue

      triggers.push({
        org_id:       orgId,
        rep_id:       repId,
        manager_id:   managerId,
        trigger_type: 'skill_decay',
        skill_name:   skill.key,
        severity:     drop > 25 ? 'critical' : 'warning',
        trigger_data: {
          skill_key:   skill.key,
          day0_score:  Math.round(day0 * 10) / 10,
          day30_score: Math.round(day30 * 10) / 10,
          drop_pts:    Math.round(drop * 10) / 10,
          bucket_sizes: { day0: buckets.day0.length, day30: buckets.day30.length },
        },
      })
    }
  }

  return triggers
}

// ── Detector: live_score_drop ─────────────────────────────────────────────────

async function detectLiveScoreDrop(
  supabase:  SupabaseClient,
  orgId:     string,
  repIds:    string[],
  managerId: string | null,
  snapshots: SnapshotRow[]
): Promise<TriggerPayload[]> {
  const triggers: TriggerPayload[] = []
  const today = toDateStr(new Date())

  // Group snapshots per rep, sorted ascending (already ordered by query)
  const repSnaps = new Map<string, SnapshotRow[]>()
  for (const repId of repIds) repSnaps.set(repId, [])
  for (const snap of snapshots) repSnaps.get(snap.rep_id)?.push(snap)

  const cutoff30 = toDateStr(addDays(new Date(), -30))

  for (const repId of repIds) {
    const snaps = repSnaps.get(repId) ?? []
    if (snaps.length < 2) continue

    const latest = snaps[snaps.length - 1]
    if (latest.live_avg_overall === null) continue

    // 30-day rolling avg: snapshots within the last 30 days (excluding latest)
    const window30 = snaps
      .filter(s => s.snapshot_date >= cutoff30 && s.snapshot_date < latest.snapshot_date)
      .map(s => s.live_avg_overall)
      .filter((v): v is number => v !== null)

    if (window30.length === 0) continue

    const rollingAvg = avg(window30)!
    const drop = rollingAvg - latest.live_avg_overall
    if (drop <= LIVE_DROP_THRESHOLD) continue

    if (await duplicateExists(supabase, repId, 'live_score_drop', null)) continue

    triggers.push({
      org_id:       orgId,
      rep_id:       repId,
      manager_id:   managerId,
      trigger_type: 'live_score_drop',
      skill_name:   null,
      severity:     drop > 20 ? 'critical' : 'warning',
      trigger_data: {
        latest_score:   Math.round(latest.live_avg_overall * 10) / 10,
        rolling_avg_30d: Math.round(rollingAvg * 10) / 10,
        drop_pts:        Math.round(drop * 10) / 10,
        snapshot_date:   latest.snapshot_date,
        window_size:     window30.length,
      },
    })
  }

  return triggers
}

// ── Detector: gap_widening ────────────────────────────────────────────────────

async function detectGapWidening(
  supabase:  SupabaseClient,
  orgId:     string,
  repIds:    string[],
  managerId: string | null,
  snapshots: SnapshotRow[]
): Promise<TriggerPayload[]> {
  const triggers: TriggerPayload[] = []
  const cutoff7 = toDateStr(addDays(new Date(), -9))   // ±2 day tolerance for "7 days ago"
  const cutoff7Upper = toDateStr(addDays(new Date(), -5))

  const repSnaps = new Map<string, SnapshotRow[]>()
  for (const repId of repIds) repSnaps.set(repId, [])
  for (const snap of snapshots) repSnaps.get(snap.rep_id)?.push(snap)

  for (const repId of repIds) {
    const snaps = repSnaps.get(repId) ?? []
    if (snaps.length < 2) continue

    const latest = snaps[snaps.length - 1]
    if (latest.transfer_gap_overall === null) continue

    // Find the snapshot closest to 7 days ago (within ±2 day window)
    const weekAgoSnap = snaps
      .filter(s => s.snapshot_date >= cutoff7 && s.snapshot_date <= cutoff7Upper)
      .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0]

    if (!weekAgoSnap || weekAgoSnap.transfer_gap_overall === null) continue

    const widening = latest.transfer_gap_overall - weekAgoSnap.transfer_gap_overall
    if (widening <= GAP_WIDEN_THRESHOLD) continue

    if (await duplicateExists(supabase, repId, 'gap_widening', null)) continue

    const severity: 'critical' | 'warning' =
      latest.transfer_gap_overall > GAP_CRITICAL_THRESHOLD ? 'critical' : 'warning'

    triggers.push({
      org_id:       orgId,
      rep_id:       repId,
      manager_id:   managerId,
      trigger_type: 'gap_widening',
      skill_name:   null,
      severity,
      trigger_data: {
        current_gap:     Math.round(latest.transfer_gap_overall * 10) / 10,
        prior_gap:       Math.round(weekAgoSnap.transfer_gap_overall * 10) / 10,
        widening_pts:    Math.round(widening * 10) / 10,
        snapshot_date:   latest.snapshot_date,
        prior_snap_date: weekAgoSnap.snapshot_date,
      },
    })
  }

  return triggers
}

// ── Per-org orchestration ─────────────────────────────────────────────────────

async function processOrg(supabase: SupabaseClient, orgId: string): Promise<number> {
  const since90 = addDays(new Date(), -90).toISOString()

  // Fetch rep profiles for this org
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('team_id', orgId)

  const repIds     = (profiles ?? []).filter((p: { id: string; role: string }) => p.role === 'rep').map((p: { id: string }) => p.id)
  const managerRow = (profiles ?? []).find((p: { role: string }) => p.role === 'team_lead' || p.role === 'admin') as { id: string } | undefined
  const managerId  = managerRow?.id ?? null

  if (repIds.length === 0) return 0

  // Fetch training sessions (90-day window for bucket analysis)
  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('id, user_id, completed_at, created_at')
    .eq('completed', true)
    .in('user_id', repIds)
    .gte('created_at', since90)
    .order('created_at', { ascending: true })

  const sessionList = (sessions ?? []) as SessionRow[]
  const sessionIds  = sessionList.map(s => s.id)

  // Fetch pitches for skill decay
  let pitches: PitchRow[] = []
  if (sessionIds.length > 0) {
    const { data: p } = await supabase
      .from('pitches')
      .select('training_session_id, user_id, score, confidence_score, clarity_score, analysis, created_at')
      .in('training_session_id', sessionIds)
      .order('created_at', { ascending: true })
    pitches = (p ?? []) as PitchRow[]
  }

  // Fetch snapshots for live_score_drop + gap_widening
  const { data: snapshots } = await supabase
    .from('rep_correlation_snapshots')
    .select('rep_id, snapshot_date, transfer_gap_overall, live_avg_overall')
    .in('rep_id', repIds)
    .gte('snapshot_date', since90.slice(0, 10))
    .order('snapshot_date', { ascending: true })

  const snapshotList = (snapshots ?? []) as SnapshotRow[]

  // Run detectors in parallel
  const [decayTriggers, liveDrop, gapWide] = await Promise.all([
    detectSkillDecay(supabase, orgId, repIds, managerId, sessionList, pitches),
    detectLiveScoreDrop(supabase, orgId, repIds, managerId, snapshotList),
    detectGapWidening(supabase, orgId, repIds, managerId, snapshotList),
  ])

  const allTriggers = [...decayTriggers, ...liveDrop, ...gapWide]
  if (allTriggers.length === 0) return 0

  const { error } = await supabase.from('coaching_triggers').insert(allTriggers)
  if (error) throw error

  return allTriggers.length
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: orgs, error: orgErr } = await supabase
      .from('profiles')
      .select('team_id')
      .not('team_id', 'is', null)

    if (orgErr) throw orgErr

    const orgIds = [...new Set((orgs ?? []).map((o: { team_id: string }) => o.team_id))]

    const results = await Promise.allSettled(orgIds.map(id => processOrg(supabase, id)))
    const failed  = results.filter(r => r.status === 'rejected')
    if (failed.length > 0) {
      console.error('Orgs failed:', failed.map(f => (f as PromiseRejectedResult).reason))
    }

    const totalInserted = results
      .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
      .reduce((acc, r) => acc + r.value, 0)

    return new Response(
      JSON.stringify({ processed: orgIds.length, triggers_inserted: totalInserted, failed: failed.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Coaching trigger engine error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
