import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertTriangle, Brain, Zap } from 'lucide-react';
import {
  useRepPerformanceMatrix,
  type RepMatrixRow,
  type RepStatus,
} from '../../hooks/useRepPerformanceMatrix';
import { useRepSkillBreakdown, type RepSkillScore } from '../../hooks/useRepSkillBreakdown';
import { useTeamSkillCompetency } from '../../hooks/useTeamSkillCompetency';
import type { SkillKey } from '../../config/benchmarks';

// ── Design tokens ─────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<RepStatus, string> = {
  Critical:  '#FF6B6B',
  'At Risk': '#F59E0B',
  Watch:     '#6366F1',
  Strong:    '#10B981',
  'No Data': 'rgb(var(--text-muted))',
}

const STATUS_BG: Record<RepStatus, string> = {
  Critical:  '#FF6B6B18',
  'At Risk': '#F59E0B18',
  Watch:     '#6366F118',
  Strong:    '#10B98118',
  'No Data': 'transparent',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number | null, decimals = 0): string {
  if (v === null) return '—'
  return v.toFixed(decimals)
}

function fmtGap(v: number | null): string {
  if (v === null) return '—'
  return `${v > 0 ? '+' : ''}${Math.round(v)}`
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgb(var(--bg-surface-raised,28_28_31))] ${className}`} />
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: RepStatus }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
      style={{ color: STATUS_COLOR[status], backgroundColor: STATUS_BG[status] }}
    >
      {status}
    </span>
  )
}

// ── Inline skill breakdown (expanded row) ─────────────────────────────────────

interface SkillExpandProps {
  repId:      string
  days:       number
  teamAvgMap: Map<SkillKey, number | null>
}

function SkillExpand({ repId, days, teamAvgMap }: SkillExpandProps) {
  const { data: skills, isLoading } = useRepSkillBreakdown(repId, days, teamAvgMap)

  return (
    <div className="px-4 pb-4 pt-3 bg-[rgb(var(--bg-canvas))] border-t border-[rgb(var(--border-default))]">
      <p className="text-[10px] text-[rgb(var(--text-muted))] uppercase tracking-widest font-medium mb-3">
        Skill breakdown vs team average
      </p>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {(skills ?? []).map(skill => (
            <SkillCompareRow key={skill.key} skill={skill} />
          ))}
        </div>
      )}
    </div>
  )
}

function SkillCompareRow({ skill }: { skill: RepSkillScore }) {
  const { label, repScore, teamAvg } = skill
  const hasRep  = repScore !== null
  const hasTeam = teamAvg !== null
  const delta   = hasRep && hasTeam ? repScore - teamAvg : null

  // Colour: rep score vs team avg
  const deltaColor =
    delta === null   ? 'rgb(var(--text-muted))'
    : delta >= 0     ? '#10B981'
    : delta >= -10   ? '#F59E0B'
    : '#FF6B6B'

  return (
    <div className="flex items-center gap-3">
      {/* Skill label */}
      <span className="text-xs text-[rgb(var(--text-secondary))] w-44 shrink-0 truncate">{label}</span>

      {/* Rep bar + team avg marker */}
      <div className="relative flex-1 h-1.5 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))]">
        {hasRep && (
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${Math.min(repScore, 100)}%`, backgroundColor: deltaColor }}
          />
        )}
        {/* Team average tick */}
        {hasTeam && (
          <div
            className="absolute inset-y-0 w-0.5 bg-white opacity-50 z-10"
            style={{ left: `${Math.min(teamAvg, 100)}%` }}
          />
        )}
      </div>

      {/* Scores */}
      <div className="flex items-center gap-2 shrink-0 w-28 justify-end">
        <span
          className="text-xs font-bold tabular-nums"
          style={{ fontFamily: 'Oswald, sans-serif', color: deltaColor }}
        >
          {hasRep ? Math.round(repScore) : '—'}
        </span>
        <span className="text-[10px] text-[rgb(var(--text-muted))]">
          vs {hasTeam ? Math.round(teamAvg) : '—'}
        </span>
        {delta !== null && (
          <span
            className="text-[10px] font-bold tabular-nums w-8 text-right"
            style={{ color: deltaColor }}
          >
            {delta > 0 ? `+${Math.round(delta)}` : Math.round(delta)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────

interface RepRowProps {
  rep:        RepMatrixRow
  expanded:   boolean
  onToggle:   () => void
  days:       number
  teamAvgMap: Map<SkillKey, number | null>
  delay:      number
}

function RepRow({ rep, expanded, onToggle, days, teamAvgMap, delay }: RepRowProps) {
  const isCritical = rep.status === 'Critical'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="border border-[rgb(var(--border-default))] overflow-hidden"
      style={isCritical ? { borderLeftWidth: 3, borderLeftColor: '#FF6B6B' } : {}}
    >
      {/* Main row — clickable */}
      <button
        onClick={onToggle}
        className="w-full text-left bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-surface-raised,28_28_31))] transition-colors duration-150"
        aria-expanded={expanded}
      >
        <div className="grid items-center gap-3 px-4 py-3"
          style={{ gridTemplateColumns: '1fr 7rem 7rem 7rem 9rem auto' }}
        >
          {/* Rep name + flags */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-[rgb(var(--text-primary))] truncate">
              {rep.repName}
            </span>
            {rep.knowledgeDecay && (
              <Brain className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" aria-label="Knowledge decay" />
            )}
            {rep.pressureRegression && (
              <Zap className="w-3.5 h-3.5 text-[#FF6B6B] shrink-0" aria-label="Pressure regression" />
            )}
          </div>

          {/* Training avg */}
          <span
            className="text-sm font-black tabular-nums text-center"
            style={{ fontFamily: 'Oswald, sans-serif', color: 'rgb(var(--text-primary))' }}
          >
            {fmt(rep.trainingAvg)}
          </span>

          {/* Call avg */}
          <span
            className="text-sm font-black tabular-nums text-center"
            style={{
              fontFamily: 'Oswald, sans-serif',
              color: rep.callAvg !== null && rep.callAvg < 40 ? '#FF6B6B' : 'rgb(var(--text-primary))',
            }}
          >
            {fmt(rep.callAvg)}
          </span>

          {/* Transfer gap */}
          <span
            className="text-sm font-black tabular-nums text-center"
            style={{
              fontFamily: 'Oswald, sans-serif',
              color: STATUS_COLOR[rep.status],
            }}
          >
            {fmtGap(rep.transferGap)}
          </span>

          {/* Status pill */}
          <div className="flex justify-center">
            <StatusPill status={rep.status} />
          </div>

          {/* Chevron */}
          <div className="flex justify-end text-[rgb(var(--text-muted))]">
            {expanded
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            }
          </div>
        </div>
      </button>

      {/* Expandable skill breakdown */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <SkillExpand repId={rep.repId} days={days} teamAvgMap={teamAvgMap} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Column header ─────────────────────────────────────────────────────────────

function ColHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))]">
        {label}
      </div>
      {sub && <div className="text-[9px] text-[rgb(var(--text-muted))] opacity-60">{sub}</div>}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface RepPerformanceMatrixProps {
  days: 30 | 60 | 90
}

export default function RepPerformanceMatrix({ days }: RepPerformanceMatrixProps) {
  const { data: reps, isLoading } = useRepPerformanceMatrix(days)
  const { data: teamSkills } = useTeamSkillCompetency(days)  // already cached from T2

  const [expandedRepId, setExpandedRepId] = useState<string | null>(null)

  // Build teamAvgMap once from cached T2 data — passed into every expanded row
  const teamAvgMap = useMemo<Map<SkillKey, number | null>>(() => {
    const m = new Map<SkillKey, number | null>()
    for (const s of teamSkills ?? []) m.set(s.key, s.teamAvg)
    return m
  }, [teamSkills])

  const criticalCount = reps?.filter(r => r.status === 'Critical').length ?? 0

  function toggleRow(repId: string) {
    setExpandedRepId(prev => prev === repId ? null : repId)
  }

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))]">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[rgb(var(--border-default))]">
        <div>
          <h2
            className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Rep Performance Matrix
          </h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Sorted by severity · click a row to expand skill breakdown
          </p>
        </div>
        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#FF6B6B] shrink-0">
            <AlertTriangle className="w-4 h-4" />
            {criticalCount} critical
          </div>
        )}
      </div>

      {/* Column headers */}
      <div
        className="grid items-center gap-3 px-4 py-2 border-b border-[rgb(var(--border-default))] bg-[rgb(var(--bg-canvas))]"
        style={{ gridTemplateColumns: '1fr 7rem 7rem 7rem 9rem auto' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))]">
          Rep
        </div>
        <ColHeader label="Training" sub="avg score" />
        <ColHeader label="Live Calls" sub="avg score" />
        <ColHeader label="Gap" sub="training − live" />
        <ColHeader label="Status" />
        <div />
      </div>

      {/* Rows */}
      <div className="divide-y divide-[rgb(var(--border-default))]">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-4" />
              </div>
            ))
          : (reps ?? []).length === 0
          ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-[rgb(var(--text-secondary))] font-medium">No rep data yet</p>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                  Matrix populates once reps have completed training sessions and live calls.
                </p>
              </div>
            )
          : (reps ?? []).map((rep, i) => (
              <RepRow
                key={rep.repId}
                rep={rep}
                expanded={expandedRepId === rep.repId}
                onToggle={() => toggleRow(rep.repId)}
                days={days}
                teamAvgMap={teamAvgMap}
                delay={i * 0.04}
              />
            ))
        }
      </div>

      {/* Footer */}
      {!isLoading && (reps?.length ?? 0) > 0 && (
        <div className="px-6 py-3 border-t border-[rgb(var(--border-default))] bg-[rgb(var(--bg-canvas))] flex flex-wrap gap-4 text-xs text-[rgb(var(--text-muted))]">
          <LegendItem color={STATUS_COLOR['Strong']}    label="Strong — gap < 10" />
          <LegendItem color={STATUS_COLOR['Watch']}     label="Watch — gap 10–18" />
          <LegendItem color={STATUS_COLOR['At Risk']}   label="At Risk — gap 18–25" />
          <LegendItem color={STATUS_COLOR['Critical']}  label="Critical — gap > 25 or live score < 40" />
        </div>
      )}
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}
