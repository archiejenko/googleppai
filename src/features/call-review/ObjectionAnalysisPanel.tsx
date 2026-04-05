/**
 * ObjectionAnalysisPanel — L5
 *
 * Per-call objection list with:
 *   - Objection type pill
 *   - AER response score bar (0–100)
 *   - Response pattern label (coloured green/amber/coral)
 *   - Expandable: shows objection text + rep response text
 *
 * Wrapped in TierGate (Revenue Intelligence).
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import TierGate from '../../components/shared/TierGate'
import {
  useCallObjections,
  OBJECTION_TYPE_LABELS,
  RESPONSE_PATTERN_LABELS,
  responsePatternColor,
  aerScoreColor,
} from '../../hooks/useCallObjections'
import type { CallObjection } from '../../hooks/useCallObjections'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ObjectionRow({ obj }: { obj: CallObjection }) {
  const [expanded, setExpanded] = useState(false)
  const patternColor = responsePatternColor(obj.response_pattern)
  const scoreColor   = aerScoreColor(obj.rep_response_score)

  return (
    <div className="border border-[rgb(var(--border-default))]">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        {/* Timestamp */}
        <span className="text-[10px] font-mono text-[rgb(var(--text-muted))] shrink-0 w-10">
          {formatTimestamp(obj.objection_timestamp_seconds)}
        </span>

        {/* Type pill */}
        <span className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 border border-[#F59E0B44] text-[#F59E0B] bg-[rgba(245,158,11,0.08)] shrink-0">
          {OBJECTION_TYPE_LABELS[obj.objection_type]}
        </span>

        {/* Score bar */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {obj.rep_response_score !== null ? (
            <>
              <div className="flex-1 h-1.5 bg-[rgb(var(--border-default))] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${obj.rep_response_score}%`, backgroundColor: scoreColor }}
                />
              </div>
              <span className="text-[10px] tabular-nums font-mono shrink-0" style={{ color: scoreColor }}>
                {Math.round(obj.rep_response_score)}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-[rgb(var(--text-muted))]">—</span>
          )}
        </div>

        {/* Response pattern */}
        {obj.response_pattern && (
          <span className="text-[9px] uppercase tracking-widest font-bold shrink-0" style={{ color: patternColor }}>
            {RESPONSE_PATTERN_LABELS[obj.response_pattern]}
          </span>
        )}

        {/* Expand toggle */}
        <span className="shrink-0 text-[rgb(var(--text-muted))]">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[rgb(var(--border-default))] bg-[rgba(255,255,255,0.01)]">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
              Objection
            </p>
            <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
              "{obj.objection_text}"
            </p>
          </div>
          {obj.rep_response_text && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">
                Rep response
              </p>
              <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
                "{obj.rep_response_text}"
              </p>
            </div>
          )}
          {!obj.rep_response_text && (
            <p className="text-xs text-[#FF6B6B]">No rep response detected</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function ObjectionAnalysisPanelInner({ callId }: { callId: string }) {
  const { data: objections, isLoading } = useCallObjections(callId)

  const header = (
    <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-4">
      Objection Analysis
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

  if (!objections?.length) {
    return (
      <div>
        {header}
        <p className="text-xs text-[rgb(var(--text-muted))]">No objections detected in this call.</p>
      </div>
    )
  }

  const avgScore = objections
    .filter(o => o.rep_response_score !== null)
    .reduce((s, o, _, a) => s + (o.rep_response_score ?? 0) / a.length, 0)

  return (
    <div className="space-y-4">
      {header}

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-[rgb(var(--text-muted))]">
        <span>{objections.length} objection{objections.length !== 1 ? 's' : ''} detected</span>
        {objections.length > 0 && (
          <span style={{ color: aerScoreColor(Math.round(avgScore)) }}>
            Avg AER score: {Math.round(avgScore)}
          </span>
        )}
      </div>

      {/* List */}
      <div className="space-y-1">
        {objections.map(obj => (
          <ObjectionRow key={obj.id} obj={obj} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {[
          { label: 'AER Complete',      color: '#10B981' },
          { label: 'Acknowledge Only',  color: '#F59E0B' },
          { label: 'Immediate Counter', color: '#F59E0B' },
          { label: 'No Response',       color: '#FF6B6B' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-[rgb(var(--text-muted))]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ObjectionAnalysisPanel({
  callId,
  onTimestampSelect,
}: {
  callId:             string
  onTimestampSelect?: (ts: number) => void
}) {
  void onTimestampSelect // available for L5+ wiring
  return (
    <TierGate>
      <ObjectionAnalysisPanelInner callId={callId} />
    </TierGate>
  )
}
