/**
 * NextStepLeaderboard — L7
 *
 * Manager panel on TrainingDashboard alongside CoachingQueue.
 * All reps sorted by commitment rate descending.
 * Shows rate %, trend arrow, call count per rep.
 * Not TierGated — base tier feature.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTeamCommitmentLeaderboard } from '../../hooks/useNextStepCommitmentRate'
import { commitmentRateColor } from '../../config/nextStep'

// ── Helpers ───────────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up')   return <TrendingUp  className="w-3 h-3 text-[#10B981]" />
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-[#FF6B6B]" />
  return <Minus className="w-3 h-3 text-[rgb(var(--text-muted))]" />
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NextStepLeaderboard({ days }: { days: number }) {
  const { data, isLoading } = useTeamCommitmentLeaderboard(days)

  return (
    <div className="space-y-3">
      <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
        Next Step Commitment · Team Leaderboard
      </p>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-[rgb(var(--border-default))] rounded" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="h-24 flex items-center justify-center border border-dashed border-[rgb(var(--border-default))]">
          <p className="text-xs text-[rgb(var(--text-muted))]">No commitment data yet</p>
        </div>
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold pb-2 pr-4">Rep</th>
              <th className="text-right text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold pb-2 px-2">Rate</th>
              <th className="text-center text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold pb-2 px-2">Trend</th>
              <th className="text-right text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold pb-2 pl-2">Calls</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const color = commitmentRateColor(row.rate)
              return (
                <tr key={row.rep_id} className="border-t border-[rgb(var(--border-default))]">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[rgb(var(--text-muted))] w-4 shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-[rgb(var(--text-secondary))] font-medium truncate">
                        {row.rep_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span
                      className="text-sm font-black tabular-nums"
                      style={{ fontFamily: 'Oswald, sans-serif', color }}
                    >
                      {row.rate}%
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex justify-center">
                      <TrendIcon trend={row.trend} />
                    </div>
                  </td>
                  <td className="py-2 pl-2 text-right text-[rgb(var(--text-muted))] tabular-nums">
                    {row.call_count}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
