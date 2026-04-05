import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, TrendingUp, TrendingDown, Minus, CheckSquare, Square } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../utils/supabase';
import { SKILL_BENCHMARKS, type SkillKey } from '../../config/benchmarks';
import {
  useCoachingROI,
  useLogCoachingSession,
  type CoachingSessionWithROI,
  type SkillDelta,
} from '../../hooks/useCoachingROI';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL = '#FF6B6B'
const AMBER = '#F59E0B'
const GREEN = '#10B981'

// ── Rep list hook (for the log-session form) ──────────────────────────────────

function useRepList() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['rep-list-coaching-roi'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('role', 'rep')
        .order('name', { ascending: true })
      return (data ?? []).map((p: { id: string; name: string | null; email: string }) => ({
        id:   p.id,
        name: p.name ?? p.email?.split('@')[0] ?? 'Unknown',
      }))
    },
  })
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-[rgb(var(--border-default))] p-4">
      <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">{label}</p>
      <p
        className="text-3xl font-black tabular-nums leading-none"
        style={{ fontFamily: 'Oswald, sans-serif', color: color ?? 'rgb(var(--text-primary))' }}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1">{sub}</p>}
    </div>
  )
}

// ── Delta pill ────────────────────────────────────────────────────────────────

function DeltaPill({ delta }: { delta: SkillDelta }) {
  if (delta.delta === null) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold"
        style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Minus className="w-2 h-2" />
        No data
      </span>
    )
  }
  const color  = delta.delta > 0 ? GREEN : delta.delta < 0 ? CORAL : AMBER
  const Icon   = delta.delta > 0 ? TrendingUp : delta.delta < 0 ? TrendingDown : Minus
  const prefix = delta.delta > 0 ? '+' : ''

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold"
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}44` }}
    >
      <Icon className="w-2 h-2" />
      {prefix}{delta.delta.toFixed(1)}
    </span>
  )
}

// ── Session expand card ───────────────────────────────────────────────────────

function SessionCard({
  session,
  onClose,
}: { session: CoachingSessionWithROI; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-20 top-8 left-1/2 -translate-x-1/2 w-64 border border-[rgb(var(--border-default))] shadow-2xl"
      style={{ backgroundColor: '#161618' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <p className="text-xs font-bold text-[rgb(var(--text-primary))] truncate">{session.repName}</p>
        <button onClick={onClose} className="shrink-0 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">
          {new Date(session.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        {session.deltas.length === 0 ? (
          <p className="text-xs text-[rgb(var(--text-muted))]">No skills tracked.</p>
        ) : (
          <div className="space-y-1.5">
            {session.deltas.map(d => (
              <div key={d.skill} className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-[rgb(var(--text-secondary))] truncate">{d.skillLabel}</p>
                <DeltaPill delta={d} />
              </div>
            ))}
          </div>
        )}

        {session.notes && (
          <p className="text-[10px] text-[rgb(var(--text-muted))] pt-1 border-t border-[rgba(255,255,255,0.06)] leading-relaxed">
            {session.notes}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── Session timeline ──────────────────────────────────────────────────────────

function SessionTimeline({
  sessions,
  days,
}: { sessions: CoachingSessionWithROI[]; days: number }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const now       = Date.now()
  const rangeMs   = days * 86_400_000
  const windowEnd = now

  // Position as % across the time axis (0 = oldest, 100 = now)
  function positionPct(dateStr: string): number {
    const ms    = new Date(dateStr).getTime()
    const pct   = ((ms - (windowEnd - rangeMs)) / rangeMs) * 100
    return Math.max(2, Math.min(98, pct))
  }

  if (sessions.length === 0) {
    return (
      <div
        className="h-16 flex items-center justify-center text-xs text-[rgb(var(--text-muted))] border border-dashed border-[rgb(var(--border-default))]"
        data-testid="timeline-empty"
      >
        No coaching sessions logged in this period
      </div>
    )
  }

  return (
    <div className="relative h-16" data-testid="session-timeline">
      {/* Track */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgba(255,255,255,0.08)] -translate-y-1/2" />

      {/* Session markers */}
      {sessions.map(session => {
        const pct       = positionPct(session.sessionDate)
        const isExpanded = expandedId === session.id
        const hasData   = session.deltas.some(d => d.delta !== null)
        const hasPositive = session.deltas.some(d => d.delta !== null && d.delta > 0)
        const markerColor = !hasData ? AMBER : hasPositive ? GREEN : CORAL

        return (
          <div key={session.id} className="absolute" style={{ left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              className="w-3 h-3 rounded-full transition-transform hover:scale-150 focus:outline-none"
              style={{ backgroundColor: markerColor, boxShadow: isExpanded ? `0 0 0 2px ${markerColor}55` : undefined }}
              title={`${session.repName} — ${session.sessionDate}`}
              aria-label={`Coaching session for ${session.repName} on ${session.sessionDate}`}
            />

            <AnimatePresence>
              {isExpanded && (
                <SessionCard
                  session={session}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Date range labels */}
      <div className="absolute bottom-0 left-0 text-[9px] text-[rgb(var(--text-muted))]">
        {new Date(now - rangeMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </div>
      <div className="absolute bottom-0 right-0 text-[9px] text-[rgb(var(--text-muted))]">
        Today
      </div>
    </div>
  )
}

// ── Log session form ──────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

function LogSessionForm({ onDone }: { onDone: () => void }) {
  const { data: reps, isLoading: repsLoading } = useRepList()
  const { mutate, isPending, isSuccess, isError } = useLogCoachingSession()

  const [repId,       setRepId]       = useState('')
  const [skillFocus,  setSkillFocus]  = useState<SkillKey[]>([])
  const [sessionDate, setSessionDate] = useState(TODAY)
  const [notes,       setNotes]       = useState('')

  function toggleSkill(key: SkillKey) {
    setSkillFocus(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function handleSubmit() {
    if (!repId || skillFocus.length === 0) return
    mutate(
      { repId, skillFocus, sessionDate, notes: notes.trim() || undefined },
      { onSuccess: onDone },
    )
  }

  const canSubmit = repId !== '' && skillFocus.length > 0 && !isPending

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="border border-[rgb(var(--border-default))] mt-3 p-4 space-y-4 bg-[rgba(255,255,255,0.02)]">

        {/* Row 1: Rep + Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Rep selector */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
              Rep *
            </label>
            <select
              value={repId}
              onChange={e => setRepId(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent-primary))]"
              disabled={repsLoading}
            >
              <option value="">Select rep…</option>
              {(reps ?? []).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
              Session Date *
            </label>
            <input
              type="date"
              value={sessionDate}
              max={TODAY}
              onChange={e => setSessionDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent-primary))]"
            />
          </div>
        </div>

        {/* Skills multi-select */}
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1.5">
            Skills Focused On * <span className="normal-case">(select at least one)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {SKILL_BENCHMARKS.map(skill => {
              const checked = skillFocus.includes(skill.key)
              return (
                <div
                  key={skill.key}
                  onClick={() => toggleSkill(skill.key)}
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={skill.label}
                  className="flex items-center gap-1.5 px-2 py-1 cursor-pointer select-none border transition-colors"
                  style={{
                    borderColor: checked ? 'rgba(var(--accent-primary), 0.6)' : 'rgb(var(--border-default))',
                    backgroundColor: checked ? 'rgba(var(--accent-primary), 0.08)' : 'transparent',
                    color: 'rgb(var(--text-primary))',
                  }}
                >
                  {checked
                    ? <CheckSquare className="w-3 h-3 shrink-0" style={{ color: 'rgb(var(--accent-primary))' }} />
                    : <Square className="w-3 h-3 shrink-0 opacity-40" />}
                  <span className="text-[10px] leading-tight">{skill.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Key focus areas, observations, next steps…"
            className="w-full px-2 py-1.5 text-xs bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] resize-none focus:outline-none focus:border-[rgb(var(--accent-primary))] placeholder:text-[rgb(var(--text-muted))]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors"
            style={{
              backgroundColor: canSubmit ? 'rgb(var(--accent-primary))' : 'rgba(255,255,255,0.06)',
              color: canSubmit ? 'white' : 'rgba(255,255,255,0.3)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {isPending ? 'Logging…' : 'Log Session'}
          </button>

          <button
            onClick={onDone}
            className="px-3 py-1.5 text-xs text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            Cancel
          </button>

          {isError && (
            <p className="text-xs text-[#FF6B6B]">Failed to save. Try again.</p>
          )}
        </div>

        {isSuccess && (
          <p className="text-xs" style={{ color: GREEN }}>Session logged.</p>
        )}
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface CoachingROITrackerProps {
  days: 30 | 60 | 90
}

export default function CoachingROITracker({ days }: CoachingROITrackerProps) {
  const [formOpen, setFormOpen] = useState(false)
  const { data, isLoading }     = useCoachingROI(days)

  const summary  = data?.summary
  const sessions = useMemo(() => data?.sessions ?? [], [data])

  const avgDeltaColor = summary?.avgDelta == null
    ? undefined
    : summary.avgDelta > 0 ? GREEN : summary.avgDelta < 0 ? CORAL : AMBER

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h2
            className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Coaching ROI
          </h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Per-session skill improvement · 14-day pre/post windows
          </p>
        </div>

        <button
          onClick={() => setFormOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--accent-primary))] hover:text-[rgb(var(--text-primary))] transition-colors shrink-0"
          aria-expanded={formOpen}
          aria-label="Log coaching session"
        >
          <Plus className="w-3 h-3" />
          Log Session
        </button>
      </div>

      {/* Log session form — collapsed by default */}
      <AnimatePresence>
        {formOpen && (
          <LogSessionForm key="log-form" onDone={() => setFormOpen(false)} />
        )}
      </AnimatePresence>

      {/* Summary stat row */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <StatTile
            label="Sessions Logged"
            value={String(summary?.totalSessions ?? 0)}
            sub={`last ${days} days`}
          />
          <StatTile
            label="Avg Skill Δ"
            value={summary?.avgDelta != null ? `${summary.avgDelta > 0 ? '+' : ''}${summary.avgDelta.toFixed(1)}` : '—'}
            sub="across all sessions"
            color={avgDeltaColor}
          />
          <StatTile
            label="Skills w/ Positive ROI"
            value={String(summary?.skillsWithPositiveROI ?? 0)}
            sub={summary?.bestSkillLabel ? `Best: ${summary.bestSkillLabel}` : undefined}
            color={summary?.skillsWithPositiveROI ? GREEN : undefined}
          />
        </div>
      )}

      {/* Timeline section */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-3">
          Session Timeline
        </div>

        {isLoading ? (
          <Skeleton className="h-16" />
        ) : (
          <SessionTimeline sessions={sessions} days={days} />
        )}

        {/* Legend */}
        {!isLoading && sessions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-[rgb(var(--text-muted))]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GREEN }} />
              <span>Positive ROI</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CORAL }} />
              <span>No positive delta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AMBER }} />
              <span>Insufficient data</span>
            </div>
            <span className="opacity-60">Click marker for details</span>
          </div>
        )}
      </div>

      {/* No data note on insufficient skill_scores */}
      {!isLoading && sessions.length > 0 && sessions.every(s => s.deltas.every(d => d.delta === null)) && (
        <p className="text-xs text-[rgb(var(--text-muted))] mt-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
          ROI deltas require at least {2} <code>skill_scores</code> entries in both the pre- and post-session 14-day windows.
          Deltas will appear as skill score data accumulates.
        </p>
      )}
    </div>
  )
}
