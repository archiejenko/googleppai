import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import {
  useRoleReadiness,
  useRepRoleReadiness,
  BAND_COLOR,
  READINESS_WEIGHTS,
  type RepReadiness,
  type ReadinessBand,
  type FactorBreakdown,
} from '../../hooks/useRoleReadiness';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B'
const AMBER  = '#F59E0B'
const GREEN  = '#10B981'
const INDIGO = '#6366F1'

// ── Circular progress arc (pure SVG — no chart library) ──────────────────────

const ARC_R    = 28   // circle radius
const ARC_SIZE = 72   // SVG viewport size (cx = cy = 36)
void ARC_SIZE // used for documentation

/**
 * Lightweight SVG circular progress arc.
 * Uses strokeDasharray / strokeDashoffset on a single <circle> element.
 * Arc starts at the top (transform: rotate(-90deg) applied to the foreground circle).
 */
export function CircularArc({
  pct,
  color,
  size = ARC_SIZE,
  strokeWidth = 5,
}: {
  pct:          number    // 0–100
  color:        string
  size?:        number
  strokeWidth?: number
}) {
  const r     = (size / ARC_SIZE) * ARC_R
  const circ  = 2 * Math.PI * r
  const cx    = size / 2
  const cy    = size / 2
  const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${Math.round(pct)}%`}
      role="img"
    >
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Foreground arc — rotated so start is at top */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        data-testid="arc-foreground"
        data-circ={circ}
        data-offset={offset}
      />
      {/* Score label */}
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.22}
        fontFamily="Oswald, sans-serif"
        fontWeight="900"
        fill={color}
      >
        {Math.round(pct)}
      </text>
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

// ── Band pill ─────────────────────────────────────────────────────────────────

function BandPill({ band }: { band: ReadinessBand }) {
  const color = BAND_COLOR[band]
  return (
    <span
      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shrink-0"
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}44` }}
    >
      {band}
    </span>
  )
}

// ── Factor row ────────────────────────────────────────────────────────────────

