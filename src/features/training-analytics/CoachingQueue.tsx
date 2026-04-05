import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, BookOpen, CheckCircle, BellOff, TrendingDown, Activity, BarChart2, Mail, X } from 'lucide-react';
import {
  useCoachingTriggers,
  useResolveTrigger,
  useSnoozeTrigger,
  filterByType,
  isCrossLayerTrigger,
  TRIGGER_TYPE_LABELS,
  SKILL_LABELS,
  type CoachingTrigger,
  type TriggerType,
  type TriggerGroup,
} from '../../hooks/useCoachingTriggers';
import WeeklyCoachingSummary from './WeeklyCoachingSummary';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRIGGER_ICONS: Record<TriggerType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  skill_decay:         TrendingDown,
  live_score_drop:     Activity,
  gap_widening:        BarChart2,
  low_commitment_rate: AlertTriangle,
  deal_risk:           AlertTriangle,
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#FF6B6B',
  warning:  '#F59E0B',
}

const FILTER_OPTIONS: { group: TriggerGroup; label: string }[] = [
  { group: 'all',         label: 'All'         },
  { group: 'training',    label: 'Training'    },
  { group: 'live_call',   label: 'Live Call'   },
  { group: 'deal_risk',   label: 'Deal Risk'   },
  { group: 'cross_layer', label: 'Cross-Layer' },
]

function triggerDescription(t: CoachingTrigger): string {
  const d = t.triggerData

  if (isCrossLayerTrigger(t)) {
    return String(d.coaching_note ?? `Deal lost: ${d.loss_reason}. Skill gap detected.`)
  }

  switch (t.triggerType) {
    case 'skill_decay': {
      const skill = t.skillName ? (SKILL_LABELS[t.skillName] ?? t.skillName) : 'Unknown skill'
      return `${skill} dropped ${d.drop_pts ?? '?'}pts between post-training and day-30 assessments (${d.day0_score ?? '?'} → ${d.day30_score ?? '?'}).`
    }
    case 'live_score_drop':
      return `Live call score (${d.latest_score ?? '?'}) is ${d.drop_pts ?? '?'}pts below the 30-day rolling average (${d.rolling_avg_30d ?? '?'}).`
    case 'gap_widening':
      return `Transfer gap widened ${d.widening_pts ?? '?'}pts this week (${d.prior_gap ?? '?'} → ${d.current_gap ?? '?'}pts).`
    case 'deal_risk':
      return `Deal risk score: ${d.risk_score ?? '?'}/100. Immediate attention required.`
    default:
      return TRIGGER_TYPE_LABELS[t.triggerType]
  }
}

