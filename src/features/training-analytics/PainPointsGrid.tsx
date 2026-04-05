import { motion } from 'framer-motion';
import { Brain, TrendingDown, Volume2, Calendar } from 'lucide-react';
import { usePainPoints, type PainPoint, type InsightType } from '../../hooks/usePainPoints';

// ── Metadata per insight type ─────────────────────────────────────────────────

interface InsightMeta {
  label:       string
  icon:        React.ComponentType<{ className?: string }>
  description: (pt: PainPoint) => string
  subtext:     string
}

const INSIGHT_META: Record<InsightType, InsightMeta> = {
  objection_loop_failure: {
    label: 'Objection Loop Failure',
    icon:  TrendingDown,
    description: pt =>
      pt.insightData?.affected_count
        ? `${pt.insightData.affected_count} rep${(pt.insightData.affected_count as number) > 1 ? 's are' : ' is'} stuck in repeating objection patterns — low score variance combined with below-threshold averages.`
        : 'Reps are stuck in repeating objection patterns with no improvement across sessions.',
    subtext: 'Proxy: pitch score variance < 8 std dev and mean < 55. Direct objection scoring coming when call audio analysis is available.',
  },
  low_discovery_depth: {
    label: 'Low Discovery Depth',
    icon:  Brain,
    description: pt =>
      pt.insightData?.affected_count
        ? `${pt.insightData.affected_count} rep${(pt.insightData.affected_count as number) > 1 ? 's are' : ' is'} consistently scoring below 50 on discovery depth with no upward trend across sessions.`
        : 'Reps are consistently scoring below 50 on discovery depth with no upward trend.',
    subtext: 'Source: identifyPain score from MEDDIC analysis (pitches.analysis.meddicScores.identifyPain).',
  },
  silence_aversion: {
    label: 'Silence Aversion',
    icon:  Volume2,
    description: () =>
      'Silence aversion affects reps who fill dead air rather than letting prospects think — a signal of pressure selling.',
    subtext: 'Requires call audio analysis (talk/listen ratio, pause detection). No data source yet.',
  },
  training_drop_off: {
    label: 'Training Drop-Off',
    icon:  Calendar,
    description: pt =>
      pt.insightData?.affected_count
        ? `${pt.insightData.affected_count} rep${(pt.insightData.affected_count as number) > 1 ? 's have' : ' has'} had ${pt.insightData.streak_threshold_days ?? 10}+ consecutive days without training while call scores declined.`
        : 'Reps have had extended gaps in training while their live call scores declined.',
    subtext: 'Source: training_sessions.completed_at streaks cross-referenced with rep_correlation_snapshots.',
  },
}

// ── Severity styling ──────────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#FF6B6B',
  warning:  '#F59E0B',
  positive: '#10B981',
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  warning:  'Warning',
  positive: 'Healthy',
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