function FactorRow({ factor, highlight }: { factor: FactorBreakdown; highlight: boolean }) {
  const barColor = factor.inputScore >= 80 ? GREEN
    : factor.inputScore >= 60 ? INDIGO
    : factor.inputScore >= 40 ? AMBER
    : CORAL
  const weightPct = Math.round(READINESS_WEIGHTS[factor.key] * 100)

  return (
    <div className={`py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0 ${highlight ? 'bg-[rgba(255,107,107,0.04)]' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-[rgb(var(--text-secondary))] truncate">{factor.label}</span>
          <span className="text-[9px] text-[rgb(var(--text-muted))] shrink-0">({weightPct}%)</span>
        </div>
        <span
          className="text-xs font-black tabular-nums shrink-0"
          style={{ fontFamily: 'Oswald, sans-serif', color: barColor }}
        >
          {Math.round(factor.inputScore)}
        </span>
      </div>

      {/* Input score bar */}
      <div className="h-1 bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${factor.inputScore}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Drag explanation if below threshold */}
      {factor.inputScore < 60 && (
        <p className="text-[9px] text-[#FF6B6B] mt-1 leading-relaxed">{factor.explanation}</p>
      )}
    </div>
  )
}

// ── Individual detail panel ───────────────────────────────────────────────────

function IndividualDetail({
  repId,
  days,
  onBack,
}: { repId: string; days: number; onBack: () => void }) {
  const { data: rep, isLoading } = useRepRoleReadiness(repId, days)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24" />
        {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
      </div>
    )
  }

  if (!rep) {
    return (
      <div className="py-10 text-center text-xs text-[rgb(var(--text-muted))]">
        No readiness data for this rep in the selected period.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back button + rep summary */}
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="text-[10px] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors shrink-0 mt-0.5"
        >
          ← Back
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {rep.score !== null && (
            <CircularArc pct={rep.score} color={rep.band ? BAND_COLOR[rep.band] : AMBER} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-[rgb(var(--text-primary))] truncate">{rep.repName}</p>
            {rep.band && <BandPill band={rep.band} />}
            {rep.dragFactor && (
              <p className="text-[9px] text-[rgb(var(--text-muted))] mt-1" data-testid="detail-drag-factor">
                Drag factor: <span className="text-[#FF6B6B]">{rep.dragFactor.label}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="border border-[rgb(var(--border-default))] divide-y divide-[rgba(255,255,255,0.04)]">
        <div className="px-3 py-2 text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">
          Factor Breakdown
        </div>
        <div className="px-3 divide-y divide-[rgba(255,255,255,0.04)]">
          {rep.factors.map(f => (
            <FactorRow
              key={f.key}
              factor={f}
              highlight={rep.dragFactor?.key === f.key}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Team leaderboard ──────────────────────────────────────────────────────────

function TeamLeaderboard({
  reps,
  onSelectRep,
}: { reps: RepReadiness[]; onSelectRep: (repId: string) => void }) {
  if (reps.length === 0) {
    return (
      <div
        className="py-12 text-center text-xs text-[rgb(var(--text-muted))] border border-dashed border-[rgb(var(--border-default))]"
        data-testid="leaderboard-empty"
      >
        No readiness data for this period. Scores appear once the correlation engine has run.
      </div>
    )
  }

  return (
    <div className="space-y-1" data-testid="leaderboard-list">
      {reps.map((rep, idx) => (
        <motion.button
          key={rep.repId}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          onClick={() => onSelectRep(rep.repId)}
          className="w-full flex items-center gap-4 px-3 py-2.5 border border-[rgb(var(--border-default))] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.02)] transition-all text-left group"
        >
          {/* Rank */}
          <span
            className="text-sm font-black tabular-nums w-5 shrink-0 text-right"
            style={{ fontFamily: 'Oswald, sans-serif', color: 'rgba(255,255,255,0.25)' }}
          >
            {idx + 1}
          </span>

          {/* Arc */}
          {rep.score !== null ? (
            <CircularArc
              pct={rep.score}
              color={rep.band ? BAND_COLOR[rep.band] : AMBER}
              size={40}
              strokeWidth={4}
            />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center text-[9px] text-[rgb(var(--text-muted))]">
              —
            </div>
          )}

          {/* Name + drag factor */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[rgb(var(--text-primary))] truncate">{rep.repName}</p>
            {rep.dragFactor && rep.score !== null && rep.score < 80 && (
              <p className="text-[9px] text-[rgb(var(--text-muted))] truncate">
                Drag: <span style={{ color: CORAL }}>{rep.dragFactor.label}</span>
              </p>
            )}
          </div>

          {/* Band pill */}
          {rep.band && <BandPill band={rep.band} />}

          {/* Chevron */}
          <ChevronRight className="w-3 h-3 text-[rgb(var(--text-muted))] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </motion.button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface RoleReadinessScoresProps {
  days: 30 | 60 | 90
}

type View = 'leaderboard' | 'detail'

export default function RoleReadinessScores({ days }: RoleReadinessScoresProps) {
  const [view,          setView]          = useState<View>('leaderboard')
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null)

  const { data: reps, isLoading } = useRoleReadiness(days)

  function handleSelectRep(repId: string) {
    setSelectedRepId(repId)
    setView('detail')
  }

  function handleBack() {
    setView('leaderboard')
    setSelectedRepId(null)
  }

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h2
            className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Role Readiness
          </h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Composite readiness score · 5-factor breakdown
          </p>
        </div>

        {/* View toggle */}
        <div className="flex border border-[rgb(var(--border-default))] shrink-0">
          {(['leaderboard', 'detail'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); if (v === 'leaderboard') setSelectedRepId(null) }}
              aria-pressed={view === v}
              className={[
                'px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors',
                view === v
                  ? 'bg-[rgb(var(--accent-primary))] text-white'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]',
              ].join(' ')}
            >
              {v === 'leaderboard' ? 'Team' : 'Individual'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : (
        <AnimatePresence>
          {view === 'leaderboard' ? (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <TeamLeaderboard reps={reps ?? []} onSelectRep={handleSelectRep} />

              {/* Band legend */}
              {(reps?.length ?? 0) > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {(['Exceptional', 'Ready', 'Developing', 'Not Ready'] as ReadinessBand[]).map(band => (
                    <div key={band} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BAND_COLOR[band] }} />
                      <span className="text-[9px] text-[rgb(var(--text-muted))]">{band}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {selectedRepId ? (
                <IndividualDetail repId={selectedRepId} days={days} onBack={handleBack} />
              ) : (
                <div className="py-10 text-center text-xs text-[rgb(var(--text-muted))]">
                  Select a rep from the Team view to see their breakdown.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
