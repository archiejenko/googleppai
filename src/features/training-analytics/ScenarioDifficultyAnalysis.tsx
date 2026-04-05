import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, TrendingUp, Minus, TrendingDown } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import {
  useScenarioDifficulty,
  useRepAttemptHistory,
  HARD_AVG_ATTEMPTS,
  FAIL_POINT_LABELS,
  type ScenarioDifficulty,
  type RepScenarioHistory,
  type Trajectory,
} from '../../hooks/useScenarioDifficulty';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL      = '#FF6B6B'
const AMBER      = '#F59E0B'
const GREEN      = '#10B981'
const GRID_COLOR = 'rgba(255,255,255,0.04)'
const AXIS_COLOR = 'rgba(255,255,255,0.2)'

function barColor(avg: number): string {
  if (avg > HARD_AVG_ATTEMPTS) return CORAL
  if (avg > 1.5)               return AMBER
  return GREEN
}

const TRAJECTORY_CONFIG: Record<Trajectory, {
  label: string
  color: string
  Icon:  React.ComponentType<{ className?: string }>
}> = {
  improving:  { label: 'Improving',  color: GREEN, Icon: TrendingUp   },
  plateauing: { label: 'Plateauing', color: AMBER, Icon: Minus        },
  declining:  { label: 'Declining',  color: CORAL, Icon: TrendingDown },
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

// ── Rep list hook (for the rep-history dropdown) ──────────────────────────────

function useRepListForDifficulty() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['rep-list-difficulty'],
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

// ── Scenario difficulty chart (left panel) ────────────────────────────────────

interface DiffTooltipProps {
  active?:  boolean
  payload?: { value: number; payload: ScenarioDifficulty }[]
}

function DiffTooltip({ active, payload }: DiffTooltipProps) {
  if (!active || !payload?.length) return null
  const sc = payload[0].payload
  return (
    <div
      className="px-3 py-2 text-xs"
      style={{ backgroundColor: '#161618', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc', borderRadius: 0, fontFamily: 'DM Sans, sans-serif' }}
    >
      <div className="font-bold text-[rgb(var(--text-primary))] mb-1 max-w-[160px] truncate">{sc.scenarioName}</div>
      <div className="flex justify-between gap-4">
        <span className="text-[rgb(var(--text-muted))]">Avg attempts</span>
        <span className="font-bold tabular-nums" style={{ fontFamily: 'Oswald, sans-serif', color: barColor(sc.avgAttemptsToPass) }}>
          {sc.avgAttemptsToPass.toFixed(1)}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[rgb(var(--text-muted))]">Pass rate</span>
        <span className="font-bold tabular-nums" style={{ fontFamily: 'Oswald, sans-serif' }}>
          {Math.round(sc.passRate * 100)}%
        </span>
      </div>
      {sc.failPointLabel && (
        <div className="mt-1 pt-1 border-t border-[rgba(255,255,255,0.08)] text-[rgb(var(--text-muted))]">
          Top fail: {sc.failPointLabel}
        </div>
      )}
    </div>
  )
}

function ScenarioExpandPanel({ scenario }: { scenario: ScenarioDifficulty }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[rgba(255,255,255,0.06)]">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Pass Rate</p>
            <p
              className="text-xl font-black tabular-nums"
              style={{ fontFamily: 'Oswald, sans-serif', color: scenario.passRate >= 0.7 ? GREEN : scenario.passRate >= 0.4 ? AMBER : CORAL }}
            >
              {Math.round(scenario.passRate * 100)}%
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Rep Count</p>
            <p className="text-xl font-black tabular-nums" style={{ fontFamily: 'Oswald, sans-serif' }}>
              {scenario.repCount}
            </p>
          </div>
        </div>
        {scenario.failPointLabel && (
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Most Common Fail Point</p>
            <p className="text-xs font-semibold text-[#FF6B6B] mt-0.5">{scenario.failPointLabel}</p>
          </div>
        )}
        {scenario.difficultyLabel && (
          <p className="text-[10px] text-[rgb(var(--text-muted))]">
            Difficulty setting: {scenario.difficultyLabel}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function DifficultyChart({
  scenarios,
  expandedId,
  onExpand,
}: {
  scenarios:  ScenarioDifficulty[]
  expandedId: string | null
  onExpand:   (id: string) => void
}) {
  if (scenarios.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-[rgb(var(--text-muted))] border border-dashed border-[rgb(var(--border-default))]">
        No scenario data for this period
      </div>
    )
  }

  const chartData = scenarios.slice(0, 12).map(sc => ({
    ...sc,
    label: sc.scenarioName.length > 16 ? sc.scenarioName.slice(0, 14) + '…' : sc.scenarioName,
  }))

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 36)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          onClick={e => { const ep = (e as unknown as { activePayload?: { payload: ScenarioDifficulty }[] }); if (ep?.activePayload?.[0]) onExpand(ep.activePayload[0].payload.scenarioId) }}
        >
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tick={{ fill: AXIS_COLOR, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
            axisLine={{ stroke: AXIS_COLOR }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fill: AXIS_COLOR, fontSize: 9, fontFamily: 'DM Sans, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<DiffTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <ReferenceLine
            x={HARD_AVG_ATTEMPTS}
            stroke="rgba(255,107,107,0.4)"
            strokeDasharray="4 3"
            label={{ value: 'Hard', position: 'top', fill: CORAL, fontSize: 9 }}
          />
          <Bar dataKey="avgAttemptsToPass" radius={0} cursor="pointer">
            {chartData.map(sc => (
              <Cell key={sc.scenarioId} fill={barColor(sc.avgAttemptsToPass)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <AnimatePresence>
        {expandedId && (() => {
          const sc = scenarios.find(s => s.scenarioId === expandedId)
          return sc ? (
            <div key={expandedId} className="border border-[rgb(var(--border-default))]">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[rgb(var(--text-primary))] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                onClick={() => onExpand(expandedId)}
              >
                <span className="truncate">{sc.scenarioName}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 rotate-90" />
              </button>
              <ScenarioExpandPanel scenario={sc} />
            </div>
          ) : null
        })()}
      </AnimatePresence>
    </div>
  )
}

// ── Rep attempt history dots ──────────────────────────────────────────────────

function AttemptDots({ attempts }: { attempts: RepScenarioHistory['attempts'] }) {
  return (
    <div className="flex items-end gap-1.5 h-8">
      {attempts.map((a, i) => {
        const pct    = a.score !== null ? a.score / 100 : 0
        const height = Math.max(4, Math.round(pct * 28))
        const color  = a.passed ? GREEN : a.score !== null && a.score >= 55 ? AMBER : CORAL
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-3 shrink-0 rounded-sm"
              style={{ height, backgroundColor: color, opacity: 0.85 }}
              title={`Attempt ${a.attemptNumber}: ${a.score ?? '—'}${a.failPoint ? ` · fail: ${FAIL_POINT_LABELS[a.failPoint] ?? a.failPoint}` : ''}`}
            />
          </div>
        )
      })}
    </div>
  )
}

function RepHistoryCard({ history }: { history: RepScenarioHistory }) {
  const cfg  = TRAJECTORY_CONFIG[history.trajectory]
  const TIcon = cfg.Icon

  return (
    <div className="border border-[rgb(var(--border-default))] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[rgb(var(--text-primary))] truncate">{history.scenarioName}</p>
          <p className="text-[9px] text-[rgb(var(--text-muted))] mt-0.5">
            {history.attempts.length} attempt{history.attempts.length !== 1 ? 's' : ''}
            {history.bestScore !== null ? ` · best ${Math.round(history.bestScore)}` : ''}
          </p>
        </div>
        <span
          className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5"
          style={{ color: cfg.color, backgroundColor: `${cfg.color}18`, border: `1px solid ${cfg.color}44` }}
          data-trajectory={history.trajectory}
        >
          <TIcon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>
      </div>
      <AttemptDots attempts={history.attempts} />
      <p className="text-[9px]">
        {history.everPassed
          ? <span style={{ color: GREEN }}>Passed ✓</span>
          : <span style={{ color: CORAL }}>Not yet passed</span>}
      </p>
    </div>
  )
}

// ── Rep history panel (right panel) ──────────────────────────────────────────

function RepHistoryPanel({
  days,
  selectedRepId,
  setSelectedRepId,
}: {
  days:             number
  selectedRepId:    string | null
  setSelectedRepId: (id: string | null) => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { data: repProfiles }           = useRepListForDifficulty()
  const { data: history, isLoading }    = useRepAttemptHistory(selectedRepId, days)
  const selectedName = repProfiles?.find(r => r.id === selectedRepId)?.name

  return (
    <div className="flex flex-col gap-4">
      {/* Rep selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--text-muted))] transition-colors"
        >
          <span className="truncate">{selectedName ?? 'Select rep for history'}</span>
          <ChevronDown className="w-3 h-3 shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#161618] border border-[rgb(var(--border-default))] shadow-xl">
            <button
              onClick={() => { setSelectedRepId(null); setDropdownOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs text-[rgb(var(--text-muted))] hover:bg-[rgba(255,255,255,0.05)]"
            >
              — Clear selection
            </button>
            {(repProfiles ?? []).map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedRepId(r.id); setDropdownOpen(false) }}
                className={[
                  'w-full text-left px-3 py-2 text-xs transition-colors',
                  selectedRepId === r.id
                    ? 'bg-[rgb(var(--accent-primary))] text-white'
                    : 'text-[rgb(var(--text-primary))] hover:bg-[rgba(255,255,255,0.05)]',
                ].join(' ')}
              >
                {r.name}
              </button>
            ))}
            {(repProfiles ?? []).length === 0 && (
              <div className="px-3 py-2 text-xs text-[rgb(var(--text-muted))]">No reps with data</div>
            )}
          </div>
        )}
      </div>

      {/* History content */}
      {!selectedRepId ? (
        <div className="flex items-center justify-center text-xs text-[rgb(var(--text-muted))] border border-dashed border-[rgb(var(--border-default))] py-10 text-center px-4">
          Select a rep to view their attempt history and score trajectory per scenario.
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !history || history.length === 0 ? (
        <div className="flex items-center justify-center text-xs text-[rgb(var(--text-muted))] border border-dashed border-[rgb(var(--border-default))] py-10">
          No attempt history for this rep in the selected period.
        </div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {history.map(h => (
            <RepHistoryCard key={h.scenarioId} history={h} />
          ))}
        </div>
      )}

      {/* Trajectory legend */}
      {!isLoading && history && history.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[9px] text-[rgb(var(--text-muted))]">
          {(['improving', 'plateauing', 'declining'] as Trajectory[]).map(t => {
            const cfg = TRAJECTORY_CONFIG[t]
            const Ic = cfg.Icon
            return (
              <div key={t} className="flex items-center gap-1" style={{ color: cfg.color }}>
                <Ic className="w-2.5 h-2.5" />
                <span>{cfg.label}</span>
              </div>
            )
          })}
          <span className="opacity-60">Bar height = score</span>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export interface ScenarioDifficultyAnalysisProps {
  days: 30 | 60 | 90
}

export default function ScenarioDifficultyAnalysis({ days }: ScenarioDifficultyAnalysisProps) {
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null)
  const [selectedRepId,      setSelectedRepId]      = useState<string | null>(null)

  const { data: scenarios, isLoading } = useScenarioDifficulty(days)

  const hardCount = scenarios?.filter(s => s.isHard).length ?? 0

  function toggleExpand(id: string) {
    setExpandedScenarioId(prev => prev === id ? null : id)
  }

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="mb-5">
        <h2
          className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Scenario Difficulty
        </h2>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Attempt analysis · fail point breakdown · rep score trajectory
          {!isLoading && hardCount > 0 && (
            <span className="ml-2 text-[#FF6B6B] font-bold">· {hardCount} hard scenario{hardCount !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: scenario difficulty bar chart */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-3">
            Avg Attempts to Pass — Sorted Hardest First
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <DifficultyChart
              scenarios={scenarios ?? []}
              expandedId={expandedScenarioId}
              onExpand={toggleExpand}
            />
          )}

          {/* Legend */}
          {!isLoading && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-[rgb(var(--text-muted))]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: CORAL }} />
                <span>&gt;{HARD_AVG_ATTEMPTS} avg (hard)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: AMBER }} />
                <span>1.5–{HARD_AVG_ATTEMPTS}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: GREEN }} />
                <span>&lt;1.5 (easy)</span>
              </div>
              <span className="opacity-60">Click a bar for details</span>
            </div>
          )}
        </div>

        {/* Right: rep attempt history */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] mb-3">
            Rep Attempt History
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8" />
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <RepHistoryPanel
              days={days}
              selectedRepId={selectedRepId}
              setSelectedRepId={setSelectedRepId}
            />
          )}
        </div>

      </div>
    </div>
  )
}
