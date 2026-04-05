/**
 * TeamObjectionHeatmap — L5
 *
 * Manager view on TrainingDashboard below CoachingQueue.
 * Rows = reps, columns = objection types, cells = avg AER response score.
 * Coral cells = team weakness (score < 50).
 * Wrapped in TierGate.
 */

import TierGate from '../../components/shared/TierGate'
import {
  useTeamObjectionHeatmap,
  OBJECTION_TYPE_LABELS,
  aerScoreColor,
} from '../../hooks/useCallObjections'
import type { ObjectionType } from '../../hooks/useCallObjections'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_OBJECTION_TYPES: ObjectionType[] = [
  'price', 'timing', 'competitor', 'internal_priority',
  'not_now', 'feature_gap', 'trust', 'other',
]

// ── Inner ─────────────────────────────────────────────────────────────────────

function TeamObjectionHeatmapInner({ days }: { days: number }) {
  const { data, isLoading } = useTeamObjectionHeatmap(days)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-48 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-32 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="h-32 flex items-center justify-center border border-dashed border-[rgb(var(--border-default))]">
        <p className="text-xs text-[rgb(var(--text-muted))]">No objection data yet</p>
      </div>
    )
  }

  // Derive unique reps (stable sort by name)
  const repMap = new Map<string, string>()
  for (const cell of data) repMap.set(cell.rep_id, cell.rep_name)
  const reps = [...repMap.entries()].sort((a, b) => a[1].localeCompare(b[1]))

  // Derive which objection types have data
  const activeTypes = ALL_OBJECTION_TYPES.filter(t =>
    data.some(c => c.objection_type === t),
  )

  // Build lookup: repId_type → cell
  const lookup = new Map<string, { avg_response_score: number | null; count: number }>()
  for (const cell of data) {
    lookup.set(`${cell.rep_id}::${cell.objection_type}`, {
      avg_response_score: cell.avg_response_score,
      count:              cell.count,
    })
  }

  return (
    <div className="space-y-3 overflow-x-auto">
      <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
        Team Objection Handling · AER Scores
      </p>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold pb-2 pr-3 min-w-[120px]">
              Rep
            </th>
            {activeTypes.map(t => (
              <th
                key={t}
                className="text-center text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold pb-2 px-1 min-w-[70px]"
              >
                {OBJECTION_TYPE_LABELS[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reps.map(([repId, repName]) => (
            <tr key={repId} className="border-t border-[rgb(var(--border-default))]">
              <td className="py-2 pr-3 text-[rgb(var(--text-secondary))] font-medium whitespace-nowrap">
                {repName}
              </td>
              {activeTypes.map(t => {
                const cell  = lookup.get(`${repId}::${t}`)
                const score = cell?.avg_response_score ?? null
                const color = aerScoreColor(score)
                const isWeak = score !== null && score < 50

                return (
                  <td key={t} className="py-2 px-1 text-center">
                    {score !== null ? (
                      <div
                        className="inline-flex flex-col items-center justify-center w-12 h-8 border"
                        style={{
                          borderColor:     isWeak ? '#FF6B6B44' : 'rgb(var(--border-default))',
                          backgroundColor: isWeak ? 'rgba(255,107,107,0.08)' : 'transparent',
                        }}
                        title={`${cell?.count} objection${(cell?.count ?? 0) !== 1 ? 's' : ''}`}
                      >
                        <span
                          className="text-xs font-black tabular-nums"
                          style={{ color, fontFamily: 'DM Mono, monospace' }}
                        >
                          {score}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[rgb(var(--text-muted))]">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-1">
        {[
          { label: '≥70 — Strong',   color: '#10B981' },
          { label: '40–69 — Watch',  color: '#F59E0B' },
          { label: '<40 — Weak',     color: '#FF6B6B' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-[rgb(var(--text-muted))]">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#FF6B6B] opacity-30" />
          <span className="text-[9px] text-[rgb(var(--text-muted))]">Highlighted = team weakness (&lt;50)</span>
        </div>
      </div>
    </div>
  )
}

// ── Exported wrapper ──────────────────────────────────────────────────────────

export default function TeamObjectionHeatmap({ days = 30 }: { days?: number }) {
  return (
    <TierGate>
      <TeamObjectionHeatmapInner days={days} />
    </TierGate>
  )
}
