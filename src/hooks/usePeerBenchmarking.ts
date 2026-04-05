import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { SKILL_BENCHMARKS, type SkillKey } from '../config/benchmarks';

// ── Constants (mirrors SQL function) ─────────────────────────────────────────

export const MIN_COHORT_SIZE = 3
export const TENURE_BANDS = ['0-6mo', '7-18mo', '19-36mo', '36+mo'] as const
export type TenureBand = typeof TENURE_BANDS[number]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillPercentile {
  skillName:      SkillKey
  skillLabel:     string
  repScore:       number | null
  percentileRank: number | null   // null = cohort_size < MIN_COHORT_SIZE
  cohortSize:     number
  jobRole:        string | null
  tenureBand:     string | null
  buckets:        [number, number, number, number, number]  // 0-20, 21-40, 41-60, 61-80, 81-100
}

// ── Pure helpers (exported for unit testing) ──────────────────────────────────

/**
 * Maps tenure_months to a tenure band string.
 * Must match the SQL tenure_band() function exactly.
 */
export function assignTenureBand(months: number | null): TenureBand | null {
  if (months === null) return null
  if (months <=  6)   return '0-6mo'
  if (months <= 18)   return '7-18mo'
  if (months <= 36)   return '19-36mo'
  return '36+mo'
}

/**
 * Returns 'top' if percentile >= 67 (top third),
 * 'bottom' if percentile <= 33 (bottom third), else 'mid'.
 */
export function percentileTier(rank: number): 'top' | 'mid' | 'bottom' {
  if (rank >= 67) return 'top'
  if (rank <= 33) return 'bottom'
  return 'mid'
}

/**
 * Builds the label shown on the percentile pill.
 * Top half → "Top N%", bottom half → "Bottom N%".
 */
export function percentileLabel(rank: number): string {
  if (rank >= 50) return `Top ${100 - Math.round(rank)}%`
  return `Bottom ${Math.round(rank) + 1}%`
}

/**
 * Computes the median of an array of numbers. Returns null for empty input.
 */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid    = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Computes per-skill median percentile across an array of SkillPercentile[].
 * Only includes skills where percentileRank is non-null.
 * Returns a Map<SkillKey, number | null>.
 */
export function computeTeamMedianPercentiles(
  allRepPercentiles: SkillPercentile[][],
): Map<SkillKey, number | null> {
  const skillRanks = new Map<SkillKey, number[]>()
  for (const repPercs of allRepPercentiles) {
    for (const p of repPercs) {
      if (p.percentileRank === null) continue
      if (!skillRanks.has(p.skillName)) skillRanks.set(p.skillName, [])
      skillRanks.get(p.skillName)!.push(p.percentileRank)
    }
  }
  const result = new Map<SkillKey, number | null>()
  for (const skill of SKILL_BENCHMARKS) {
    const ranks = skillRanks.get(skill.key) ?? []
    result.set(skill.key, median(ranks))
  }
  return result
}

// ── RPC row type ──────────────────────────────────────────────────────────────

interface RpcRow {
  skill_name:      string
  rep_score:       number | null
  percentile_rank: number | null
  cohort_size:     number
  job_role:        string | null
  tenure_band:     string | null
  bucket_0_20:     number
  bucket_21_40:    number
  bucket_41_60:    number
  bucket_61_80:    number
  bucket_81_100:   number
}

function rpcRowToPercentile(row: RpcRow): SkillPercentile {
  const meta = SKILL_BENCHMARKS.find(s => s.key === row.skill_name)
  return {
    skillName:      row.skill_name as SkillKey,
    skillLabel:     meta?.label ?? row.skill_name,
    repScore:       row.rep_score !== null ? Number(row.rep_score) : null,
    percentileRank: row.percentile_rank !== null ? Number(row.percentile_rank) : null,
    cohortSize:     Number(row.cohort_size),
    jobRole:        row.job_role,
    tenureBand:     row.tenure_band,
    buckets: [
      Number(row.bucket_0_20),
      Number(row.bucket_21_40),
      Number(row.bucket_41_60),
      Number(row.bucket_61_80),
      Number(row.bucket_81_100),
    ],
  }
}

// ── All-skills stub for skills with no RPC data ───────────────────────────────

function allSkillsStub(): SkillPercentile[] {
  return SKILL_BENCHMARKS.map(s => ({
    skillName:      s.key,
    skillLabel:     s.label,
    repScore:       null,
    percentileRank: null,
    cohortSize:     0,
    jobRole:        null,
    tenureBand:     null,
    buckets:        [0, 0, 0, 0, 0],
  }))
}

// ── usePeerBenchmarking ───────────────────────────────────────────────────────

async function fetchPeerBenchmarking(repId: string, days: number): Promise<SkillPercentile[]> {
  const { data, error } = await supabase.rpc('get_peer_percentiles', {
    p_rep_id: repId,
    p_days:   days,
  })
  if (error) throw error

  const rows = (data ?? []) as RpcRow[]
  if (rows.length === 0) return allSkillsStub()

  // Index by skill_name — RPC may not return all 7 skills (e.g. objection_handling)
  const bySkill = new Map(rows.map(r => [r.skill_name, r]))

  return SKILL_BENCHMARKS.map(s => {
    const row = bySkill.get(s.key)
    if (!row) {
      // No data for this skill — return stub row with first row's cohort metadata
      const meta = rows[0]
      return {
        skillName:      s.key,
        skillLabel:     s.label,
        repScore:       null,
        percentileRank: null,
        cohortSize:     0,
        jobRole:        meta.job_role,
        tenureBand:     meta.tenure_band,
        buckets:        [0, 0, 0, 0, 0],
      }
    }
    return rpcRowToPercentile(row)
  })
}

/** Returns the rep's peer percentile rankings across all skills. */
export function usePeerBenchmarking(repId: string | null, days: number) {
  return useQuery<SkillPercentile[]>({
    queryKey:  ['peer-benchmarking', repId, days],
    staleTime: 300_000,
    enabled:   repId !== null,
    queryFn:   () => fetchPeerBenchmarking(repId!, days),
  })
}

// ── useTeamPeerBenchmarking ───────────────────────────────────────────────────

async function fetchTeamPeerBenchmarking(
  days: number,
): Promise<Map<string, SkillPercentile[]>> {
  // Fetch all reps in the manager's team
  const { data: reps, error: repsErr } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('role', 'rep')

  if (repsErr) throw repsErr

  const repList = (reps ?? []) as { id: string; name: string | null; email: string }[]

  // Fetch percentiles for all reps in parallel
  const results = await Promise.all(
    repList.map(rep =>
      fetchPeerBenchmarking(rep.id, days)
        .then(percs => [rep.id, percs] as [string, SkillPercentile[]])
        .catch(() => [rep.id, allSkillsStub()] as [string, SkillPercentile[]])
    )
  )

  return new Map(results)
}

/** Returns a Map<repId, SkillPercentile[]> for all reps in the manager's team. */
export function useTeamPeerBenchmarking(days: number) {
  return useQuery<Map<string, SkillPercentile[]>>({
    queryKey:  ['team-peer-benchmarking', days],
    staleTime: 300_000,
    queryFn:   () => fetchTeamPeerBenchmarking(days),
  })
}
