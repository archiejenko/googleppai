/**
 * BuyingSignalInsightCard — L6
 *
 * Single stat card shown below CoachingQueue in TrainingDashboard.
 * "Team missing X% of buying signals. Most missed: [type]."
 * Wrapped in TierGate.
 */

import TierGate from '../../components/shared/TierGate'
import { useTeamBuyingSignalInsight, SIGNAL_TYPE_LABELS } from '../../hooks/useCallBuyingSignals'

function BuyingSignalInsightCardInner({ days }: { days: number }) {
  const { data, isLoading } = useTeamBuyingSignalInsight(days)

  if (isLoading) {
    return (
      <div className="animate-pulse flex gap-4 items-center">
        <div className="h-3 w-48 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-3 w-32 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  if (!data || data.total_signals === 0) return null

  const { team_missed_rate, most_missed_type, total_missed, total_signals } = data
  const color = team_missed_rate > 50 ? '#FF6B6B' : team_missed_rate > 25 ? '#F59E0B' : '#10B981'

  return (
    <div
      className="border px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
      style={{ borderColor: `${color}44`, backgroundColor: `${color}08` }}
    >
      <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color }}>
        Buying Signals
      </span>
      <p className="text-xs text-[rgb(var(--text-secondary))]">
        Team missing{' '}
        <span className="font-bold" style={{ color }}>
          {team_missed_rate}%
        </span>
        {' '}of buying signals ({total_missed}/{total_signals}).
        {most_missed_type && (
          <> Most missed: <span className="font-bold">{SIGNAL_TYPE_LABELS[most_missed_type]}</span>.</>
        )}
      </p>
    </div>
  )
}

export default function BuyingSignalInsightCard({ days }: { days: number }) {
  return (
    <TierGate>
      <BuyingSignalInsightCardInner days={days} />
    </TierGate>
  )
}