function CardSkeleton() {
  return (
    <div className="border border-[rgb(var(--border-default))] p-5 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-10 w-16" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}

// ── Pain point card ───────────────────────────────────────────────────────────

function PainPointCard({ point, index }: { point: PainPoint; index: number }) {
  const meta = INSIGHT_META[point.insightType]
  const Icon = meta.icon

  const isUnavailable = point.isDataUnavailable
  const borderColor   = isUnavailable
    ? 'rgba(255,255,255,0.15)'
    : point.severity
      ? SEVERITY_BORDER[point.severity] ?? 'rgba(255,255,255,0.15)'
      : 'rgba(255,255,255,0.12)'

  const impactDisplay = isUnavailable || point.impactPct === null || point.severity === 'positive'
    ? null
    : Math.round(point.impactPct)

  const generatedLabel = point.generatedAt
    ? new Date(point.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={[
        'border border-[rgb(var(--border-default))] p-5 flex flex-col gap-3',
        isUnavailable ? 'opacity-50' : '',
      ].join(' ')}
      style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={[
            'w-4 h-4 shrink-0',
            isUnavailable ? 'text-[rgb(var(--text-muted))]' : 'text-[rgb(var(--text-primary))]',
          ].join(' ')} />
          <span
            className="text-sm font-bold uppercase tracking-wide text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            {meta.label}
          </span>
        </div>

        {/* Severity pill */}
        {!isUnavailable && point.severity && (
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shrink-0"
            style={{
              backgroundColor: `${borderColor}22`,
              color: borderColor,
              border: `1px solid ${borderColor}44`,
            }}
          >
            {SEVERITY_LABEL[point.severity]}
          </span>
        )}

        {isUnavailable && (
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shrink-0 text-[rgb(var(--text-muted))] border border-[rgba(255,255,255,0.1)]">
            Coming Soon
          </span>
        )}
      </div>

      {/* Impact number */}
      {impactDisplay !== null ? (
        <div
          className="text-4xl font-black leading-none tabular-nums"
          style={{ fontFamily: 'Oswald, sans-serif', color: '#FF6B6B' }}
        >
          {impactDisplay}
          <span className="text-xl font-bold">%</span>
          <span className="text-sm font-normal text-[rgb(var(--text-muted))] ml-2">of team</span>
        </div>
      ) : point.severity === 'positive' ? (
        <div
          className="text-2xl font-black leading-none"
          style={{ fontFamily: 'Oswald, sans-serif', color: '#10B981' }}
        >
          All clear
        </div>
      ) : (
        <div
          className="text-2xl font-black leading-none"
          style={{ fontFamily: 'Oswald, sans-serif', color: 'rgba(255,255,255,0.2)' }}
        >
          {isUnavailable ? 'No data' : '—'}
        </div>
      )}

      {/* Description */}
      <p className={[
        'text-xs leading-relaxed',
        isUnavailable ? 'text-[rgb(var(--text-muted))]' : 'text-[rgb(var(--text-secondary,200_200_210))]',
      ].join(' ')}>
        {meta.description(point)}
      </p>

      {/* Subtext / data source note */}
      <p className="text-[10px] text-[rgb(var(--text-muted))] leading-relaxed">
        {isUnavailable
          ? 'Requires call audio analysis — talk/listen ratio and pause detection'
          : meta.subtext}
      </p>

      {/* Generated at */}
      {generatedLabel && !isUnavailable && (
        <p className="text-[9px] text-[rgb(var(--text-muted))] mt-auto pt-1">
          Last computed {generatedLabel}
        </p>
      )}

      {/* No-data state (Engine hasn't run yet) */}
      {!point.hasData && !isUnavailable && (
        <p className="text-[10px] text-[rgb(var(--text-muted))] border border-dashed border-[rgb(var(--border-default))] px-2 py-1">
          Awaiting first Engine run (scheduled 02:00 UTC daily)
        </p>
      )}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface PainPointsGridProps {
  days: 30 | 60 | 90
}

export default function PainPointsGrid({ days }: PainPointsGridProps) {
  const { data, isLoading } = usePainPoints(days)

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="mb-5">
        <h2
          className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          AI-Identified Pain Points
        </h2>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Computed nightly · {isLoading ? '…' : `${data?.filter(p => p.severity === 'critical').length ?? 0} critical`}
        </p>
      </div>

      {/* 2×2 Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(data ?? []).map((point, i) => (
            <PainPointCard key={point.insightType} point={point} index={i} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[rgb(var(--border-default))] flex flex-wrap gap-4 text-xs text-[rgb(var(--text-muted))]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 shrink-0" style={{ backgroundColor: '#FF6B6B22', borderLeft: '3px solid #FF6B6B' }} />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 shrink-0" style={{ backgroundColor: '#F59E0B22', borderLeft: '3px solid #F59E0B' }} />
          <span>Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 shrink-0" style={{ backgroundColor: '#10B98122', borderLeft: '3px solid #10B981' }} />
          <span>Healthy</span>
        </div>
        <span className="ml-auto opacity-60">
          Severity thresholds: teams &lt; 5 reps use absolute count; larger teams use percentage thresholds.
        </span>
      </div>
    </div>
  )
}
