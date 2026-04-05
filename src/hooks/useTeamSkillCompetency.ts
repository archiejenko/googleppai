import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { SKILL_BENCHMARKS, type SkillKey, type DataQuality } from '../config/benchmarks';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeddicScores {
  metrics?: number
  economicBuyer?: number
  decisionCriteria?: number
  decisionProcess?: number
  identifyPain?: number
  champion?: number
}

interface PitchRow {
  user_id: string
  score: number | null
  confidence_score: number | null
  pace_score: number | null
  clarity_score: number | null
  analysis: { meddicScores?: MeddicScores } | null
  created_at: string
}

export interface SkillCompetencyResult {
  key: SkillKey
  label: string
  benchmark: number
  teamAvg: number | null            // null = insufficient data
  prevTeamAvg: number | null        // null = insufficient data for previous period
  delta: number | null              // teamAvg - prevTeamAvg; null if either is null
  dataQuality: DataQuality
  repsWithData: number              // how many reps contributed data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) return v
  return null
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Extract per-skill scores from a single pitch row.
 * Returns a map of SkillKey → score (0-100) for skills that have data.
 * Skills with no extractable data are omitted from the map.
 *
 * Mapping rationale (documented in src/config/benchmarks.ts):
 *   discovery_questioning   ← meddicScores.identifyPain  (proxy)
 *   objection_handling      ← no current data source
 *   value_articulation      ← clarity_score              (proxy)
 *   closing_commitment      ← meddicScores.decisionProcess (proxy)
 *   active_listening        ← confidence_score           (proxy)
 *   meddic_qualification    ← avg of all 6 meddicScores  (direct)
 *   champion_building       ← meddicScores.champion      (direct)
 */
function extractSkillScores(pitch: PitchRow): Partial<Record<SkillKey, number>> {
  const m = pitch.analysis?.meddicScores ?? {}
  const result: Partial<Record<SkillKey, number>> = {}

  const identifyPain       = safeNum(m.identifyPain)
  const champion           = safeNum(m.champion)
  const decisionProcess    = safeNum(m.decisionProcess)
  const metrics            = safeNum(m.metrics)
  const economicBuyer      = safeNum(m.economicBuyer)
  const decisionCriteria   = safeNum(m.decisionCriteria)
  const clarityScore       = safeNum(pitch.clarity_score)
  const confidenceScore    = safeNum(pitch.confidence_score)

  if (identifyPain !== null) {
    result['discovery_questioning'] = identifyPain
  }

  // objection_handling: intentionally omitted — no usable proxy
  // It will appear as dataQuality='none' in the component

  if (clarityScore !== null) {
    result['value_articulation'] = clarityScore
  }

  if (decisionProcess !== null) {
    result['closing_commitment'] = decisionProcess
  }

  if (confidenceScore !== null) {
    result['active_listening'] = confidenceScore
  }

  // MEDDIC Qualification: avg of all available MEDDIC sub-scores
  const meddicVals = [metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion]
    .filter((v): v is number => v !== null)
  const meddicAvg = avg(meddicVals)
  if (meddicAvg !== null) {
    result['meddic_qualification'] = meddicAvg
  }

  if (champion !== null) {
    result['champion_building'] = champion
  }

  return result
}

// ── Query function ────────────────────────────────────────────────────────────

async function fetchTeamPitches(period: 'current' | 'previous', days: number): Promise<PitchRow[]> {
  const now = Date.now()
  const periodMs = days * 86_400_000

  const since = new Date(now - (period === 'current' ? periodMs : periodMs * 2)).toISOString()
  const until = period === 'current' ? undefined : new Date(now - periodMs).toISOString()

  let query = supabase
    .from('pitches')
    .select('user_id, score, confidence_score, pace_score, clarity_score, analysis, created_at')
    .gte('created_at', since)

  if (until) {
    query = query.lt('created_at', until)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as PitchRow[]) ?? []
}

/**
 * Aggregate pitch rows into per-skill team averages.
 * Returns map of SkillKey → { avg, repsWithData }.
 */
function aggregateSkills(
  pitches: PitchRow[]
): Map<SkillKey, { values: number[]; repIds: Set<string> }> {
  const acc = new Map<SkillKey, { values: number[]; repIds: Set<string> }>()

  for (const skill of SKILL_BENCHMARKS) {
    acc.set(skill.key, { values: [], repIds: new Set() })
  }

  for (const pitch of pitches) {
    const scores = extractSkillScores(pitch)
    for (const [key, score] of Object.entries(scores) as [SkillKey, number][]) {
      const bucket = acc.get(key)
      if (bucket) {
        bucket.values.push(score)
        bucket.repIds.add(pitch.user_id)
      }
    }
  }

  return acc
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches team-wide skill competency averages for the manager dashboard.
 * Requires RLS to allow the caller (team_lead/admin) to see team pitches —
 * covered by "Team Leads can view team pitches" policy from security_remediation.
 *
 * @param days  Lookback window in days (default 30)
 */
export function useTeamSkillCompetency(days = 30) {
  return useQuery<SkillCompetencyResult[]>({
    queryKey: ['team-skill-competency', days],
    staleTime: 300_000,
    queryFn: async () => {
      const [currentPitches, prevPitches] = await Promise.all([
        fetchTeamPitches('current', days),
        fetchTeamPitches('previous', days),
      ])

      const currentAcc = aggregateSkills(currentPitches)
      const prevAcc    = aggregateSkills(prevPitches)

      return SKILL_BENCHMARKS.map(skill => {
        const cur  = currentAcc.get(skill.key)!
        const prev = prevAcc.get(skill.key)!

        const teamAvg     = avg(cur.values)
        const prevTeamAvg = avg(prev.values)
        const delta       = teamAvg !== null && prevTeamAvg !== null
          ? teamAvg - prevTeamAvg
          : null

        return {
          key:          skill.key,
          label:        skill.label,
          benchmark:    skill.benchmark,
          teamAvg,
          prevTeamAvg,
          delta,
          dataQuality:  skill.dataQuality,
          repsWithData: cur.repIds.size,
        }
      })
    },
  })
}
