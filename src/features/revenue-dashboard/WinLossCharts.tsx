/**
 * WinLossCharts — R11
 * Win and loss reason frequency charts + cross-layer training callout. TierGated.
 */

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useWinLossPatterns } from '../../hooks/useWinLossPatterns'
import { LOSS_REASON_TO_SKILL } from '../../config/dealOutcomeReasons'
import TierGate from '../../components/shared/TierGate'
import type { LossReason } from '../../config/dealOutcomeReasons'

function FreqBar({ reason, count, max, colour }: { reason: string; count: number; max: number; colour: string }) {
  const w = Math.max(4, (count / max) * 220)
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-1.5 h-5 flex-shrink-0" style={{ backgroundColor: colour }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs text-[#9ca3af] truncate flex-1">{reason}</p>
          <span className="font-mono text-xs text-[#6b7280]">{count}</span>
        </div>
        <div className="w-full bg-[#2a2a2e] h-1 mt-0.5">
          <div className="h-1" style={{ width: w, backgroundColor: colour, opacity: 0.6 }} />
        </div>
      </div>
    </div>
  )
}

export default function WinLossCharts() {
  const { data, isLoading } = useWinLossPatterns()

  if (isLoading || !data || data.total === 0) return null

  const topLoss = data.lossFrequencies[0]
  const topLossSkill = topLoss ? LOSS_REASON_TO_SKILL[topLoss.reason as LossReason] : null

  const maxWin = Math.max(...data.winFrequencies.map((f) => f.count), 1)
  const maxLoss = Math.max(...data.lossFrequencies.map((f) => f.count), 1)

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
          Win / Loss Patterns
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Win reasons */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#10B981] mb-3">Win Reasons</p>
            {data.winFrequencies.slice(0, 6).map((f) => (
              <FreqBar key={f.reason} reason={f.reason} count={f.count} max={maxWin} colour="#10B981" />
            ))}
          </div>

          {/* Loss reasons */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#FF6B6B] mb-3">Loss Reasons</p>
            {data.lossFrequencies.slice(0, 6).map((f) => (
              <FreqBar key={f.reason} reason={f.reason} count={f.count} max={maxLoss} colour="#FF6B6B" />
            ))}
          </div>
        </div>

        {/* Cross-layer callout */}
        {topLoss && topLossSkill && (
          <div className="mt-5 border border-[#6366F1]/30 bg-[#6366F1]/5 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                <span className="text-[#f9fafb] font-semibold">
                  {Math.round((topLoss.count / data.total) * 100)}% of losses
                </span>
                {' '}cite <span className="text-[#FF6B6B]">"{topLoss.reason}"</span>
                {' '}— correlates with reps scoring below 50 in{' '}
                <span className="text-[#6366F1]">{topLossSkill}</span>.
                {' '}See Training Dashboard.
              </p>
            </div>
            <Link
              to="/dashboard/training"
              className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#818cf8] transition-colors flex-shrink-0"
            >
              Training <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </section>
    </TierGate>
  )
}
