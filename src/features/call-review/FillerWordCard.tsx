/**
 * FillerWordCard — L4
 *
 * Stat card on CallReviewPage showing:
 *   - Filler rate per minute (colour coded: green <2, amber 2-4, coral >4)
 *   - Total filler count
 *   - Top 3 filler words breakdown
 */

import { useFillerWords, fillerSeverity, FILLER_RATE_TARGET, FILLER_RATE_WARNING } from '../../hooks/useFillerWords'
import { topFillers } from '../../config/fillerWords'

// ── Helpers ───────────────────────────────────────────────────────────────────

function rateColor(rate: number): string {
  const sev = fillerSeverity(rate)
  if (sev === 'critical') return '#FF6B6B'
  if (sev === 'warning')  return '#F59E0B'
  return '#10B981'
}

function rateLabel(rate: number): string {
  const sev = fillerSeverity(rate)
  if (sev === 'critical') return 'High — coach needed'
  if (sev === 'warning')  return 'Elevated — watch closely'
  return 'On target'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FillerWordCard({ callId }: { callId: string }) {
  const { data, isLoading } = useFillerWords(callId)

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = (
    <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-4">
      Filler Words
    </p>
  )

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {header}
        <div className="h-10 w-24 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-4 w-40 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  if (!data || (data.filler_word_count === 0 && data.filler_rate_per_min === 0)) {
    return (
      <div>
        {header}
        <p className="text-xs text-[rgb(var(--text-muted))]">No filler data available.</p>
      </div>
    )
  }

  const rate    = data.filler_rate_per_min
  const color   = rateColor(rate)
  const top3    = topFillers(data.filler_words_breakdown, 3)

  return (
    <div className="space-y-5">
      {header}

      {/* Rate hero */}
      <div className="flex items-end gap-3">
        <span
          className="text-4xl font-black tabular-nums leading-none"
          style={{ fontFamily: 'Oswald, sans-serif', color }}
        >
          {rate.toFixed(1)}
        </span>
        <div className="pb-1">
          <p className="text-xs text-[rgb(var(--text-muted))]">fillers / min</p>
          <p className="text-[10px]" style={{ color }}>{rateLabel(rate)}</p>
        </div>
      </div>

      {/* Target reference */}
      <p className="text-[10px] text-[rgb(var(--text-muted))]">
        Target: &lt;{FILLER_RATE_TARGET}/min · Warning: {FILLER_RATE_WARNING}/min
      </p>

      {/* Top 3 breakdown */}
      {top3.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">
            Top fillers
          </p>
          {top3.map(({ key, label, count }) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1 text-xs text-[rgb(var(--text-primary))] font-mono">
                {label}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Bar */}
                <div className="w-20 h-1.5 bg-[rgb(var(--border-default))] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width:           `${Math.min(100, (count / data.filler_word_count) * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="text-xs tabular-nums text-[rgb(var(--text-muted))] w-4 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-[rgb(var(--text-muted))] pt-1">
            {data.filler_word_count} total fillers detected
          </p>
        </div>
      )}
    </div>
  )
}
