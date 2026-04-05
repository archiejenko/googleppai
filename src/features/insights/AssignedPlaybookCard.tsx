/**
 * AssignedPlaybookCard — X2
 *
 * Shown on rep home dashboard if a playbook has been assigned to them.
 * Displays the narrative and top 3 impactful stats to focus on.
 */

import { BookOpen } from 'lucide-react'
import { useMyPlaybook } from '../../hooks/usePlaybooks'

const TOP_3_STATS = [
  { key: 'transfer_gap',   teamKey: 'transfer_gap_overall', label: 'Transfer Gap',    invert: true,  unit: ''    },
  { key: 'next_step_rate', teamKey: 'next_step_rate',       label: 'Next Step Rate',  invert: false, unit: '%',  pct: true },
  { key: 'pacing_score',   teamKey: 'pacing_score',         label: 'Pacing Score',    invert: false, unit: ''    },
]

function fmt(v: number | null | undefined, unit = '', pct = false) {
  if (v == null) return '—'
  const val = pct ? v * 100 : v
  return `${val.toFixed(1)}${unit}`
}

export default function AssignedPlaybookCard() {
  const { data: playbook, isLoading } = useMyPlaybook()

  if (isLoading || !playbook) return null

  const top  = playbook.stats_snapshot?.top
  const tavg = playbook.stats_snapshot?.team_avg

  return (
    <div className="bg-[#161618] border border-[#6366F133] mb-4">
      <div className="px-5 py-3 border-b border-[#6366F133] flex items-center gap-2">
        <BookOpen size={15} className="text-[#6366F1]" />
        <span className="font-display font-bold text-[#6366F1] text-sm tracking-wide">
          YOUR PLAYBOOK
        </span>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-[#d1d1d3] leading-relaxed mb-4">{playbook.narrative}</p>

        {top && tavg && (
          <div className="grid grid-cols-3 gap-3">
            {TOP_3_STATS.map(({ key, teamKey, label, invert, unit, pct }) => {
              const topVal  = top[key  as keyof typeof top]   as number | null
              const avgVal  = tavg[teamKey as keyof typeof tavg] as number | null
              const better  = topVal != null && avgVal != null
                ? invert ? topVal < avgVal : topVal > avgVal
                : null

              return (
                <div key={key} className="bg-[#1c1c1f] border border-[#2a2a2e] px-3 py-2 text-center">
                  <p className="text-xs text-[#6b7280] font-mono mb-1">{label}</p>
                  <p
                    className="text-lg font-mono font-bold"
                    style={{ color: better === true ? '#10B981' : better === false ? '#FF6B6B' : '#fff' }}
                  >
                    {fmt(topVal, unit, pct)}
                  </p>
                  <p className="text-xs text-[#6b7280] font-mono">
                    Team: {fmt(avgVal, unit, pct)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
