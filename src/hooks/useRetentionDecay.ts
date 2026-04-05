import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { type SkillKey } from '../config/benchmarks';

// ── Bucket definitions ────────────────────────────────────────────────────────

interface Bucket {
  key: 'day0' | 'day7' | 'day30'
  label: string
  chartDay: number  // x-axis value
  minDays: number
  maxDays: number
}

const BUCKETS: Bucket[] = [
  { key: 'day0',  label: 'Post-training',  chartDay: 0,  minDays: 0,  maxDays: 2  },
  { key: 'day7',  label: 'Day 7',          chartDay: 7,  minDays: 5,  maxDays: 9  },
  { key: 'day30', label: 'Day 30',         chartDay: 30, minDays: 25, maxDays: 35 },
]

const DECAY_ALERT_THRESHOLD = 15  // pts drop day0 → day30 triggers alert
const MIN_REPS_FOR_TEAM_AVG = 2   // fewer than this → team average is null (gap)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RepDecayProfile {
  repId:   string
  repName: string
  day0:    number | null
  day7:    number | null
  day30:   number | null
  hasAlert: boolean  // day0 - day30 > DECAY_ALERT_THRESHOLD, both non-null
}

export interface DecayChartPoint {
  day:      number           // 0, 7, or 30
  label:    string           // 'Post-training', 'Day 7', 'Day 30'
  teamAvg:  number | null    // null when < MIN_REPS_FOR_TEAM_AVG have data at this bucket
  [repId: string]: number | null | string | undefined
}

export interface RetentionDecayData {
  chartPoints:    DecayChartPoint[]     // 3 points, always present
  reps:           RepDecayProfile[]
  decayAlerts:    RepDecayProfile[]     // reps with hasAlert=true, sorted by severity
  selectedSkill:  SkillKey
  hasAnyData:     boolean
}

// ── Skill extraction (mirrors useTeamSkillCompetency logic) ──────────────────

interface MeddicScores {
  metrics?: number; economicBuyer?: number; decisionCriteria?: number
  decisionProcess?: number; identifyPain?: number; champion?: number
}

interface PitchRow {
  training_session_id: string
  user_id: string
  score: number | null
  confidence_score: number | null
  clarity_score: number | null
  analysis: { meddicScores?: MeddicScores } | null
  created_at: string
}

interface SessionRow {
  id: string
  user_id: string
  completed_at: string | null
  created_at: string
}

function safeNum(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) return v
  return null
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function extractSkillScore(pitch: PitchRow, skill: SkillKey): number | null {
  const m = pitch.analysis?.meddicScores ?? {}

  switch (skill) {
    case 'discovery_questioning':
      return safeNum(m.identifyPain)

    case 'objection_handling':
      return null  // no source yet

    case 'value_articulation':
      return safeNum(pitch.clarity_score)

    case 'closing_commitment':
      return safeNum(m.decisionProcess)

    case 'active_listening':
      return safeNum(pitch.confidence_score)

    case 'meddic_qualification': {
      const vals = [m.metrics, m.economicBuyer, m.decisionCriteria, m.decisionProcess, m.identifyPain, m.champion]
        .map(safeNum)
        .filter((v): v is number => v !== null)
      return avg(vals)
    }

    case 'champion_building':
      return safeNum(m.champion)

    default:
      return null
  }
}

// ── Query function ────────────────────────────────────────────────────────────

