import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  useSimPerformanceSnapshots,
  useOrgSimPerformanceAvg,
  METRIC_KEYS,
  METRIC_LABELS,
  METRIC_FORMAT,
  METRIC_DIRECTION,
  METRIC_FOCUS_TIPS,
  getMetricStatus,
  findWeakestMetric,
  type PeriodType,
  type MetricKey,
  type SimPerformanceScores,
} from '../../hooks/useSimPerformance'

const STATUS_COLORS = {
  good: '#10B981',
  watch: '#F59E0B',
  critical: '#FF6B6B',
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgb(var(--bg-surface-raised,28_28_31))] ${className}`} />
}

function Sparkline({ values, direction }: { values: (number | null)[]; direction: 'higher' | 'lower' }) {
  const nums = values.filter((v): v is number => v !== null)
  if (nums.length < 2) return null

  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const range = max - min || 1
  const h = 24
  const w = 60
  const step = w / (nums.length - 1)

  const points = nums.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ')
  const last = nums[nums.length - 1]
  const prev = nums[nums.length - 2]
  const improving = direction === 'higher' ? last >= prev : last <= prev

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={improving ? '#10B981' : '#FF6B6B'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface Props {
  userId: string | undefined
  compact?: boolean
}

export default function SimPerformanceCard({ userId, compact = false }: Props) {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const { data: snapshots, isLoading } = useSimPerformanceSnapshots(userId, periodType, 5)
  const { data: orgAvg } = useOrgSimPerformanceAvg(periodType)

  if (isLoading) {
    return (
      <div className="card-os border border-[rgb(var(--border-default))] p-6">
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    )
  }

  const current = snapshots?.[0] ?? null
  const scores = current?.scores as SimPerformanceScores | null

  if (!scores) {
    return (
      <div className="card-os border border-[rgb(var(--border-default))] p-6 text-center">
        <p className="text-[rgb(var(--text-muted))] text-sm">No simulation performance data yet. Complete some simulated calls to see your scores.</p>
      </div>
    )
  }

  const weakest = findWeakestMetric(scores)
  const historicalScores = (snapshots || []).slice(0, 5).reverse()

  return (
    <div className="card-os border border-[rgb(var(--border-default))] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))]">
            Simulation Performance
          </h3>
          {current && (
            <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
              {current.account_count} accounts · {current.call_count} calls · {current.period_start} to {current.period_end}
            </p>
          )}
        </div>
        {!compact && (
          <div className="flex gap-1 bg-[rgb(var(--bg-surface-raised))] p-0.5 rounded-[var(--radius-md)]">
            {(['weekly', 'monthly', 'quarterly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodType(p)}
                className={`px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-all ${
                  periodType === p
                    ? 'bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-primary))] shadow-sm'
                    : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {METRIC_KEYS.map((key) => {
          const value = scores[key]
          if (value === null) return null
          const status = getMetricStatus(key, value)
          const orgVal = orgAvg?.[key] ?? null
          const trendValues = historicalScores.map(
            (s) => ((s.scores as SimPerformanceScores)[key]) ?? null,
          )

          return (
            <div key={key} className="group">
              <div className="flex items-center gap-3">
                <div className="w-[140px] shrink-0">
                  <span className="text-xs text-[rgb(var(--text-secondary))]">
                    {METRIC_LABELS[key]}
                  </span>
                </div>
                <div className="flex-1 h-6 bg-[rgb(var(--bg-surface-raised))] relative overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${getBarWidth(key, value)}%`,
                      backgroundColor: STATUS_COLORS[status],
                    }}
                  />
                  {orgVal !== null && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-[rgb(var(--text-muted))] opacity-50"
                      style={{ left: `${getBarWidth(key, orgVal)}%` }}
                      title={`Org avg: ${METRIC_FORMAT[key](orgVal)}`}
                    />
                  )}
                </div>
                <div className="w-[72px] text-right shrink-0">
                  <span
                    className="text-sm font-mono font-medium"
                    style={{ color: STATUS_COLORS[status] }}
                  >
                    {METRIC_FORMAT[key](value)}
                  </span>
                </div>
                {!compact && (
                  <div className="w-[60px] shrink-0">
                    <Sparkline values={trendValues} direction={METRIC_DIRECTION[key]} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {weakest && getMetricStatus(weakest, scores[weakest]!) !== 'good' && (
        <div className="mt-5 p-3 border border-[rgb(var(--accent-primary))]/20 bg-[rgb(var(--accent-primary))]/5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[rgb(var(--accent-primary))] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-[rgb(var(--accent-primary))]">
              Focus area: {METRIC_LABELS[weakest]}
            </p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">
              {METRIC_FOCUS_TIPS[weakest]}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function getBarWidth(key: MetricKey, value: number): number {
  switch (key) {
    case 'stage_progression_rate':
    case 'commitment_follow_through':
    case 'objection_resolution_rate':
    case 'simulated_conversion_rate':
      return Math.min(100, Math.round(value * 100))
    case 'credibility_maintenance':
      return Math.min(100, value)
    case 'rapport_building_speed':
      return Math.min(100, Math.max(5, 100 - (value / 10) * 100))
    case 'avg_sentiment_trajectory':
      return Math.min(100, Math.max(5, ((value + 30) / 60) * 100))
    default:
      return 50
  }
}
