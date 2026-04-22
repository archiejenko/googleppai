import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface SimPerformanceScores {
  stage_progression_rate: number | null
  credibility_maintenance: number | null
  commitment_follow_through: number | null
  objection_resolution_rate: number | null
  rapport_building_speed: number | null
  simulated_conversion_rate: number | null
  avg_sentiment_trajectory: number | null
}

export interface PerformanceSnapshot {
  id: string
  org_id: string
  user_id: string
  period_type: string
  period_start: string
  period_end: string
  scores: SimPerformanceScores
  account_count: number
  call_count: number
  created_at: string
}

export type PeriodType = 'weekly' | 'monthly' | 'quarterly'

export const METRIC_KEYS = [
  'stage_progression_rate',
  'credibility_maintenance',
  'commitment_follow_through',
  'objection_resolution_rate',
  'rapport_building_speed',
  'simulated_conversion_rate',
  'avg_sentiment_trajectory',
] as const

export type MetricKey = typeof METRIC_KEYS[number]

export const METRIC_LABELS: Record<MetricKey, string> = {
  stage_progression_rate: 'Stage Progression',
  credibility_maintenance: 'Credibility',
  commitment_follow_through: 'Follow-Through',
  objection_resolution_rate: 'Objection Handling',
  rapport_building_speed: 'Rapport Speed',
  simulated_conversion_rate: 'Conversion Rate',
  avg_sentiment_trajectory: 'Sentiment Trend',
}

export const METRIC_FORMAT: Record<MetricKey, (v: number) => string> = {
  stage_progression_rate: (v) => `${Math.round(v * 100)}%`,
  credibility_maintenance: (v) => v.toFixed(0),
  commitment_follow_through: (v) => `${Math.round(v * 100)}%`,
  objection_resolution_rate: (v) => `${Math.round(v * 100)}%`,
  rapport_building_speed: (v) => `${v.toFixed(1)} calls`,
  simulated_conversion_rate: (v) => `${Math.round(v * 100)}%`,
  avg_sentiment_trajectory: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
}

// Higher is better for all except rapport_building_speed (lower is better)
export const METRIC_DIRECTION: Record<MetricKey, 'higher' | 'lower'> = {
  stage_progression_rate: 'higher',
  credibility_maintenance: 'higher',
  commitment_follow_through: 'higher',
  objection_resolution_rate: 'higher',
  rapport_building_speed: 'lower',
  simulated_conversion_rate: 'higher',
  avg_sentiment_trajectory: 'higher',
}

export const METRIC_THRESHOLDS: Record<MetricKey, { good: number; watch: number }> = {
  stage_progression_rate: { good: 0.6, watch: 0.4 },
  credibility_maintenance: { good: 65, watch: 45 },
  commitment_follow_through: { good: 0.75, watch: 0.5 },
  objection_resolution_rate: { good: 0.6, watch: 0.4 },
  rapport_building_speed: { good: 3, watch: 5 },
  simulated_conversion_rate: { good: 0.4, watch: 0.2 },
  avg_sentiment_trajectory: { good: 3, watch: 0 },
}

export const METRIC_FOCUS_TIPS: Record<MetricKey, string> = {
  stage_progression_rate: 'Focus on qualifying and advancing conversations with clear next steps.',
  credibility_maintenance: 'Follow through on promises and demonstrate domain expertise.',
  commitment_follow_through: 'Track and fulfil every commitment made during calls.',
  objection_resolution_rate: 'Practise acknowledging objections before responding with evidence.',
  rapport_building_speed: 'Ask discovery questions and listen actively from the first call.',
  simulated_conversion_rate: 'Work on closing techniques and trial close throughout the process.',
  avg_sentiment_trajectory: 'Focus on leaving buyers feeling heard and valued each interaction.',
}

export function getMetricStatus(key: MetricKey, value: number): 'good' | 'watch' | 'critical' {
  const t = METRIC_THRESHOLDS[key]
  if (METRIC_DIRECTION[key] === 'lower') {
    if (value <= t.good) return 'good'
    if (value <= t.watch) return 'watch'
    return 'critical'
  }
  if (value >= t.good) return 'good'
  if (value >= t.watch) return 'watch'
  return 'critical'
}

export function useSimPerformanceSnapshots(
  userId: string | undefined,
  periodType: PeriodType,
  limit = 5,
) {
  return useQuery<PerformanceSnapshot[]>({
    queryKey: ['sim-performance', userId, periodType, limit],
    enabled: !!userId,
    staleTime: 300_000,
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('rep_performance_snapshots')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data || []) as PerformanceSnapshot[]
    },
  })
}

export function useOrgSimPerformanceAvg(periodType: PeriodType) {
  return useQuery<SimPerformanceScores | null>({
    queryKey: ['sim-performance-org-avg', periodType],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rep_performance_snapshots')
        .select('scores')
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(100)
      if (error) throw error
      if (!data || data.length === 0) return null

      // Get only the most recent period_start
      const latest = data as PerformanceSnapshot[]
      const latestPeriod = latest[0]?.period_start
      const currentPeriod = latest.filter((s) => s.period_start === latestPeriod)
      if (currentPeriod.length === 0) return null

      const avg: SimPerformanceScores = {
        stage_progression_rate: null,
        credibility_maintenance: null,
        commitment_follow_through: null,
        objection_resolution_rate: null,
        rapport_building_speed: null,
        simulated_conversion_rate: null,
        avg_sentiment_trajectory: null,
      }

      for (const key of METRIC_KEYS) {
        const values = currentPeriod
          .map((s) => (s.scores as SimPerformanceScores)[key])
          .filter((v): v is number => v !== null)
        if (values.length > 0) {
          avg[key] = values.reduce((a, b) => a + b, 0) / values.length
        }
      }

      return avg
    },
  })
}

export function computePercentile(
  value: number,
  allValues: number[],
  direction: 'higher' | 'lower',
): number {
  if (allValues.length === 0) return 50
  const below = allValues.filter((v) =>
    direction === 'higher' ? v < value : v > value,
  ).length
  return Math.round((below / allValues.length) * 100)
}

export function findWeakestMetric(scores: SimPerformanceScores): MetricKey | null {
  let worst: MetricKey | null = null
  let worstStatus: 'good' | 'watch' | 'critical' = 'good'
  let worstDelta = Infinity

  for (const key of METRIC_KEYS) {
    const val = scores[key]
    if (val === null) continue
    const status = getMetricStatus(key, val)
    const t = METRIC_THRESHOLDS[key]
    const delta = METRIC_DIRECTION[key] === 'lower'
      ? val - t.good
      : t.good - val

    const statusRank = { critical: 0, watch: 1, good: 2 }
    if (
      statusRank[status] < statusRank[worstStatus] ||
      (statusRank[status] === statusRank[worstStatus] && delta > worstDelta)
    ) {
      worst = key
      worstStatus = status
      worstDelta = delta
    }
  }

  return worst
}