async function fetchDecayData(
  days: number,
  skill: SkillKey
): Promise<RetentionDecayData> {
  // Sessions window: the `days` period controls which sessions are included.
  // Pitches for day-30 retention could be up to 35 days after session completion,
  // so we don't restrict pitches by date — we fetch all pitches for the matched sessions.
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  // 1. Fetch completed training sessions within the window.
  // Use completed_at if available, fall back to created_at (backfill from migration).
  const { data: sessions, error: sessErr } = await supabase
    .from('training_sessions')
    .select('id, user_id, completed_at, created_at')
    .eq('completed', true)
    .gte('created_at', since)   // use created_at for filtering (always populated)

  if (sessErr) throw sessErr
  if (!sessions || sessions.length === 0) {
    return emptyResult(skill)
  }

  const sessionIds = (sessions as SessionRow[]).map(s => s.id)

  // 2. Fetch all pitches for these sessions (no date restriction — retention pitches
  //    can arrive up to 35 days after session completion)
  const { data: pitches, error: pitchErr } = await supabase
    .from('pitches')
    .select('training_session_id, user_id, score, confidence_score, clarity_score, analysis, created_at')
    .in('training_session_id', sessionIds)
    .not('score', 'is', null)

  if (pitchErr) throw pitchErr

  // 3. Fetch rep profiles for names
  const repIds = [...new Set((sessions as SessionRow[]).map(s => s.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', repIds)

  const nameMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    nameMap.set(p.id, (p as { id: string; name: string | null; email: string }).name
      || (p as { id: string; name: string | null; email: string }).email?.split('@')[0]
      || 'Unknown')
  }

  // 4. Build session → completedAt map (coalesce completed_at || created_at)
  const sessionCompletedAt = new Map<string, number>()
  for (const s of sessions as SessionRow[]) {
    const ts = new Date(s.completed_at ?? s.created_at).getTime()
    sessionCompletedAt.set(s.id, ts)
  }

  // 5. Build per-rep accumulator: repId → bucketKey → skill scores[]
  type BucketKey = 'day0' | 'day7' | 'day30'
  const repBuckets = new Map<string, Record<BucketKey, number[]>>()

  for (const repId of repIds) {
    repBuckets.set(repId, { day0: [], day7: [], day30: [] })
  }

  for (const pitch of (pitches as PitchRow[]) ?? []) {
    const sessionTs = sessionCompletedAt.get(pitch.training_session_id)
    if (sessionTs === undefined) continue

    const score = extractSkillScore(pitch, skill)
    if (score === null) continue

    const pitchTs  = new Date(pitch.created_at).getTime()
    const elapsedDays = (pitchTs - sessionTs) / 86_400_000

    const bucket = BUCKETS.find(b => elapsedDays >= b.minDays && elapsedDays <= b.maxDays)
    if (!bucket) continue

    const repBucket = repBuckets.get(pitch.user_id)
    if (repBucket) repBucket[bucket.key].push(score)
  }

  // 6. Compute per-rep summary
  const reps: RepDecayProfile[] = []

  for (const repId of repIds) {
    const buckets = repBuckets.get(repId)!
    const day0  = avg(buckets.day0)
    const day7  = avg(buckets.day7)
    const day30 = avg(buckets.day30)
    const hasAlert = day0 !== null && day30 !== null && (day0 - day30) > DECAY_ALERT_THRESHOLD

    reps.push({
      repId,
      repName: nameMap.get(repId) ?? 'Unknown',
      day0, day7, day30,
      hasAlert,
    })
  }

  // 7. Compute team average per bucket (require MIN_REPS_FOR_TEAM_AVG)
  const teamBuckets = {
    day0:  reps.map(r => r.day0).filter((v): v is number => v !== null),
    day7:  reps.map(r => r.day7).filter((v): v is number => v !== null),
    day30: reps.map(r => r.day30).filter((v): v is number => v !== null),
  }

  const teamAvg = {
    day0:  teamBuckets.day0.length  >= MIN_REPS_FOR_TEAM_AVG ? avg(teamBuckets.day0)  : null,
    day7:  teamBuckets.day7.length  >= MIN_REPS_FOR_TEAM_AVG ? avg(teamBuckets.day7)  : null,
    day30: teamBuckets.day30.length >= MIN_REPS_FOR_TEAM_AVG ? avg(teamBuckets.day30) : null,
  }

  // 8. Build chart points (3 fixed x-axis positions)
  const chartPoints: DecayChartPoint[] = BUCKETS.map(b => {
    const point: DecayChartPoint = {
      day:     b.chartDay,
      label:   b.label,
      teamAvg: teamAvg[b.key],
    }
    // Embed per-rep scores so Recharts Line can reference them by repId key
    for (const rep of reps) {
      point[rep.repId] = rep[b.key]
    }
    return point
  })

  // 9. Sort decay alerts by severity (largest drop first)
  const decayAlerts = reps
    .filter(r => r.hasAlert)
    .sort((a, b) => {
      const dropA = (a.day0 ?? 0) - (a.day30 ?? 0)
      const dropB = (b.day0 ?? 0) - (b.day30 ?? 0)
      return dropB - dropA
    })

  const hasAnyData = reps.some(r => r.day0 !== null || r.day7 !== null || r.day30 !== null)

  return { chartPoints, reps, decayAlerts, selectedSkill: skill, hasAnyData }
}

function emptyResult(skill: SkillKey): RetentionDecayData {
  return {
    chartPoints: BUCKETS.map(b => ({ day: b.chartDay, label: b.label, teamAvg: null })),
    reps: [],
    decayAlerts: [],
    selectedSkill: skill,
    hasAnyData: false,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRetentionDecay(days: number, skill: SkillKey) {
  return useQuery<RetentionDecayData>({
    queryKey: ['retention-decay', days, skill],
    staleTime: 300_000,
    queryFn: () => fetchDecayData(days, skill),
  })
}