function timeAgo(isoStr: string): string {
  const diff  = Date.now() - new Date(isoStr).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

// ── Trigger card ──────────────────────────────────────────────────────────────

function TriggerCard({ trigger }: { trigger: CoachingTrigger }) {
  const resolve = useResolveTrigger()
  const snooze  = useSnoozeTrigger()
  const Icon    = TRIGGER_ICONS[trigger.triggerType] ?? AlertTriangle
  const border  = SEVERITY_BORDER[trigger.severity] ?? 'rgba(255,255,255,0.15)'
  const isCross = isCrossLayerTrigger(trigger)
  const d       = trigger.triggerData as Record<string, string | number | boolean | null | undefined>

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25 }}
      className="border border-[rgb(var(--border-default))] p-4 flex gap-4"
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <Icon className="w-4 h-4" style={{ color: border }} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Rep + trigger type */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-bold text-[rgb(var(--text-primary))] uppercase tracking-wide"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            {trigger.repName}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5"
            style={{ color: border, backgroundColor: `${border}18`, border: `1px solid ${border}44` }}
          >
            {isCross ? 'Cross-Layer' : TRIGGER_TYPE_LABELS[trigger.triggerType]}
          </span>
          {trigger.severity === 'critical' && (
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#FF6B6B18] text-[#FF6B6B] border border-[#FF6B6B44]">
              Critical
            </span>
          )}
        </div>

        {/* Cross-layer: two-line card */}
        {isCross ? (
          <div className="space-y-0.5">
            <p className="text-xs text-[rgb(var(--text-secondary,200_200_210))] font-medium">
              Deal lost: {String(d.loss_reason ?? '—')}
            </p>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              {SKILL_LABELS[String(d.skill_name ?? '')] ?? String(d.skill_name ?? 'Unknown skill')} score:{' '}
              <strong style={{ color: '#FF6B6B' }}>{String(d.current_score ?? '?')}/100</strong>
              {d.module ? ` — ${String(d.module)} recommended` : ''}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[rgb(var(--text-secondary,200_200_210))] leading-relaxed">
            {triggerDescription(trigger)}
          </p>
        )}

        {/* Deal risk: deal link */}
        {trigger.triggerType === 'deal_risk' && d.deal_id && (
          <Link
            to={`/deals/${String(d.deal_id)}`}
            className="text-[10px] text-[#6366F1] hover:underline"
          >
            View Deal →
          </Link>
        )}

        {/* Skill tag if applicable */}
        {!isCross && trigger.skillName && (
          <p className="text-[10px] text-[rgb(var(--text-muted))]">
            Skill: {SKILL_LABELS[trigger.skillName] ?? trigger.skillName}
          </p>
        )}

        {/* Action row */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            disabled
            title="Module assignment available in a future release"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest opacity-30 cursor-not-allowed border border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))]"
          >
            <BookOpen className="w-3 h-3" />
            Assign Module
          </button>

          <button
            onClick={() => snooze.mutate(trigger.id)}
            disabled={snooze.isPending}
            title="Hide from queue for 7 days"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:border-[rgba(255,255,255,0.3)] transition-colors disabled:opacity-40"
          >
            <BellOff className="w-3 h-3" />
            Snooze 7d
          </button>

          <button
            onClick={() => resolve.mutate(trigger.id)}
            disabled={resolve.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#10B98118] border border-[#10B98144] text-[#10B981] hover:bg-[#10B98128] transition-colors disabled:opacity-40"
          >
            <CheckCircle className="w-3 h-3" />
            Resolve
          </button>

          <span className="ml-auto text-[9px] text-[rgb(var(--text-muted))] shrink-0">
            {timeAgo(trigger.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface CoachingQueueProps {
  days: 30 | 60 | 90
}

export default function CoachingQueue({ days: _days }: CoachingQueueProps) {
  const { data, isLoading }           = useCoachingTriggers()
  const [activeGroup, setActiveGroup] = useState<TriggerGroup>('all')
  const [showSummary, setShowSummary] = useState(false)

  const filteredTriggers = filterByType(data ?? [], activeGroup)
  const criticalCount    = (data ?? []).filter(t => t.severity === 'critical').length
  const total            = data?.length ?? 0

  // Count per group for badges
  const groupCounts = FILTER_OPTIONS.reduce<Record<TriggerGroup, number>>((acc, { group }) => {
    acc[group] = filterByType(data ?? [], group).length
    return acc
  }, {} as Record<TriggerGroup, number>)

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2
            className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Coaching Queue
          </h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Spaced repetition triggers · unresolved actions for your team
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!isLoading && criticalCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 bg-[#FF6B6B18] text-[#FF6B6B] border border-[#FF6B6B44]">
              {criticalCount} critical
            </span>
          )}
          {!isLoading && total > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 bg-[rgba(255,255,255,0.05)] text-[rgb(var(--text-muted))] border border-[rgb(var(--border-default))]">
              {total} total
            </span>
          )}
          {/* Preview Weekly Summary */}
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-[#6366F144] text-[#6366F1] hover:bg-[#6366F118] transition-colors"
          >
            <Mail className="w-3 h-3" />
            Preview Weekly Summary
          </button>
        </div>
      </div>

      {/* Filter bar — X4 */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {FILTER_OPTIONS.map(({ group, label }) => {
          const count   = groupCounts[group]
          const active  = activeGroup === group
          return (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors"
              style={{
                background:   active ? 'rgba(255,255,255,0.08)' : 'transparent',
                color:        active ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
                border:       `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {label}
              {group !== 'all' && count > 0 && (
                <span className="text-[9px] font-mono">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-[rgb(var(--border-default))] p-4 flex gap-4" style={{ borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
              <Skeleton className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTriggers.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-[rgb(var(--border-default))]">
          <CheckCircle className="w-8 h-8 text-[#10B981] mx-auto mb-3" />
          <p className="text-sm font-medium text-[rgb(var(--text-secondary,200_200_210))]">
            {activeGroup === 'all' ? 'Queue is clear' : `No ${activeGroup.replace('_', ' ')} triggers`}
          </p>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
            {activeGroup === 'all'
              ? 'No unresolved coaching triggers for your team. New triggers are generated nightly.'
              : 'Try switching to "All" to see other trigger types.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTriggers.map(trigger => (
              <TriggerCard key={trigger.id} trigger={trigger} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      {!isLoading && total > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgb(var(--border-default))] flex flex-wrap gap-4 text-xs text-[rgb(var(--text-muted))]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 shrink-0" style={{ borderLeft: '3px solid #FF6B6B' }} />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 shrink-0" style={{ borderLeft: '3px solid #F59E0B' }} />
            <span>Warning</span>
          </div>
          <span className="ml-auto opacity-60">
            Snooze hides for 7 days. Resolve marks as actioned (kept in history).
          </span>
        </div>
      )}

      {/* Weekly Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#161618] border border-[#2a2a2e] shadow-2xl">
            <button
              onClick={() => setShowSummary(false)}
              className="absolute top-3 right-3 text-[#6b7280] hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <WeeklyCoachingSummary triggers={data ?? []} />
          </div>
        </div>
      )}
    </div>
  )
}
