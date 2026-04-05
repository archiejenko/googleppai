import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { SKILL_BENCHMARKS, type SkillKey } from '../config/benchmarks';

// Re-export shape used by the expanded row component
export interface RepSkillScore {
  key:        SkillKey
  label:      string
  repScore:   number | null
  teamAvg:    number | null   // passed in from useTeamSkillCompetency, not re-fetched
}

// ── Internal helpers (shared logic with useTeamSkillCompetency) ───────────────

interface MeddicScores {
  metrics?: number
  economicBuyer?: number
  decisionCriteria?: number
  decisionProcess?: number
  identifyPain?: number
  champion?: number
}

interface PitchRow {
  score: number | null
  confidence_score: number | null
  clarity_score: number | null
  analysis: { meddicScores?: MeddicScores } | null
}

function safeNum(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) return v
  return null
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function extractSkillScores(pitch: PitchRow): Partial<Record<SkillKey, number>> {
  const m = pitch.analysis?.meddicScores ?? {}
  const result: Partial<Record<SkillKey, number>> = {}

  const identifyPain    = safeNum(m.identifyPain)
  const champion        = safeNum(m.champion)
  const decisionProcess = safeNum(m.decisionProcess)
  const metrics         = safeNum(m.metrics)
  const economicBuyer   = safeNum(m.economicBuyer)
  const decisionCriteria = safeNum(m.decisionCriteria)
  const clarityScore    = safeNum(pitch.clarity_score)
  const confidenceScore = safeNum(pitch.confidence_score)

  if (identifyPain !== null)    result['discovery_questioning'] = identifyPain
  if (clarityScore !== null)    result['value_articulation']    = clarityScore
  if (decisionProcess !== null) result['closing_commitment']    = decisionProcess
  if (confidenceScore !== null) result['active_listening']      = confidenceScore

  const meddicVals = [metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion]
    .filter((v): v is number => v !== null)
  const meddicAvg = avg(meddicVals)
  if (meddicAvg !== null) result['meddic_qualification'] = meddicAvg
  if (champion !== null)  result['champion_building']    = champion

  return result
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Per-rep skill score breakdown for the inline expansion row in RepPerformanceMatrix.
 * Fetches only pitches for this rep — team_lead RLS allows this.
 * Team averages are passed in from the parent's useTeamSkillCompetency call
 * (React Query already has them cached; we don't re-fetch).
 *
 * @param repId       UUID of the rep to fetch
 * @param days        Lookback window (matches the shared period toggle)
 * @param teamAvgMap  Map of SkillKey → teamAvg from useTeamSkillCompetency
 */
export function useRepSkillBreakdown(
  repId: string | null,
  days: number,
  teamAvgMap: Map<SkillKey, number | null>
) {
  return useQuery<RepSkillScore[]>({
    queryKey: ['rep-skill-breakdown', repId, days],
    enabled: !!repId,
    staleTime: 300_000,
    queryFn: async () => {
      if (!repId) return []

      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data: pitches, error } = await supabase
        .from('pitches')
        .select('score, confidence_score, clarity_score, analysis')
        .eq('user_id', repId)
        .not('score', 'is', null)
        .gte('created_at', since)

      if (error) throw error

      // Aggregate per skill across all pitches
      const acc = new Map<SkillKey, number[]>()
      for (const skill of SKILL_BENCHMARKS) acc.set(skill.key, [])

      for (const pitch of (pitches as PitchRow[]) ?? []) {
        const scores = extractSkillScores(pitch)
        for (const [key, score] of Object.entries(scores) as [SkillKey, number][]) {
          acc.get(key)?.push(score)
        }
      }

      return SKILL_BENCHMARKS.map(skill => ({
        key:      skill.key,
        label:    skill.label,
        repScore: avg(acc.get(skill.key) ?? []),
        teamAvg:  teamAvgMap.get(skill.key) ?? null,
      }))
    },
  })
}
