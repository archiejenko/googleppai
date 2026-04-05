import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

// ── Constants (mirrors Edge Function) ────────────────────────────────────────

export const READINESS_SESSION_BENCHMARK = 3
export const READINESS_GAP_MAX           = 50
export const READINESS_TREND_THRESHOLD   = 5

export const READINESS_WEIGHTS = {
  skill_avg:         0.25,
  gap_inverted:      0.30,
  call_score_trend:  0.20,
  session_frequency: 0.15,
  retention_rate:    0.10,
} as const

export type ReadinessBand = 'Not Ready' | 'Developing' | 'Ready' | 'Exceptional'

export const BAND_ORDER: ReadinessBand[] = ['Exceptional', 'Ready', 'Developing', 'Not Ready']

export const BAND_COLOR: Record<ReadinessBand, string> = {
  Exceptional: '#10B981',
  Ready:       '#6366F1',
  Developing:  '#F59E0B',
  'Not Ready': '#FF6B6B',
}

// ── Factor metadata ───────────────────────────────────────────────────────────

export interface FactorMeta {
  key:         keyof typeof READINESS_WEIGHTS
  label:       string
  weight:      number    // 0–1
  explanation: (score: number) => string
}

export const FACTOR_META: FactorMeta[] = [
  {
    key:    'skill_avg',
    label:  'Skill Average',
    weight: READINESS_WEIGHTS.skill_avg,
    explanation: s => s < 60
      ? 'Training simulation scores are below the threshold for effective transfer to live calls.'
      : 'Training scores are solid.',
  },
  {
    key:    'gap_inverted',
    label:  'Transfer Gap',
    weight: READINESS_WEIGHTS.gap_inverted,
    explanation: s => s < 60
      ? 'A significant gap exists between training performance and live call scores.'
      : 'Training is transferring well to live calls.',
  },
  {
    key:    'call_score_trend',
    label:  'Live Score Trend',
    weight: READINESS_WEIGHTS.call_score_trend,
    explanation: s => s < 50
      ? 'Recent live call scores are declining — readiness may be deteriorating.'
      : s >= 100
      ? 'Live call scores are on an improving trend.'
      : 'Live call scores are stable.',
  },
  {
    key:    'session_frequency',
    label:  'Session Frequency',
    weight: READINESS_WEIGHTS.session_frequency,
    explanation: s => s < 60
      ? `Training volume is below the ${READINESS_SESSION_BENCHMARK} sessions/week benchmark.`
      : 'Training frequency meets or exceeds the benchmark.',
  },
  {
    key:    'retention_rate',
    label:  'Score Retention',
    weight: READINESS_WEIGHTS.retention_rate,
    explanation: s => s < 60
      ? 'Scores are declining across repeated attempts — knowledge is not sticking.'
      : 'Scores are being retained across attempts.',
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReadinessFactors {
  skill_avg:         number
  gap_inverted:      number
  call_score_trend:  number
  session_frequency: number
  retention_rate:    number
}

export interface FactorBreakdown {
  key:          keyof ReadinessFactors
  label:        string
  inputScore:   number   // 0–100 factor score before weighting
  contribution: number   // inputScore * weight
  weight:       number   // 0–1
  explanation:  string   // drag explanation shown if inputScore < 60
}

export interface RepReadiness {
  repId:       string
  repName:     string
  score:       number | null
  band:        ReadinessBand | null
  factors:     FactorBreakdown[]
  dragFactor:  FactorBreakdown | null   // lowest inputScore factor
  snapshotDate: string
}

// ── Pure helpers (exported for unit testing) ──────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Assigns a readiness band from a composite score.
 * Not Ready <40, Developing 40–59, Ready 60–79, Exceptional 80+
 */
export function assignBand(score: number): ReadinessBand {
  if (score >= 80) return 'Exceptional'
  if (score >= 60) return 'Ready'
  if (score >= 40) return 'Developing'
  return 'Not Ready'
}

/**
 * Computes per-factor breakdowns from the stored factors JSONB.
 * Null factor values default to 50 (neutral — same as Edge Function).
 */
export function buildFactorBreakdowns(factors: Partial<ReadinessFactors>): FactorBreakdown[] {
  return FACTOR_META.map(meta => {
    const inputScore = factors[meta.key] !== undefined && factors[meta.key] !== null
      ? clamp(factors[meta.key]!, 0, 100)
      : 50
    return {
      key:          meta.key,
      label:        meta.label,
      inputScore,
      contribution: inputScore * meta.weight,
      weight:       meta.weight,
      explanation:  meta.explanation(inputScore),
    }
  })
}

/**
 * Identifies the drag factor — the factor with the lowest inputScore.
 * Returns null only if all factors are at 100 (fully optimised).
 */
export function findDragFactor(breakdowns: FactorBreakdown[]): FactorBreakdown | null {
  if (breakdowns.length === 0) return null
  const lowest = breakdowns.reduce((a, b) => b.inputScore < a.inputScore ? b : a)
  return lowest.inputScore < 100 ? lowest : null
}

/**
 * Builds a full RepReadiness record from a snapshot row + profile name.
 * Exported for use in tests without needing to render anything.
 */
export function buildRepReadiness(
  repId:        string,
  repName:      string,
  score:        number | null,
  band:         string | null,
  factorsJson:  Partial<ReadinessFactors> | null,
  snapshotDate: string,
): RepReadiness {
  const breakdowns = buildFactorBreakdowns(factorsJson ?? {})
  const safeBand   = (band as ReadinessBand | null) ?? (score !== null ? assignBand(score) : null)

  return {
    repId,
    repName,
    score,
    band: safeBand,
    factors: breakdowns,
    dragFactor: findDragFactor(breakdowns),
    snapshotDate,
  }
}

// ── Row types ─────────────────────────────────────────────────────────────────

interface SnapshotRow {
  rep_id:                 string
  snapshot_date:          string
  role_readiness_score:   number | null
  role_readiness_band:    string | null
  role_readiness_factors: Partial<ReadinessFactors> | null
  profiles:               { name: string | null; email: string } | null
}

// ── useRoleReadiness ──────────────────────────────────────────────────────────

async function fetchRoleReadiness(days: number): Promise<RepReadiness[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('rep_correlation_snapshots')
    .select(`
      rep_id, snapshot_date,
      role_readiness_score, role_readiness_band, role_readiness_factors,
      profiles!rep_correlation_snapshots_rep_id_fkey(name, email)
    `)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as unknown as SnapshotRow[]

  // Deduplicate: keep only the latest snapshot per rep
  const latestByRep = new Map<string, SnapshotRow>()
  for (const row of rows) {
    if (!latestByRep.has(row.rep_id)) latestByRep.set(row.rep_id, row)
  }

  return [...latestByRep.values()]
    .map(row => {
      const profile = row.profiles
      const name    = profile?.name ?? profile?.email?.split('@')[0] ?? 'Unknown'
      return buildRepReadiness(
        row.rep_id,
        name,
        row.role_readiness_score !== undefined ? row.role_readiness_score : null,
        row.role_readiness_band ?? null,
        row.role_readiness_factors ?? null,
        row.snapshot_date,
      )
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))  // highest score first
}

/** Returns all reps' latest readiness scores, sorted highest first. */
export function useRoleReadiness(days: number) {
  return useQuery<RepReadiness[]>({
    queryKey:  ['role-readiness', days],
    staleTime: 300_000,
    queryFn:   () => fetchRoleReadiness(days),
  })
}

// ── useRepRoleReadiness ───────────────────────────────────────────────────────

async function fetchRepRoleReadiness(repId: string, days: number): Promise<RepReadiness | null> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('rep_correlation_snapshots')
    .select(`
      rep_id, snapshot_date,
      role_readiness_score, role_readiness_band, role_readiness_factors,
      profiles!rep_correlation_snapshots_rep_id_fkey(name, email)
    `)
    .eq('rep_id', repId)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null  // no rows
    throw error
  }

  const row     = data as unknown as SnapshotRow
  const profile = row.profiles
  const name    = profile?.name ?? profile?.email?.split('@')[0] ?? 'Unknown'

  return buildRepReadiness(
    row.rep_id,
    name,
    row.role_readiness_score !== undefined ? row.role_readiness_score : null,
    row.role_readiness_band ?? null,
    row.role_readiness_factors ?? null,
    row.snapshot_date,
  )
}

/** Returns a single rep's latest readiness snapshot with factor breakdowns. */
export function useRepRoleReadiness(repId: string | null, days: number) {
  return useQuery<RepReadiness | null>({
    queryKey: ['rep-role-readiness', repId, days],
    staleTime: 300_000,
    enabled:  repId !== null,
    queryFn:  () => fetchRepRoleReadiness(repId!, days),
  })
}
