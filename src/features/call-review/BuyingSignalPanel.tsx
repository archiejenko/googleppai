/**
 * BuyingSignalPanel — L6
 *
 * Per-call buying signals on CallReviewPage.
 * Signals listed in call order with green (capitalised) / coral (missed) marker.
 * Expandable rows show signal text + rep response text.
 * Summary stat: "X signals detected. Y capitalised (Z%)."
 * Wrapped in TierGate.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import TierGate from '../../components/shared/TierGate'
import {
  useCallBuyingSignals,
  SIGNAL_TYPE_LABELS,
} from '../../hooks/useCallBuyingSignals'
import type { CallBuyingSignal } from '../../hooks/useCallBuyingSignals'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SignalRow({ signal }: { signal: CallBuyingSignal }) {
  const [expanded, setExpanded] = useState(false)
  const capitalised = signal.capitalised ?? false
  const markerColor = capitalised ? '#10B981' : '#FF6B6B'
  const score       = signal.capitalisation_score

  return (
    <div className="border border-[rgb(var(--border-default))]" style={{ borderLeftWidth: 3, borderLeftColor: markerColor }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        {/* Timestamp */}
        <span className="text-[10px] font-mono text-[rgb(var(--text-muted))] shrink-0 w-10">
          {formatTimestamp(signal.signal_timestamp_seconds)}
        </span>

        {/* Type pill */}
        <span
          className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 border shrink-0"
          style={{
            borderColor:     `${markerColor}44`,
            color:           markerColor,
            backgroundColor: `${markerColor}11`,
          }}
        >
          {SIGNAL_TYPE_LABELS[signal.signal_type]}
        </span>

        {/* Status */}
        <span className="flex-1 text-[10px]" style={{ color: markerColor }}>
          {capitalised ? 'Capitalised' : 'Missed'}
        </span>

        {/* Score */}
        {score !== null && (
          <span className="text-[10px] tabular-nums font-mono shrink-0" style={{ color: markerColor }}>
            {Math.round(score)}/100
          </span>
        )}

        <span className="shrink-0 text-[rgb(var(--text-muted))]">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[rgb(var(--border-default))] bg-[rgba(255,255,255,0.01)]">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Signal</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">"{signal.signal_text}"</p>
          </div>
          {signal.rep_response_text ? (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Rep response</p>
              <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">"{signal.rep_response_text}"</p>
            </div>
          ) : (
            <p className="text-xs text-[#FF6B6B]">No rep response detected within 120s</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Inner component ───────────────────────────────────────────────────────────

function BuyingSignalPanelInner({ callId }: { callId: string }) {
  const { data: signals, isLoading } = useCallBuyingSignals(callId)

  const header = (
    <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-4">
      Buying Signals
    </p>
  )

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {header}
        <div className="h-10 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-10 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  if (!signals?.length) {
    return (
      <div>
        {header}
        <p className="text-xs text-[rgb(var(--text-muted))]">No buying signals detected in this call.</p>
      </div>
    )
  }

  const total      = signals.length
  const capitalised = signals.filter(s => s.capitalised).length
  const capPct     = Math.round((capitalised / total) * 100)

  return (
    <div className="space-y-4">
      {header}

      {/* Summary */}
      <p className="text-xs text-[rgb(var(--text-muted))]">
        {total} signal{total !== 1 ? 's' : ''} detected.{' '}
        <span className="text-[#10B981]">{capitalised} capitalised ({capPct}%)</span>
        {total - capitalised > 0 && (
          <span className="text-[#FF6B6B]"> · {total - capitalised} missed</span>
        )}
      </p>

      {/* Signal list */}
      <div className="space-y-1">
        {signals.map(s => <SignalRow key={s.id} signal={s} />)}
      </div>
    </div>
  )
}

// ── Exported wrapper ──────────────────────────────────────────────────────────

export default function BuyingSignalPanel({ callId }: { callId: string }) {
  return (
    <TierGate>
      <BuyingSignalPanelInner callId={callId} />
    </TierGate>
  )
}
