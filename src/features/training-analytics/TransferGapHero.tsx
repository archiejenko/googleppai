import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, TrendingUp, Minus, Users, Brain, Zap } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  useTransferGapEfficacy,
  useTransferGapTeam,
  useTransferGapRepDetail,
  type TeamRepRow,
  type RepTrendPoint,
} from '../../hooks/useTransferGap';

// ── Design tokens ────────────────────────────────────────────────────────────

const GAP_GREEN  = '#10B981'   // gap < 10
const GAP_AMBER  = '#F59E0B'   // gap 10–20
const GAP_CORAL  = '#FF6B6B'   // gap > 20

function gapColor(gap: number | null): string {
  if (gap === null) return 'rgb(var(--text-muted))'
  if (gap < 10)  return GAP_GREEN
  if (gap <= 20) return GAP_AMBER
  return GAP_CORAL
}

function gapLabel(gap: number | null): string {
  if (gap === null) return 'No data'
  if (gap < 10)  return 'Healthy'
  if (gap <= 20) return 'Watch'
  return 'Critical'
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[rgb(var(--bg-surface-raised,28_28_31))] ${className}`}
    />
  )
}

// ── Sparkline per rep ────────────────────────────────────────────────────────
// Each sparkline fetches its own trend data. React Query deduplicates + caches
// so concurrent fetches for the same repId collapse into one request.

interface RepSparklineProps {
  rep: TeamRepRow
  delay: number
}

function RepSparkline({ rep, delay }: RepSparklineProps) {
  const { data, isLoading } = useTransferGapRepDetail(rep.rep_id)

  const trend: RepTrendPoint[] = data?.trend ?? []
  const color = gapColor(rep.transfer_gap_overall)

  // Normalise for Recharts: keep only points that have a non-null gap
  const chartData = trend
    .filter(p => p.transfer_gap_overall !== null)
    .map(p => ({
      date: p.snapshot_date,
      gap: p.transfer_gap_overall,
    }))

  const hasTrend = chartData.length >= 2

  // Direction arrow: compare last two points
  const lastTwo = chartData.slice(-2)
  const direction =
    lastTwo.length < 2 ? 'flat'
    : lastTwo[1].gap > lastTwo[0].gap ? 'worsening'   // gap growing = bad
    : lastTwo[1].gap < lastTwo[0].gap ? 'improving'
    : 'flat'

  const DirIcon =
    direction === 'improving' ? TrendingDown    // gap shrinking = good
    : direction === 'worsening' ? TrendingUp    // gap growing = bad
    : Minus

  const dirColor =
    direction === 'improving' ? GAP_GREEN
    : direction === 'worsening' ? GAP_CORAL
    : 'rgb(var(--text-muted))'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-4 flex flex-col gap-3"
      style={{
        borderLeftWidth: rep.transfer_gap_overall > 20 ? 3 : 1,
        borderLeftColor: rep.transfer_gap_overall > 20 ? GAP_CORAL : undefined,
      }}
    >
      {/* Rep name + status badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[rgb(var(--text-primary))] truncate">
          {rep.rep_name}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 shrink-0"
          style={{ color, backgroundColor: `${color}18` }}
        >
          {gapLabel(rep.transfer_gap_overall)}
        </span>
      </div>

      {/* Gap number + direction */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <span
            className="text-2xl font-black leading-none tracking-tight"
            style={{ fontFamily: 'Oswald, sans-serif', color }}
          >
            {rep.transfer_gap_overall !== null
              ? `${rep.transfer_gap_overall > 0 ? '+' : ''}${Math.round(rep.transfer_gap_overall)}`
              : '—'}
          </span>
          <span className="text-xs text-[rgb(var(--text-muted))] ml-1">pts gap</span>
        </div>
        <DirIcon className="w-4 h-4 shrink-0" style={{ color: dirColor }} />
      </div>

      {/* Flag pills */}
      {(rep.knowledge_decay_detected || rep.pressure_regression) && (
        <div className="flex flex-wrap gap-1">
          {rep.knowledge_decay_detected && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#F59E0B18] text-[#F59E0B] uppercase tracking-wide">
              Decay
            </span>
          )}
          {rep.pressure_regression && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#FF6B6B18] text-[#FF6B6B] uppercase tracking-wide">
              Regression
            </span>
          )}
        </div>
      )}

      {/* 8-week sparkline */}
      <div className="h-12 w-full">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : hasTrend ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              {/* Reference line at gap=10 (watch threshold) */}
              <ReferenceLine y={10} stroke="rgba(245,158,11,0.25)" strokeDasharray="3 3" />
              <ReferenceLine y={20} stroke="rgba(255,107,107,0.25)" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as { date: string; gap: number }
                  return (
                    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] px-2 py-1 text-xs">
                      <span className="text-[rgb(var(--text-muted))]">{d.date} </span>
                      <span style={{ color: gapColor(d.gap) }} className="font-bold">
                        {d.gap > 0 ? '+' : ''}{Math.round(d.gap)}
                      </span>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="gap"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center">
            <span className="text-[10px] text-[rgb(var(--text-muted))] uppercase tracking-widest">
              Insufficient trend data
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main hero ────────────────────────────────────────────────────────────────

export default function TransferGapHero() {
  const { data: efficacy, isLoading: efficacyLoading } = useTransferGapEfficacy()
  const { data: teamReps, isLoading: teamLoading } = useTransferGapTeam()

  const avgGap       = efficacy?.avg_transfer_gap ?? null
  const totalReps    = efficacy?.total_reps_analysed ?? 0
  const decayCount   = efficacy?.reps_with_decay ?? 0
  const regressionCount = efficacy?.reps_with_pressure_regression ?? 0

  const heroColor  = gapColor(avgGap)
  const heroLabel  = gapLabel(avgGap)

  const isLoading = efficacyLoading || teamLoading

  // Sort: Critical first, then Watch, then Healthy, then no-data
  const sortedReps = [...(teamReps ?? [])].sort((a, b) => {
    const gapA = a.transfer_gap_overall ?? -Infinity
    const gapB = b.transfer_gap_overall ?? -Infinity
    return gapB - gapA  // highest gap (worst) first
  })

  return (
    <div className="space-y-6">

      {/* ── Hero metric row ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          {/* Left: big number */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-widest font-medium">
              Team Transfer Gap — 90-day average
            </p>

            {efficacyLoading ? (
              <Skeleton className="h-16 w-36" />
            ) : (
              <div className="flex items-end gap-3">
                <span
                  className="text-7xl font-black leading-none tracking-tight"
                  style={{ fontFamily: 'Oswald, sans-serif', color: heroColor }}
                >
                  {avgGap !== null ? (
                    <>{avgGap > 0 ? '+' : ''}{Math.round(avgGap)}</>
                  ) : (
                    <span className="text-4xl text-[rgb(var(--text-muted))]">No data</span>
                  )}
                </span>
                {avgGap !== null && (
                  <div className="pb-2 flex flex-col gap-1">
                    <span
                      className="text-sm font-bold uppercase tracking-widest"
                      style={{ color: heroColor }}
                    >
                      {heroLabel}
                    </span>
                    <span className="text-xs text-[rgb(var(--text-muted))]">pts</span>
                  </div>
                )}
              </div>
            )}

            {avgGap !== null && (
              <p className="text-sm text-[rgb(var(--text-secondary))] max-w-sm">
                {avgGap < 10
                  ? 'Training is transferring well to live calls. No systemic intervention needed.'
                  : avgGap <= 20
                  ? 'Moderate gap detected. Review reps in the Watch band before this widens.'
                  : 'Critical gap. Training performance is not reaching live calls — immediate coaching review required.'}
              </p>
            )}
          </div>

          {/* Right: signal tiles */}
          <div className="flex flex-wrap gap-3 lg:shrink-0">
            <SignalTile
              icon={Users}
              value={isLoading ? null : totalReps}
              label="Reps analysed"
              delay={0.1}
            />
            <SignalTile
              icon={Brain}
              value={isLoading ? null : decayCount}
              label="Knowledge decay"
              color={decayCount > 0 ? GAP_AMBER : undefined}
              delay={0.15}
            />
            <SignalTile
              icon={Zap}
              value={isLoading ? null : regressionCount}
              label="Pressure regression"
              color={regressionCount > 0 ? GAP_CORAL : undefined}
              delay={0.2}
            />
          </div>
        </div>

        {/* Colour scale legend */}
        <div className="mt-5 pt-4 border-t border-[rgb(var(--border-default))] flex flex-wrap gap-4 text-xs text-[rgb(var(--text-muted))]">
          <LegendDot color={GAP_GREEN}  label="Healthy  — gap < 10pts" />
          <LegendDot color={GAP_AMBER}  label="Watch  — gap 10–20pts" />
          <LegendDot color={GAP_CORAL}  label="Critical  — gap > 20pts" />
          <span className="opacity-60">Gap = avg training score − avg live call score over 90 days</span>
        </div>
      </motion.div>

      {/* ── Per-rep sparklines ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-widest font-medium">
            Rep Transfer Gap — 8-week trend
          </h3>
          {sortedReps.some(r => r.transfer_gap_overall > 20) && (
            <div className="flex items-center gap-1.5 text-xs text-[#FF6B6B] font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {sortedReps.filter(r => r.transfer_gap_overall > 20).length} rep
              {sortedReps.filter(r => r.transfer_gap_overall > 20).length !== 1 ? 's' : ''} critical
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : sortedReps.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedReps.map((rep, i) => (
              <RepSparkline key={rep.rep_id} rep={rep} delay={i * 0.05} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SignalTileProps {
  icon: React.ComponentType<{ className?: string }>
  value: number | null
  label: string
  color?: string
  delay?: number
}

function SignalTile({ icon: Icon, value, label, color, delay = 0 }: SignalTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] px-4 py-3 min-w-[7.5rem]"
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
        <span className="text-[10px] text-[rgb(var(--text-muted))] uppercase tracking-widest font-medium">
          {label}
        </span>
      </div>
      {value === null ? (
        <Skeleton className="h-6 w-8" />
      ) : (
        <span
          className="text-2xl font-black leading-none"
          style={{ fontFamily: 'Oswald, sans-serif', color: color ?? 'rgb(var(--text-primary))' }}
        >
          {value}
        </span>
      )}
    </motion.div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] border-dashed p-10 flex flex-col items-center gap-3 text-center">
      <Brain className="w-8 h-8 text-[rgb(var(--text-muted))]" />
      <p className="text-sm text-[rgb(var(--text-secondary))] font-medium">No Transfer Gap data yet</p>
      <p className="text-xs text-[rgb(var(--text-muted))] max-w-xs">
        Snapshots are computed after each live call. Data will appear here once reps
        have completed both training sessions and live calls.
      </p>
    </div>
  )
}
