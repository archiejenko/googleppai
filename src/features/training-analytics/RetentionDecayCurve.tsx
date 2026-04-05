import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { AlertTriangle, Brain } from 'lucide-react';
import { useRetentionDecay, type RepDecayProfile } from '../../hooks/useRetentionDecay';
import { SKILL_BENCHMARKS, type SkillKey } from '../../config/benchmarks';

// ── Design tokens ─────────────────────────────────────────────────────────────

const TEAM_LINE_COLOR  = '#FF6B6B'   // coral — team average
const REP_LINE_COLOR   = '#6366F1'   // indigo — selected rep overlay
const GRID_COLOR       = 'rgba(255,255,255,0.04)'
const AXIS_COLOR       = 'rgba(255,255,255,0.2)'

const tooltipStyle = {
  backgroundColor: '#161618',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f8fafc',
  fontSize: 11,
  fontFamily: 'DM Sans, sans-serif',
  borderRadius: 0,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgb(var(--bg-surface-raised,28_28_31))] ${className}`} />
}

function fmt(v: number | null): string {
  return v !== null ? Math.round(v).toString() : '—'
}

// ── Decay Alert Panel ─────────────────────────────────────────────────────────

interface DecayAlertPanelProps {
  alerts:          RepDecayProfile[]
  selectedRepId:   string | null
  onSelectRep:     (repId: string) => void
}

function DecayAlertPanel({ alerts, selectedRepId, onSelectRep }: DecayAlertPanelProps) {
  if (alerts.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-[#FF6B6B] bg-[#FF6B6B08] p-4 mb-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-[#FF6B6B] shrink-0" />
        <span className="text-sm font-bold text-[#FF6B6B] uppercase tracking-wide">
          Coaching Alerts — Knowledge Decay Detected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {alerts.map(rep => {
          const drop = rep.day0 !== null && rep.day30 !== null
            ? Math.round(rep.day0 - rep.day30)
            : null
          const isSelected = selectedRepId === rep.repId

          return (
            <button
              key={rep.repId}
              onClick={() => onSelectRep(rep.repId)}
              className={[
                'flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
                isSelected
                  ? 'bg-[#FF6B6B] text-white'
                  : 'bg-[#FF6B6B18] text-[#FF6B6B] hover:bg-[#FF6B6B28]',
              ].join(' ')}
            >
              <Brain className="w-3 h-3" />
              {rep.repName}
              {drop !== null && (
                <span className={isSelected ? 'text-white opacity-80' : 'opacity-70'}>
                  −{drop}pts
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-[rgb(var(--text-muted))] mt-2">
        Click a rep to overlay their decay curve. Score dropped &gt;{15}pts between
        post-training and day 30.
      </p>
    </motion.div>
  )
}

// ── Skill selector ────────────────────────────────────────────────────────────

interface SkillSelectorProps {
  value:    SkillKey
  onChange: (k: SkillKey) => void
}

function SkillSelector({ value, onChange }: SkillSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SKILL_BENCHMARKS.map(s => (
        <button
          key={s.key}
          onClick={() => onChange(s.key)}
          disabled={s.dataQuality === 'none'}
          className={[
            'px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150',
            s.dataQuality === 'none'
              ? 'opacity-30 cursor-not-allowed text-[rgb(var(--text-muted))]'
              : value === s.key
              ? 'bg-[rgb(var(--accent-primary))] text-white'
              : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] border border-[rgb(var(--border-default))]',
          ].join(' ')}
          title={s.dataQuality === 'none' ? 'No scoring data available for this skill' : undefined}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string
  value: number | null
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const dayLabel = label === '0' ? 'Post-training'
    : label === '7' ? 'Day 7'
    : 'Day 30'

  return (
    <div style={tooltipStyle} className="px-3 py-2 space-y-1 min-w-[120px]">
      <div className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1.5">
        {dayLabel}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 shrink-0 inline-block" style={{ backgroundColor: p.color }} />
            <span className="text-[11px] text-[rgb(var(--text-secondary))]">{p.name}</span>
          </div>
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{ color: p.color, fontFamily: 'Oswald, sans-serif' }}
          >
            {p.value !== null ? Math.round(p.value as number) : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface RetentionDecayCurveProps {
  days: 30 | 60 | 90
}

export default function RetentionDecayCurve({ days }: RetentionDecayCurveProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>('meddic_qualification')
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null)

  const { data, isLoading } = useRetentionDecay(days, selectedSkill)

  const selectedRep = data?.reps.find(r => r.repId === selectedRepId) ?? null

  function handleSelectRep(repId: string) {
    setSelectedRepId(prev => prev === repId ? null : repId)
  }

  // Benchmark for reference line
  const benchmark = SKILL_BENCHMARKS.find(s => s.key === selectedSkill)?.benchmark ?? null

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="mb-5">
        <h2
          className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Retention Decay Curve
        </h2>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Skill score at post-training, day 7, and day 30 · team average (coral) · rep overlay (indigo)
        </p>
      </div>

      {/* Skill selector */}
      <div className="mb-5">
        <SkillSelector value={selectedSkill} onChange={key => { setSelectedSkill(key); setSelectedRepId(null) }} />
      </div>

      {/* Decay alerts */}
      {!isLoading && (
        <DecayAlertPanel
          alerts={data?.decayAlerts ?? []}
          selectedRepId={selectedRepId}
          onSelectRep={handleSelectRep}
        />
      )}

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.hasAnyData ? (
        <NoDataState days={days} skill={selectedSkill} />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={data.chartPoints}
              margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="day"
                type="number"
                domain={[0, 30]}
                ticks={[0, 7, 30]}
                tickFormatter={v => v === 0 ? 'Day 0' : `Day ${v}`}
                tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                axisLine={{ stroke: AXIS_COLOR }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Benchmark reference line */}
              {benchmark !== null && (
                <ReferenceLine
                  y={benchmark}
                  stroke="rgba(255,255,255,0.12)"
                  strokeDasharray="4 3"
                  label={{
                    value: `Benchmark ${benchmark}`,
                    position: 'right',
                    fill: 'rgba(255,255,255,0.3)',
                    fontSize: 9,
                    fontFamily: 'DM Mono, monospace',
                  }}
                />
              )}

              {/* Team average — solid coral line */}
              <Line
                type="monotone"
                dataKey="teamAvg"
                name="Team avg"
                stroke={TEAM_LINE_COLOR}
                strokeWidth={2.5}
                dot={{ fill: TEAM_LINE_COLOR, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />

              {/* Selected rep overlay — thinner indigo line */}
              {selectedRep && (
                <Line
                  type="monotone"
                  dataKey={selectedRep.repId}
                  name={selectedRep.repName}
                  stroke={REP_LINE_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={{ fill: REP_LINE_COLOR, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>

          {/* Rep summary table below chart */}
          <RepSummaryTable reps={data.reps} selectedRepId={selectedRepId} onSelectRep={handleSelectRep} />
        </motion.div>
      )}

      {/* Legend */}
      {!isLoading && data?.hasAnyData && (
        <div className="mt-4 pt-3 border-t border-[rgb(var(--border-default))] flex flex-wrap gap-4 text-xs text-[rgb(var(--text-muted))]">
          <LegendLine color={TEAM_LINE_COLOR} solid label="Team average" />
          <LegendLine color={REP_LINE_COLOR}  solid={false} label="Selected rep" />
          <span className="opacity-60">
            Chart gaps = fewer than {2} reps with data at that time point.
            Day 7 &amp; Day 30 data populates from spaced repetition assessments.
          </span>
        </div>
      )}
    </div>
  )
}

// ── Rep summary table (below chart) ──────────────────────────────────────────

function RepSummaryTable({
  reps,
  selectedRepId,
  onSelectRep,
}: {
  reps: RepDecayProfile[]
  selectedRepId: string | null
  onSelectRep: (id: string) => void
}) {
  if (reps.length === 0) return null

  return (
    <div className="mt-5 border border-[rgb(var(--border-default))]">
      <div
        className="grid text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] bg-[rgb(var(--bg-canvas))] px-3 py-2"
        style={{ gridTemplateColumns: '1fr 5rem 5rem 5rem 4rem' }}
      >
        <span>Rep</span>
        <span className="text-center">Day 0</span>
        <span className="text-center">Day 7</span>
        <span className="text-center">Day 30</span>
        <span className="text-center">Drop</span>
      </div>

      {reps.map(rep => {
        const drop = rep.day0 !== null && rep.day30 !== null
          ? Math.round(rep.day0 - rep.day30)
          : null
        const isSelected = selectedRepId === rep.repId

        return (
          <button
            key={rep.repId}
            onClick={() => onSelectRep(rep.repId)}
            className={[
              'w-full grid items-center px-3 py-2 text-sm transition-colors duration-150 border-t border-[rgb(var(--border-default))]',
              isSelected
                ? 'bg-[#6366F118]'
                : 'hover:bg-[rgb(var(--bg-canvas))]',
            ].join(' ')}
            style={{ gridTemplateColumns: '1fr 5rem 5rem 5rem 4rem' }}
          >
            <span className="text-left flex items-center gap-1.5 font-medium text-[rgb(var(--text-primary))]">
              {rep.hasAlert && <AlertTriangle className="w-3 h-3 text-[#FF6B6B] shrink-0" />}
              {rep.repName}
            </span>
            <span className="text-center tabular-nums" style={{ fontFamily: 'Oswald, sans-serif' }}>{fmt(rep.day0)}</span>
            <span className="text-center tabular-nums text-[rgb(var(--text-muted))]" style={{ fontFamily: 'Oswald, sans-serif' }}>{fmt(rep.day7)}</span>
            <span className="text-center tabular-nums" style={{ fontFamily: 'Oswald, sans-serif' }}>{fmt(rep.day30)}</span>
            <span
              className="text-center tabular-nums font-bold"
              style={{
                fontFamily: 'Oswald, sans-serif',
                color: drop !== null && drop > 15 ? '#FF6B6B'
                     : drop !== null && drop > 8  ? '#F59E0B'
                     : '#10B981',
              }}
            >
              {drop !== null ? (drop > 0 ? `−${drop}` : `+${Math.abs(drop)}`) : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── No data state ─────────────────────────────────────────────────────────────

function NoDataState({ days, skill }: { days: number; skill: SkillKey }) {
  const meta = SKILL_BENCHMARKS.find(s => s.key === skill)!
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-3 text-center border border-dashed border-[rgb(var(--border-default))]">
      <Brain className="w-8 h-8 text-[rgb(var(--text-muted))]" />
      <p className="text-sm text-[rgb(var(--text-secondary))] font-medium">
        No retention data for {meta.label}
      </p>
      <p className="text-xs text-[rgb(var(--text-muted))] max-w-xs">
        {meta.dataQuality === 'none'
          ? 'This skill has no scoring source yet. Data will appear once the training pipeline is extended.'
          : `No completed training sessions found in the last ${days} days with day-7 or day-30 follow-up assessments.`}
      </p>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function LegendLine({ color, solid, label }: { color: string; solid: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="20" height="8" className="shrink-0">
        <line
          x1="0" y1="4" x2="20" y2="4"
          stroke={color}
          strokeWidth={solid ? 2.5 : 1.5}
          strokeDasharray={solid ? undefined : '4 2'}
        />
      </svg>
      <span>{label}</span>
    </div>
  )
}
