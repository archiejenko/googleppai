import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import {
  useSessionEngagementHeatmap,
  type HeatmapCell,
  type WeeklyPoint,
  type DropOffAlert,
} from '../../hooks/useSessionEngagementHeatmap';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL       = '#FF6B6B'
const GRID_COLOR  = 'rgba(255,255,255,0.04)'
const AXIS_COLOR  = 'rgba(255,255,255,0.2)'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CELL_BG: Record<'none' | 'low' | 'medium' | 'high' | 'future', string> = {
  none:   'rgba(255,255,255,0.03)',
  low:    '#FF6B6B26',
  medium: '#FF6B6B4D',
  high:   CORAL,
  future: 'transparent',
}

function cellIntensity(count: number, isFuture: boolean): 'none' | 'low' | 'medium' | 'high' | 'future' {
  if (isFuture) return 'future'
  if (count === 0)  return 'none'
  if (count <= 2)   return 'low'
  if (count <= 4)   return 'medium'
  return 'high'
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

// ── Drop-off alert strip ──────────────────────────────────────────────────────

function DropOffAlertStrip({ alerts }: { alerts: DropOffAlert[] }) {
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
          Training Drop-Off Detected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {alerts.map(alert => (
          <div
            key={alert.repId}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#FF6B6B18] text-[#FF6B6B]"
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{alert.repName}</span>
            <span className="opacity-70">{alert.streakDays}d gap · call score ↓</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[rgb(var(--text-muted))] mt-2">
        Reps with {10}+ consecutive days without training sessions whose live call score
        is declining in the same period.
      </p>
    </motion.div>
  )
}

// ── Heatmap tooltip ───────────────────────────────────────────────────────────

interface CellTooltipProps {
  cell:     HeatmapCell
  repName?: string
  style?:   React.CSSProperties
}

function CellTooltip({ cell, repName, style }: CellTooltipProps) {
  const formatted = new Date(cell.date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div
      className="pointer-events-none absolute z-50 px-3 py-2 text-xs min-w-[140px]"
      style={{
        backgroundColor: '#161618',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#f8fafc',
        fontFamily: 'DM Sans, sans-serif',
        borderRadius: 0,
        ...style,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1.5">
        {formatted}
      </div>
      {repName && (
        <div className="text-[11px] text-[rgb(var(--text-muted))] mb-1">{repName}</div>
      )}
      <div className="flex justify-between gap-4">
        <span className="text-[rgb(var(--text-muted))]">Sessions</span>
        <span className="font-bold tabular-nums" style={{ fontFamily: 'Oswald, sans-serif', color: CORAL }}>
          {cell.sessionCount}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[rgb(var(--text-muted))]">Avg score</span>
        <span className="font-bold tabular-nums" style={{ fontFamily: 'Oswald, sans-serif' }}>
          {cell.avgScore !== null ? Math.round(cell.avgScore) : '—'}
        </span>
      </div>
    </div>
  )
}

// ── Heatmap grid ──────────────────────────────────────────────────────────────

interface HeatmapGridProps {
  cells:   HeatmapCell[]
  repName?: string
}

function HeatmapGrid({ cells, repName }: HeatmapGridProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos]  = useState<{ top: number; left: number } | null>(null)

  const hoveredCell = hoveredDate ? cells.find(c => c.date === hoveredDate) ?? null : null

  // Group by week (rows)
  const weeks: HeatmapCell[][] = Array.from({ length: 8 }, (_, wi) =>
    cells.filter(c => c.weekIndex === wi).sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  )

  // Week start labels (left column)
  const weekLabels = weeks.map(w => {
    if (!w[0]) return ''
    const d = new Date(w[0].date + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
  })

  return (
    <div className="relative select-none">
      {/* Day-of-week header */}
      <div className="flex gap-1 mb-1 ml-[4.5rem]">
        {DAY_LABELS.map(d => (
          <div
            key={d}
            className="w-8 text-center text-[9px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="space-y-1">
        {weeks.map((weekCells, wi) => (
          <div key={wi} className="flex items-center gap-1">
            {/* Week label */}
            <div className="w-16 text-right pr-2 text-[9px] text-[rgb(var(--text-muted))] shrink-0 font-mono">
              {weekLabels[wi]}
            </div>

            {/* 7 day cells */}
            {weekCells.map(cell => {
              const intensity = cellIntensity(cell.sessionCount, cell.isFuture)
              const bg = CELL_BG[intensity]
              const isHovered = hoveredDate === cell.date

              return (
                <div
                  key={cell.date}
                  className={[
                    'w-8 h-8 transition-all duration-75 cursor-default',
                    cell.isFuture ? 'opacity-0 pointer-events-none' : '',
                    isHovered ? 'ring-1 ring-white ring-opacity-40' : '',
                  ].join(' ')}
                  style={{ backgroundColor: bg }}
                  onMouseEnter={e => {
                    if (cell.isFuture) return
                    setHoveredDate(cell.date)
                    const rect = (e.target as HTMLElement).getBoundingClientRect()
                    const parent = (e.target as HTMLElement).closest('[data-heatmap-root]')?.getBoundingClientRect()
                    if (parent) {
                      setTooltipPos({
                        top:  rect.bottom - parent.top + 4,
                        left: Math.min(rect.left - parent.left, parent.width - 160),
                      })
                    }
                  }}
                  onMouseLeave={() => { setHoveredDate(null); setTooltipPos(null) }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredCell && tooltipPos && (
        <CellTooltip
          cell={hoveredCell}
          repName={repName}
          style={{ top: tooltipPos.top, left: tooltipPos.left, position: 'absolute' }}
        />
      )}
    </div>
  )
}

// ── Score trend chart ─────────────────────────────────────────────────────────

const trendTooltipStyle = {
  backgroundColor: '#161618',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f8fafc',
  fontSize: 11,
  fontFamily: 'DM Sans, sans-serif',
  borderRadius: 0,
}

interface TrendTooltipProps {
  active?:  boolean
  payload?: { value: number | null; payload: WeeklyPoint }[]
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null
  const pt = payload[0].payload

  return (
    <div style={trendTooltipStyle} className="px-3 py-2">
      <div className="text-[10px] text-[rgb(var(--text-muted))] mb-1">{pt.weekLabel}</div>
      <div className="flex justify-between gap-4">
        <span className="text-[rgb(var(--text-muted))]">Avg score</span>
        <span className="font-bold" style={{ fontFamily: 'Oswald, sans-serif', color: CORAL }}>
          {pt.avgScore !== null ? Math.round(pt.avgScore) : '—'}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[rgb(var(--text-muted))]">Sessions</span>
        <span className="font-bold tabular-nums">{pt.totalSessions}</span>
      </div>
    </div>
  )
}

function ScoreTrendChart({ weeklyPoints }: { weeklyPoints: WeeklyPoint[] }) {
  const hasAny = weeklyPoints.some(p => p.avgScore !== null)
  if (!hasAny) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-[rgb(var(--text-muted))]">
        No score data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={96}>
      <LineChart
        data={weeklyPoints}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
      >
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="weekLabel"
          tick={{ fill: AXIS_COLOR, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
          axisLine={{ stroke: AXIS_COLOR }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 50, 100]}
          tick={{ fill: AXIS_COLOR, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <Tooltip content={<TrendTooltip />} />
        <Line
          type="monotone"
          dataKey="avgScore"
          name="Avg score"
          stroke={CORAL}
          strokeWidth={2}
          dot={{ fill: CORAL, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface SessionEngagementHeatmapProps {
  days: 30 | 60 | 90
  /** Injectable anchor date for deterministic tests — defaults to today. */
  anchor?: Date
}

type ViewMode = 'team' | 'rep'

export default function SessionEngagementHeatmap({ anchor }: SessionEngagementHeatmapProps) {
  const [viewMode,       setViewMode]       = useState<ViewMode>('team')
  const [selectedRepId,  setSelectedRepId]  = useState<string | null>(null)
  const [repDropdownOpen, setRepDropdownOpen] = useState(false)

  const { data, isLoading } = useSessionEngagementHeatmap(anchor)

  const activeCells        = viewMode === 'team' || !selectedRepId
    ? (data?.teamCells ?? [])
    : (data?.repCells[selectedRepId] ?? [])

  const activeWeeklyPoints = viewMode === 'team' || !selectedRepId
    ? (data?.teamWeeklyPoints ?? [])
    : (data?.repWeeklyPoints[selectedRepId] ?? [])

  const selectedRepName = data?.reps.find(r => r.id === selectedRepId)?.name

  function handleViewMode(mode: ViewMode) {
    setViewMode(mode)
    if (mode === 'team') setSelectedRepId(null)
    setRepDropdownOpen(false)
  }

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2
            className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            Session Engagement
          </h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Most recent 8 weeks · fixed window, unaffected by period toggle above
          </p>
        </div>

        {/* View toggle + rep selector */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Team / Individual toggle */}
          <div className="flex border border-[rgb(var(--border-default))]">
            {(['team', 'rep'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => handleViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={[
                  'px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors duration-150',
                  viewMode === mode
                    ? 'bg-[rgb(var(--accent-primary))] text-white'
                    : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] bg-transparent',
                ].join(' ')}
              >
                {mode === 'team' ? 'Team' : 'Individual'}
              </button>
            ))}
          </div>

          {/* Rep selector dropdown (visible in rep mode) */}
          {viewMode === 'rep' && (
            <div className="relative">
              <button
                onClick={() => setRepDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--text-muted))] transition-colors min-w-[10rem] justify-between"
              >
                <span className="truncate">
                  {selectedRepName ?? (isLoading ? '…' : 'Select rep')}
                </span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>

              {repDropdownOpen && !isLoading && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[10rem] bg-[#161618] border border-[rgb(var(--border-default))] shadow-xl">
                  {(data?.reps ?? []).map(rep => (
                    <button
                      key={rep.id}
                      onClick={() => {
                        setSelectedRepId(rep.id)
                        setRepDropdownOpen(false)
                      }}
                      className={[
                        'w-full text-left px-3 py-2 text-xs transition-colors duration-100',
                        selectedRepId === rep.id
                          ? 'bg-[rgb(var(--accent-primary))] text-white'
                          : 'text-[rgb(var(--text-primary))] hover:bg-[rgba(255,255,255,0.05)]',
                      ].join(' ')}
                    >
                      {rep.name}
                    </button>
                  ))}
                  {(data?.reps ?? []).length === 0 && (
                    <div className="px-3 py-2 text-xs text-[rgb(var(--text-muted))]">No reps with data</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drop-off alerts (team-scoped, always shown) */}
      {!isLoading && (
        <DropOffAlertStrip alerts={data?.dropOffAlerts ?? []} />
      )}

      {/* Heatmap */}
      {isLoading ? (
        <div className="space-y-1">
          {/* Day header skeleton */}
          <div className="flex gap-1 mb-1 ml-[4.5rem]">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="w-8 h-3" />
            ))}
          </div>
          {/* Grid rows skeleton */}
          {Array.from({ length: 8 }).map((_, wi) => (
            <div key={wi} className="flex items-center gap-1">
              <Skeleton className="w-16 h-3 mr-2" />
              {Array.from({ length: 7 }).map((_, di) => (
                <Skeleton key={di} className="w-8 h-8" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          data-heatmap-root
        >
          <HeatmapGrid cells={activeCells} repName={selectedRepName} />
        </motion.div>
      )}

      {/* Score trend chart */}
      <div className="mt-6 pt-4 border-t border-[rgb(var(--border-default))]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-2">
          Avg Session Score — 8-Week Trend
          {viewMode === 'rep' && selectedRepName ? ` · ${selectedRepName}` : ' · Team'}
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ScoreTrendChart weeklyPoints={activeWeeklyPoints} />
        )}
      </div>

      {/* Legend */}
      {!isLoading && (
        <div className="mt-4 pt-3 border-t border-[rgb(var(--border-default))] flex flex-wrap items-center gap-4 text-xs text-[rgb(var(--text-muted))]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4" style={{ backgroundColor: CELL_BG.none }} />
            <span>0 sessions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4" style={{ backgroundColor: CELL_BG.low }} />
            <span>1–2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4" style={{ backgroundColor: CELL_BG.medium }} />
            <span>3–4</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4" style={{ backgroundColor: CELL_BG.high }} />
            <span>5+</span>
          </div>
          <span className="opacity-60 ml-auto">
            Hover cells for date, session count &amp; avg score
          </span>
        </div>
      )}
    </div>
  )
}
