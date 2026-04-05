import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────

export const PASS_THRESHOLD    = 70
export const HARD_AVG_ATTEMPTS = 2.5   // avg attempts to pass > this → hard scenario

// Display labels for raw meddicScores keys (fail_point values)
export const FAIL_POINT_LABELS: Record<string, string> = {
  identifyPain:     'Discovery & Questioning',
  champion:         'Champion Building',
  decisionProcess:  'Closing & Commitment',
  metrics:          'MEDDIC — Metrics',
  economicBuyer:    'MEDDIC — Economic Buyer',
  decisionCriteria: 'MEDDIC — Decision Criteria',
  clarity_score:    'Value Articulation',
  confidence_score: 'Active Listening',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Trajectory = 'improving' | 'plateauing' | 'declining'

export interface ScenarioDifficulty {
  scenarioId:          string
  scenarioName:        string
  difficultyLabel:     string   // from training_sessions.difficulty
  avgAttemptsToPass:   number
  passRate:            number   // 0–1
  mostCommonFailPoint: string | null
  failPointLabel:      string | null
  repCount:            number
  isHard:              boolean
}

export interface AttemptRecord {
  attemptNumber: number
  score:         number | null
  passed:        boolean
  failPoint:     string | null
  failPointLabel: string | null
  attemptedAt:   string
}

export interface RepScenarioHistory {
  scenarioId:    string
  scenarioName:  string
  attempts:      AttemptRecord[]
  trajectory:    Trajectory
  bestScore:     number | null
  everPassed:    boolean
}

// ── Pure helpers (exported for unit testing) ──────────────────────────────────

/**
 * Computes attempt trajectory from a chronologically-ordered list of scores.
 * Compares the mean of the second half of attempts against the first half.
 * - improving:  second-half mean > first-half mean + 3pts
 * - declining:  second-half mean < first-half mean - 3pts
 * - plateauing: otherwise (includes single-attempt case)
 */
export function computeTrajectory(scores: number[]): Trajectory {
  if (scores.length < 2) return 'plateauing'
  const mid    = Math.floor(scores.length / 2)
  const first  = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid
  const second = scores.slice(mid)
  const secondMean = second.reduce((a, b) => a + b, 0) / second.length
  const delta = secondMean - first
  if (delta > 3)  return 'improving'
  if (delta < -3) return 'declining'
  return 'plateauing'
}

/**
 * Given a list of per-rep attempt counts and whether they passed,
 * computes avg_attempts_to_pass using first-pass attempt for passers
 * and total_attempts for non-passers (conservative estimate).
 */
export function computeAvgAttemptsToPass(
  repSummaries: { firstPassAttempt: number | null; totalAttempts: number }[]
): number {
  if (repSummaries.length === 0) return 0
  const total = repSummaries.reduce(
    (acc, r) => acc + (r.firstPassAttempt ?? r.totalAttempts),
    0
  )
  return total / repSummaries.length
}

// ── Row types ─────────────────────────────────────────────────────────────────

interface AttemptRow {
  scenario_id:    string
  rep_id:         string
  attempt_number: number
  score:          number | null
  fail_point:     string | null
  passed:         boolean
  attempted_at:   string
  training_sessions: {
    scenario:   string
    difficulty: string
  } | null
}

// ── useScenarioDifficulty ─────────────────────────────────────────────────────

async function fetchScenarioDifficulty(days: number): Promise<ScenarioDifficulty[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('training_attempts')
    .select(`
      scenario_id, rep_id, attempt_number, score, fail_point, passed, attempted_at,
      training_sessions!training_attempts_scenario_id_fkey(scenario, difficulty)
    `)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as AttemptRow[]

  // Group by scenario
  const scenarioMap = new Map<string, {
    meta:     { scenario: string; difficulty: string }
    repData:  Map<string, { attempts: AttemptRow[]; firstPass: number | null }>
    failPoints: string[]
  }>()

  for (const row of rows) {
    if (!scenarioMap.has(row.scenario_id)) {
      scenarioMap.set(row.scenario_id, {
        meta:      row.training_sessions ?? { scenario: 'Unknown', difficulty: '' },
        repData:   new Map(),
        failPoints: [],
      })
    }
    const sc = scenarioMap.get(row.scenario_id)!

    if (!sc.repData.has(row.rep_id)) {
      sc.repData.set(row.rep_id, { attempts: [], firstPass: null })
    }
    const rep = sc.repData.get(row.rep_id)!
    rep.attempts.push(row)

    if (row.passed && rep.firstPass === null) {
      rep.firstPass = row.attempt_number
    }

    if (row.fail_point) sc.failPoints.push(row.fail_point)
  }

  const result: ScenarioDifficulty[] = []

  for (const [scenarioId, sc] of scenarioMap) {
    const reps     = [...sc.repData.values()]
    const repCount = reps.length
    const avgAttempts = computeAvgAttemptsToPass(
      reps.map(r => ({
        firstPassAttempt: r.firstPass,
        totalAttempts:    r.attempts.length,
      }))
    )

    const passRate = repCount > 0
      ? reps.filter(r => r.firstPass !== null).length / repCount
      : 0

    // Most common fail point
    const fpCounts = new Map<string, number>()
    for (const fp of sc.failPoints) fpCounts.set(fp, (fpCounts.get(fp) ?? 0) + 1)
    const mostCommonFP = fpCounts.size > 0
      ? [...fpCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null

    result.push({
      scenarioId,
      scenarioName:        sc.meta.scenario,
      difficultyLabel:     sc.meta.difficulty,
      avgAttemptsToPass:   avgAttempts,
      passRate,
      mostCommonFailPoint: mostCommonFP,
      failPointLabel:      mostCommonFP ? (FAIL_POINT_LABELS[mostCommonFP] ?? mostCommonFP) : null,
      repCount,
      isHard:              avgAttempts > HARD_AVG_ATTEMPTS,
    })
  }

  // Sort by difficulty descending (hardest first)
  result.sort((a, b) => b.avgAttemptsToPass - a.avgAttemptsToPass)

  return result
}

/** Returns scenarios sorted by difficulty score descending (hardest first). */
export function useScenarioDifficulty(days: number) {
  return useQuery<ScenarioDifficulty[]>({
    queryKey: ['scenario-difficulty', days],
    staleTime: 300_000,
    queryFn:  () => fetchScenarioDifficulty(days),
  })
}

// ── useRepAttemptHistory ──────────────────────────────────────────────────────

async function fetchRepAttemptHistory(
  repId: string,
  days:  number
): Promise<RepScenarioHistory[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('training_attempts')
    .select(`
      scenario_id, rep_id, attempt_number, score, fail_point, passed, attempted_at,
      training_sessions!training_attempts_scenario_id_fkey(scenario, difficulty)
    `)
    .eq('rep_id', repId)
    .gte('attempted_at', since)
    .order('attempt_number', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as AttemptRow[]

  const scenarioMap = new Map<string, {
    meta:     { scenario: string; difficulty: string }
    attempts: AttemptRecord[]
  }>()

  for (const row of rows) {
    if (!scenarioMap.has(row.scenario_id)) {
      scenarioMap.set(row.scenario_id, {
        meta:     row.training_sessions ?? { scenario: 'Unknown', difficulty: '' },
        attempts: [],
      })
    }
    scenarioMap.get(row.scenario_id)!.attempts.push({
      attemptNumber: row.attempt_number,
      score:         row.score,
      passed:        row.passed,
      failPoint:     row.fail_point,
      failPointLabel: row.fail_point ? (FAIL_POINT_LABELS[row.fail_point] ?? row.fail_point) : null,
      attemptedAt:   row.attempted_at,
    })
  }

  return [...scenarioMap.entries()].map(([scenarioId, sc]) => {
    const scores = sc.attempts.map(a => a.score).filter((s): s is number => s !== null)
    const bestScore = scores.length > 0 ? Math.max(...scores) : null
    const everPassed = sc.attempts.some(a => a.passed)

    return {
      scenarioId,
      scenarioName:  sc.meta.scenario,
      attempts:      sc.attempts,
      trajectory:    computeTrajectory(scores),
      bestScore,
      everPassed,
    }
  })
}

/** Returns a rep's attempt history per scenario with trajectory analysis. */
export function useRepAttemptHistory(repId: string | null, days: number) {
  return useQuery<RepScenarioHistory[]>({
    queryKey: ['rep-attempt-history', repId, days],
    staleTime: 300_000,
    enabled:  repId !== null,
    queryFn:  () => fetchRepAttemptHistory(repId!, days),
  })
}
