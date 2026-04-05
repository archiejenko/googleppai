/**
 * NextStepCommitmentRate — L7
 *
 * Hero stat on CallsDashboard.
 * Large Oswald rate %, trend arrow vs previous period,
 * colour coded green >85% / amber 60–85% / coral <60%.
 * Below: log of last 10 calls with green tick or coral cross
 * and next_step_text shown on confirmed calls.
 *
 * Not TierGated — base tier feature.
 */

import { TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from 'lucide-react'
import { useNextStepCommitmentRate } from '../../hooks/useNextStepCommitmentRate'
import { commitmentRateColor, COMMITMENT_RATE_GREEN, COMMITMENT_RATE_AMBER } from '../../config/nextStep'
import { useAuth } from '../../context/AuthContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: string; delta: number }) {
  if (trend === 'up')   return <TrendingUp  className="w-4 h-4 text-[#10B981]" />
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-[#FF6B6B]" />
  return <Minus className="w-4 h-4 text-[rgb(var(--text-muted))]" />
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// ── Component ─────────────────────────────────────────────────────────────────

function NextStepCommitmentRateInner({ repId }: { repId: string }) {
  const { data, isLoading } = useNextStepCommitmentRate(repId)

  const header = (
    <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-4">
      Next Step Commitment Rate
    </p>
  )

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {header}
        <div className="h-16 w-32 bg-[rgb(var(--border-default))] rounded" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-[rgb(var(--border-default))] rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div>
        {header}
        <p className="text-xs text-[rgb(var(--text-muted))]">No call data available yet.</p>
      </div>
    )
  }

  const { rate, trend, trend_delta, confirmed, total, recent_calls } = data
  const color = commitmentRateColor(rate)

  return (
    <div className="space-y-5">
      {header}

      {/* Hero metric */}
      <div className="flex items-end gap-4">
        <span
          className="text-6xl font-black tabular-nums leading-none"
          style={{ fontFamily: 'Oswald, sans-serif', color }}
        >
          {rate}%
        </span>
        <div className="pb-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={trend} delta={trend_delta} />
            <span className="text-[10px] text-[rgb(var(--text-muted))]">
              {trend_delta > 0 ? '+' : ''}{trend_delta}pp vs prev period
            </span>
          </div>
          <p className="text-[10px] text-[rgb(var(--text-muted))]">
            {confirmed}/{total} calls confirmed
          </p>
        </div>
      </div>

      {/* Benchmark reference */}
      <div className="flex gap-4 text-[9px] text-[rgb(var(--text-muted))]">
        <span className="text-[#10B981]">≥{COMMITMENT_RATE_GREEN}% — green</span>
        <span className="text-[#F59E0B]">{COMMITMENT_RATE_AMBER}–{COMMITMENT_RATE_GREEN - 1}% — amber</span>
        <span className="text-[#FF6B6B]">&lt;{COMMITMENT_RATE_AMBER}% — needs coaching</span>
      </div>

      {/* Recent calls log */}
      {recent_calls.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">
            Last {recent_calls.length} calls
          </p>
          {recent_calls.map(row => (
            <div
              key={row.call_id}
              className="flex items-start gap-2.5 py-1.5 border-b border-[rgb(var(--border-default))] last:border-0"
            >
              {row.next_step_confirmed
                ? <CheckCircle className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                : <XCircle    className="w-3.5 h-3.5 text-[#FF6B6B] shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <p className="text-[10px] text-[rgb(var(--text-muted))]">{formatDate(row.call_date)}</p>
                {row.next_step_confirmed && row.next_step_text && (
                  <p className="text-[11px] text-[rgb(var(--text-secondary))] truncate">
                    "{row.next_step_text}"
                  </p>
                )}
                {!row.next_step_confirmed && (
                  <p className="text-[10px] text-[#FF6B6B]">No next step confirmed</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NextStepCommitmentRate() {
  const { user } = useAuth()
  const repId = user?.id ?? ''
  return <NextStepCommitmentRateInner repId={repId} />
}
