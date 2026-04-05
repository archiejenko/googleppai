/**
 * useOnboardingAcceleration — X3
 *
 * Tracks new reps (tenure < 6 months) trajectory to reaching 80% of team
 * average call score. Shows weeks ahead/behind the benchmark onboarding curve.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RepScorePoint {
  date: string
  score: number
}

export type OnboardingStatus = 'proficient' | 'ahead' | 'behind' | 'insufficient_data'

export interface RepOnboardingData {
  rep_id: string
  rep_name: string
  tenure_months: number
  current_score: number | null
  target_score: number          // 80% of team avg
  progress_pct: number          // current_score / target_score (capped 0–100)
  projected_date: string | null // ISO date string or null
  weeks_vs_benchmark: number | null // positive = ahead, negative = behind
  status: OnboardingStatus
  score_trend: RepScorePoint[]  // chronological call scores
}

export interface OnboardingAccelerationData {
  reps: RepOnboardingData[]
  team_avg_score: number
  target_score: number           // 80% of team avg
  benchmark_curve: RepScorePoint[] // avg trajectory of completed onboardings
}

// ── Pure functions (exported for tests) ──────────────────────────────────────

/**
 * Simple linear regression: returns slope and intercept.
 * x = index (0, 1, 2…), y = score values.
 */
export function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }
  const xs = ys.map((_, i) => i)
  const xMean = xs.reduce((a, b) => a + b, 0) / n
  const yMean = ys.reduce((a, b) => a + b, 0) / n
  const num   = xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0)
  const den   = xs.reduce((acc, x)    => acc + (x - xMean) ** 2, 0)
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: yMean - slope * xMean }
}

/**
 * Projects the x-index at which y crosses threshold.
 * Returns null if already above or slope is non-positive (will never cross).
 */
export function projectThresholdIndex(
  ys: number[],
  threshold: number,
): number | null {
  const { slope, intercept } = linearRegression(ys)
  if (slope <= 0) return null
  const idx = (threshold - intercept) / slope
  return idx <= ys.length - 1 ? null : idx  // already there or in the future
}

/**
 * Converts a projected x-index offset to a calendar date.
 * lastDate: ISO date of the last data point
 * indexesPerDay: how many scores are recorded per day (approximation)
 */
