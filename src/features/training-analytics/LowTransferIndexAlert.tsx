/**
 * LowTransferIndexAlert — X1
 *
 * Surfaces the 3 lowest-performing training modules as a coaching prompt.
 * Placed on /dashboard/training below existing sections.
 */

import { AlertTriangle } from 'lucide-react'
import { useTransferIndex } from '../../hooks/useTransferIndex'
import { BENCHMARK_BY_KEY } from '../../config/benchmarks'

export default function LowTransferIndexAlert() {
  const { data, isLoading } = useTransferIndex()

  // Bottom 3: scored scenarios sorted ascending, then unscored
  const bottom3 = [...(data ?? [])]
    .filter(s => s.transfer_index_score !== null)
    .sort((a, b) => a.transfer_index_score! - b.transfer_index_score!)
    .slice(0, 3)

  if (isLoading || !bottom3.length) return null

  return (
    <div className="bg-[#161618] border border-[#FF6B6B33]">
      <div className="px-5 py-3 border-b border-[#FF6B6B33] flex items-center gap-2">
        <AlertTriangle size={15} className="text-[#FF6B6B]" />
        <span className="font-display font-bold text-[#FF6B6B] text-sm tracking-wide">
          LOW TRANSFER INDEX — ACTION REQUIRED
        </span>
      </div>
      <div className="divide-y divide-[#2a2a2e]">
        {bottom3.map(s => {
          const skillLabel = BENCHMARK_BY_KEY[s.skill_target]?.label ?? s.skill_target
          const score = s.transfer_index_score!
          return (
            <div key={s.scenario_id} className="px-5 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white font-mono">{s.scenario_name}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Targets: {skillLabel}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono text-sm font-bold" style={{ color: score < 0 ? '#FF6B6B' : '#F59E0B' }}>
                  {score >= 0 ? '+' : ''}{score.toFixed(1)} pts
                </span>
                <p className="text-xs text-[#6b7280] mt-0.5">{s.rep_count} rep{s.rep_count !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="px-5 py-2 border-t border-[#2a2a2e]">
        <p className="text-xs text-[#6b7280]">
          These modules show the lowest real-world skill transfer. Review content or delivery format with trainers.
        </p>
      </div>
    </div>
  )
}
