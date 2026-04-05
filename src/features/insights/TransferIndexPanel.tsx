/**
 * TransferIndexPanel — X1
 *
 * Horizontal bar chart of all training scenarios sorted by Transfer Index
 * descending. Clicking a bar expands a detail row.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'
import { useTransferIndex, type ScenarioTransferIndex } from '../../hooks/useTransferIndex'
import { TRANSFER_INDEX_BANDS, BENCHMARK_BY_KEY } from '../../config/benchmarks'

function BandPill({ band }: { band: ScenarioTransferIndex['transfer_index_band'] }) {
  if (!band) return null
  const { label, color } = TRANSFER_INDEX_BANDS[band]
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 border"
      style={{ color, borderColor: color, background: `${color}18` }}
    >
      {label}
    </span>
  )
}

function ScenarioRow({ s, maxScore }: { s: ScenarioTransferIndex; maxScore: number }) {
  const [expanded, setExpanded] = useState(false)
  const score  = s.transfer_index_score
  const isNull = score === null
  const barPct = isNull ? 0 : Math.max(0, Math.abs(score) / Math.max(maxScore, 1)) * 100
  const barColor = s.transfer_index_band === 'negative' ? '#FF6B6B'
    : s.transfer_index_band === 'high'   ? '#10B981'
    : s.transfer_index_band === 'medium' ? '#F59E0B'
    : '#6366F1'

  const skillLabel = BENCHMARK_BY_KEY[s.skill_target]?.label ?? s.skill_target

  const recommendation =
    s.transfer_index_band === 'high'
      ? 'Replicate this format across the team.'
      : s.transfer_index_band === 'negative' || s.transfer_index_band === 'low'
        ? 'Consider redesigning this module.'
        : 'Monitor — moderate transfer detected.'

  return (
    <div className="border-b border-[#2a2a2e] last:border-0">
      <button
        className="w-full text-left px-4 py-3 hover:bg-[#1c1c1f] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          {/* Scenario name */}
          <span className="font-mono text-sm text-white w-52 shrink-0 truncate">
            {s.scenario_name}
          </span>

          {/* Bar */}
          <div className="flex-1 h-5 bg-[#2a2a2e] relative overflow-hidden">
            {!isNull && (
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{ width: `${barPct}%`, backgroundColor: barColor }}
              />
            )}
          </div>

          {/* Score */}
          <span className="font-mono text-sm w-16 text-right shrink-0" style={{ color: isNull ? '#6b7280' : barColor }}>
            {isNull ? '—' : `${score! >= 0 ? '+' : ''}${score!.toFixed(1)}`}
          </span>

          {/* Band pill */}
          <div className="w-20 flex justify-end shrink-0">
            {!isNull && <BandPill band={s.transfer_index_band} />}
            {isNull && <span className="text-xs text-[#6b7280] font-mono">No data</span>}
          </div>

          {/* Expand icon */}
          <span className="text-[#6b7280] shrink-0">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-[#161618] border-t border-[#2a2a2e]">
          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
            <div>
              <span className="text-[#6b7280]">Skill targeted: </span>
              <span className="text-white font-mono">{skillLabel}</span>
            </div>
            <div>
              <span className="text-[#6b7280]">Reps with data: </span>
              <span className="text-white font-mono">{s.rep_count}</span>
            </div>
            {s.pre_avg !== null && (
              <div>
                <span className="text-[#6b7280]">Pre-training avg: </span>
                <span className="text-white font-mono">{s.pre_avg.toFixed(1)}</span>
              </div>
            )}
            {s.post_avg !== null && (
              <div>
                <span className="text-[#6b7280]">Post-training avg: </span>
                <span className="text-white font-mono">{s.post_avg.toFixed(1)}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-[#F59E0B] border border-[#F59E0B33] px-2 py-1 mt-1">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  )
}

export default function TransferIndexPanel() {
  const { data, isLoading } = useTransferIndex()

  const scenarios = data ?? []
  const scored = scenarios.filter(s => s.transfer_index_score !== null)
  const maxScore = scored.length ? Math.max(...scored.map(s => Math.abs(s.transfer_index_score!))) : 1

  return (
    <div className="bg-[#161618] border border-[#2a2a2e]">
      <div className="px-6 py-4 border-b border-[#2a2a2e] flex items-center gap-3">
        <BarChart2 size={18} className="text-[#FF6B6B]" />
        <div>
          <h2 className="font-display font-bold text-white tracking-wide">TRANSFER INDEX</h2>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Which training modules produce real-world skill improvement within 14 days
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="px-6 py-8 text-center text-[#6b7280] font-mono text-sm">
          Computing transfer indices…
        </div>
      )}

      {!isLoading && !scenarios.length && (
        <div className="px-6 py-8 text-center text-[#6b7280] font-mono text-sm">
          No completed training sessions found.
        </div>
      )}

      {!isLoading && scenarios.length > 0 && (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2a2a2e]">
            <span className="text-xs text-[#6b7280] font-mono w-52 shrink-0">Scenario</span>
            <span className="flex-1 text-xs text-[#6b7280] font-mono">Transfer Index</span>
            <span className="text-xs text-[#6b7280] font-mono w-16 text-right shrink-0">Score</span>
            <span className="text-xs text-[#6b7280] font-mono w-20 text-right shrink-0">Band</span>
            <span className="w-4 shrink-0" />
          </div>

          {scenarios.map(s => (
            <ScenarioRow key={s.scenario_id} s={s} maxScore={maxScore} />
          ))}
        </>
      )}
    </div>
  )
}