export function projectThresholdDate(
  scores: RepScorePoint[],
  threshold: number,
  avgDaysBetweenScores = 7,
): string | null {
  if (!scores.length) return null
  const ys = scores.map(s => s.score)
  const lastScore = ys[ys.length - 1]

  // Already above threshold
  if (lastScore >= threshold) return null

  const projIdx = projectThresholdIndex(ys, threshold)
  if (projIdx === null) return null

  const stepsAhead = projIdx - (ys.length - 1)
  const daysAhead  = Math.round(stepsAhead * avgDaysBetweenScores)
  const lastDate   = new Date(scores[scores.length - 1].date)
  const projected  = new Date(lastDate.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  return projected.toISOString().split('T')[0]
}

/**
 * Determines onboarding status.
 * alreadyProficient: current score >= target
 * projectedDate: null when score won't reach threshold with current trajectory
 */
export function computeOnboardingStatus(
  currentScore: number | null,
  targetScore: number,
  scoreCount: number,
): OnboardingStatus {
  if (scoreCount < 4)                              return 'insufficient_data'
  if (currentScore != null && currentScore >= targetScore) return 'proficient'
  return 'behind'  // refined to 'ahead' when compared against benchmark
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useOnboardingAcceleration(targetRepId?: string) {
  return useQuery({
    queryKey: ['onboarding-acceleration', targetRepId ?? 'all'],
    queryFn: async (): Promise<OnboardingAccelerationData> => {
      // 1. Fetch reps with tenure_months set
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, name, tenure_months')
        .not('tenure_months', 'is', null)
        .order('tenure_months', { ascending: true })
      if (pErr) throw pErr

      const allProfiles = (profiles ?? []) as { id: string; name: string; tenure_months: number }[]
      const newReps     = allProfiles.filter(p => p.tenure_months < 6)
      const vetReps     = allProfiles.filter(p => p.tenure_months >= 6)

      // Scoping: if targetRepId provided, filter to just that rep
      const repsToProcess = targetRepId
        ? newReps.filter(r => r.id === targetRepId)
        : newReps

      // 2. Team average from latest snapshots (veteran reps only)
      let teamAvgScore = 0
      if (vetReps.length) {
        const vetIds = vetReps.map(r => r.id)
        const { data: vetSnaps } = await supabase
          .from('rep_correlation_snapshots')
          .select('rep_id, live_avg_overall, snapshot_date')
          .in('rep_id', vetIds)
          .order('snapshot_date', { ascending: false })

        const latestByRep: Record<string, number> = {}
        for (const s of vetSnaps ?? []) {
          if (!latestByRep[s.rep_id] && s.live_avg_overall != null) {
            latestByRep[s.rep_id] = Number(s.live_avg_overall)
          }
        }
        const vals = Object.values(latestByRep)
        if (vals.length) teamAvgScore = vals.reduce((a, b) => a + b, 0) / vals.length
      }

      const targetScore = teamAvgScore * 0.8

      // 3. Fetch live call scores for new reps (chronological)
      const newRepIds = repsToProcess.map(r => r.id)
      let scoreTrends: Record<string, RepScorePoint[]> = {}

      if (newRepIds.length) {
        const { data: liveRows } = await supabase
          .from('live_scores')
          .select('rep_id, composite_score, call_started_at')
          .in('rep_id', newRepIds)
          .not('composite_score', 'is', null)
          .order('call_started_at', { ascending: true })

        for (const r of liveRows ?? []) {
          if (!scoreTrends[r.rep_id]) scoreTrends[r.rep_id] = []
          scoreTrends[r.rep_id].push({
            date:  r.call_started_at.split('T')[0],
            score: Number(r.composite_score),
          })
        }
      }

      // 4. Benchmark curve — avg trajectory of veteran reps during their first 6 months
      //    Proxied as average live_avg_overall progression over their snapshots
      const benchmarkCurve: RepScorePoint[] = []
      if (vetReps.length) {
        const vetIds = vetReps.map(r => r.id)
        const { data: vetSnapsAll } = await supabase
          .from('rep_correlation_snapshots')
          .select('rep_id, live_avg_overall, snapshot_date')
          .in('rep_id', vetIds)
          .order('snapshot_date', { ascending: true })

        // Average by month offset (0–5)
        const byOffset: Record<number, number[]> = {}
        const profileMap: Record<string, string> = {}
        for (const p of vetReps) profileMap[p.id] = p.id

        // Group by rep, compute offset from first snapshot
        const firstSnapByRep: Record<string, string> = {}
        for (const s of vetSnapsAll ?? []) {
          if (!firstSnapByRep[s.rep_id]) firstSnapByRep[s.rep_id] = s.snapshot_date
        }

        for (const s of vetSnapsAll ?? []) {
          if (s.live_avg_overall == null) continue
          const firstDate = new Date(firstSnapByRep[s.rep_id]).getTime()
          const thisDate  = new Date(s.snapshot_date).getTime()
          const monthOffset = Math.floor((thisDate - firstDate) / (30 * 24 * 60 * 60 * 1000))
          if (monthOffset < 0 || monthOffset > 6) continue
          if (!byOffset[monthOffset]) byOffset[monthOffset] = []
          byOffset[monthOffset].push(Number(s.live_avg_overall))
        }

        for (let m = 0; m <= 6; m++) {
          if (byOffset[m]?.length) {
            const avg = byOffset[m].reduce((a, b) => a + b, 0) / byOffset[m].length
            benchmarkCurve.push({ date: `month_${m}`, score: avg })
          }
        }
      }

      // Benchmark duration in weeks (from curve)
      const benchmarkWeeks = benchmarkCurve.length > 1
        ? benchmarkCurve.length * 4  // each point ≈ 1 month
        : null

      // 5. Build per-rep data
      const reps: RepOnboardingData[] = repsToProcess.map(p => {
        const trend   = scoreTrends[p.id] ?? []
        const scores  = trend.map(t => t.score)
        const current = scores.length ? scores[scores.length - 1] : null
        const progPct = current != null && targetScore > 0
          ? Math.min(100, (current / targetScore) * 100)
          : 0

        // Proficiency: check if current >= target
        const isProficient = current != null && current >= targetScore
        const dateOfProficiency = isProficient
          ? trend.find(t => t.score >= targetScore)?.date ?? null
          : null

        // Project date if not proficient and enough data
        const projDate = isProficient
          ? null
          : trend.length >= 4
            ? projectThresholdDate(trend, targetScore)
            : null

        // Weeks vs benchmark
        let weeksVsBenchmark: number | null = null
        if (benchmarkWeeks && projDate) {
          const today = new Date().getTime()
          const proj  = new Date(projDate).getTime()
          const weeksToProj = (proj - today) / (7 * 24 * 60 * 60 * 1000)
          weeksVsBenchmark = benchmarkWeeks - weeksToProj  // positive = ahead
        }

        let status: OnboardingStatus = computeOnboardingStatus(current, targetScore, scores.length)
        if (status === 'behind' && weeksVsBenchmark != null && weeksVsBenchmark > 0) status = 'ahead'

        return {
          rep_id: p.id,
          rep_name: p.name,
          tenure_months: p.tenure_months,
          current_score: current,
          target_score: targetScore,
          progress_pct: progPct,
          projected_date: isProficient ? dateOfProficiency : projDate,
          weeks_vs_benchmark: weeksVsBenchmark,
          status: isProficient ? 'proficient' : status,
          score_trend: trend,
        }
      })

      return { reps, team_avg_score: teamAvgScore, target_score: targetScore, benchmark_curve: benchmarkCurve }
    },
    staleTime: 10 * 60_000,
  })
}
