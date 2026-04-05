import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { useTeamSkillCompetency, type SkillCompetencyResult } from '../../hooks/useTeamSkillCompetency';
import type { DataQuality } from '../../config/benchmarks';

// ── Design tokens ─────────────────────────────────────────────────────────────

const COLOR_BELOW  = '#FF6B6B'   // coral  — more than 10pts below benchmark
const COLOR_NEAR   = '#F59E0B'   // amber  — within 10pts of benchmark
const COLOR_ABOVE  = '#10B981'   // green  — at or above benchmark

function barColor(teamAvg: number | null, benchmark: number): string {
  if (teamAvg === null) return 'rgb(var(--border-default))'
  if (teamAvg >= benchmark)      return COLOR_ABOVE
  if (benchmark - teamAvg <= 10) return COLOR_NEAR
  return COLOR_BELOW
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgb(var(--bg-surface-raised,28_28_31))] ${className}`} />
}

// ── Delta chip ────────────────────────────────────────────────────────────────

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const abs = Math.abs(delta)
  if (abs < 0.5) {
    return (
      <div className="flex items-center gap-0.5 text-[rgb(var(--text-muted))]">
        <Minus className="w-3 h-3" />
        <span className="text-[10px] font-bold">0</span>
      </div>
    )
  }
  const isUp = delta > 0
  return (
    <div
      className="flex items-center gap-0.5 text-[10px] font-bold"
      style={{ color: isUp ? COLOR_ABOVE : COLOR_BELOW }}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {abs.toFixed(1)}
    </div>
  )
}

// ── Data quality pill ─────────────────────────────────────────────────────────

function QualityPill({ quality }: { quality: DataQuality }) {
  if (quality === 'direct') return null
  if (quality === 'estimated') {
    return (
      <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 bg-[#F59E0B18] text-[#F59E0B]">
        est.
      </span>
    )
  }
  return (
    <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 bg-[rgb(var(--border-default))] text-[rgb(var(--text-muted))]">
      no data
    </span>
  )
}

// ── Individual skill bar ──────────────────────────────────────────────────────

function SkillBar({ skill, delay }: { skill: SkillCompetencyResult; delay: number }) {
  const { label, teamAvg, benchmark, delta, dataQuality, repsWithData } = skill
  const fillPct = teamAvg !== null ? Math.min(teamAvg, 100) : 0
  const bmrkPct = Math.min(benchmark, 100)
  const color   = barColor(teamAvg, benchmark)
  const hasData = teamAvg !== null

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="group"
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-[rgb(var(--text-primary))] truncate">{label}</span>
          <QualityPill quality={dataQuality} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DeltaChip delta={delta} />
          {hasData ? (
            <span
              className="text-sm font-black tabular-nums"
              style={{ fontFamily: 'Oswald, sans-serif', color }}
            >
              {Math.round(teamAvg!)}
            </span>
          ) : (
            <span className="text-sm text-[rgb(var(--text-muted))]">—</span>
          )}
        </div>
      </div>

      {/* Bar track */}
      <div className="relative h-2 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))]">
        <motion.div
          className="absolute inset-y-0 left-0"
          initial={{ width: 0 }}
          animate={{ width: hasData ? `${fillPct}%` : '0%' }}
          transition={{ delay: delay + 0.1, duration: 0.5, ease: 'easeOut' }}
          style={{ backgroundColor: color }}
        />
        {/* Benchmark tick — white vertical line */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white opacity-60 z-10"
          style={{ left: `${bmrkPct}%` }}
          aria-label={`Benchmark: ${benchmark}`}
        />
      </div>

      {/* Contextual metadata — visible on group hover */}
      <div className="flex items-center justify-between mt-1 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="text-[10px] text-[rgb(var(--text-muted))]">
          {repsWithData > 0
            ? `${repsWithData} rep${repsWithData !== 1 ? 's' : ''} scored`
            : 'No training data yet'}
        </span>
        <span className="text-[10px] text-[rgb(var(--text-muted))]">
          Benchmark: {benchmark}
        </span>
      </div>
    </motion.div>
  )
}

// ── Legend dot ────────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 shrink-0" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

// days is controlled by TrainingDashboard — shared with RepPerformanceMatrix
export interface SkillCompetencyBreakdownProps {
  days: 30 | 60 | 90
}

export default function SkillCompetencyBreakdown({ days }: SkillCompetencyBreakdownProps) {
  const { data: skills, isLoading } = useTeamSkillCompetency(days)

  const hasAnyData = skills?.some(s => s.teamAvg !== null) ?? false

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2
            className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Skill Competency Breakdown
          </h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Team average vs top-quartile B2B SaaS benchmark  ·  white tick = benchmark
          </p>
        </div>
      </div>

      {/* Skill bars */}
      <div className="space-y-5">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          : (skills ?? []).map((skill, i) => (
              <SkillBar key={skill.key} skill={skill} delay={i * 0.05} />
            ))
        }
      </div>

      {/* Footer legend + data quality note */}
      {!isLoading && (
        <div className="mt-6 pt-4 border-t border-[rgb(var(--border-default))] space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-[rgb(var(--text-muted))]">
            <LegendDot color={COLOR_ABOVE} label="At or above benchmark" />
            <LegendDot color={COLOR_NEAR}  label="Within 10pts" />
            <LegendDot color={COLOR_BELOW} label="Below benchmark" />
          </div>

          <div className="flex items-start gap-2 text-xs text-[rgb(var(--text-muted))]">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {!hasAnyData ? (
              <span>
                No training data yet. Bars populate as reps complete sessions.
                MEDDIC Qualification and Champion Building score directly.
                Other skills use proxy signals until the scoring pipeline is extended.
              </span>
            ) : (
              <span>
                <span className="font-semibold text-[#F59E0B]">est.</span> skills use proxy signals from pitch data.{' '}
                <span className="font-semibold text-[rgb(var(--text-muted))]">no data</span> skills populate when
                direct scoring is added to the training pipeline.
                Delta arrows show change vs the previous {days}-day period.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
