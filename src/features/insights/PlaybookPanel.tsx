/**
 * PlaybookPanel — X2
 *
 * One card per AI-generated coaching playbook.
 * Shows top performer stats vs team average, narrative, and assign control.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { usePlaybooks, useAssignPlaybook } from '../../hooks/usePlaybooks'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../utils/supabase'
import { ANONYMISE_TOP_PERFORMERS } from '../../config/benchmarks'

interface RepOption { id: string; name: string }

function useOrgReps(): RepOption[] {
  const { data } = useQuery({
    queryKey: ['org-reps-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'user')
        .order('name')
      if (error) throw error
      return (data ?? []) as RepOption[]
    },
    staleTime: 10 * 60_000,
  })
  return data ?? []
}

const STAT_LABELS: { key: string; label: string; unit?: string; invert?: boolean }[] = [
  { key: 'transfer_gap',     label: 'Transfer Gap',           invert: true },
  { key: 'talk_ratio',       label: 'Talk Ratio',   unit: '%'              },
  { key: 'next_step_rate',   label: 'Next Step Rate', unit: '%'            },
  { key: 'implication_rate', label: 'Implication Qs', unit: '%'            },
  { key: 'filler_rate',      label: 'Filler Rate',  unit: '/min', invert: true },
  { key: 'pacing_score',     label: 'Pacing Score'                         },
]

function fmt(v: number | null | undefined, unit = '', isPct = false): string {
  if (v == null) return '—'
  const val = isPct ? v * 100 : v
  return `${val.toFixed(1)}${unit}`
}

export default function PlaybookPanel() {
  const { data: playbooks, isLoading } = usePlaybooks()
  const reps = useOrgReps()
  const assign = useAssignPlaybook()
  const [selectedReps, setSelectedReps] = useState<Record<string, string[]>>({})
  const [showAssign, setShowAssign] = useState<string | null>(null)
  const [assigned, setAssigned] = useState<Record<string, boolean>>({})

  if (isLoading) return (
    <div className="bg-[#161618] border border-[#2a2a2e] px-6 py-8 text-center text-[#6b7280] font-mono text-sm">
      Loading playbooks…
    </div>
  )

  if (!playbooks?.length) return (
    <div className="bg-[#161618] border border-[#2a2a2e] px-6 py-8 text-center text-[#6b7280] font-mono text-sm">
      No playbooks generated yet. Playbook Generator runs every Monday at 04:00 UTC.
    </div>
  )

  return (
    <div className="space-y-4">
      {playbooks.map((p, idx) => {
        const topName = ANONYMISE_TOP_PERFORMERS
          ? `Top Performer ${String.fromCharCode(65 + idx)}`
          : (reps.find(r => r.id === p.generated_for_rep_id)?.name ?? `Top Performer ${String.fromCharCode(65 + idx)}`)

        const top  = p.stats_snapshot?.top
        const tavg = p.stats_snapshot?.team_avg
        const sel  = selectedReps[p.id] ?? []
        const isShowingAssign = showAssign === p.id

        const handleAssign = async () => {
          await Promise.all(sel.map(repId => assign.mutateAsync({ playbookId: p.id, repId })))
          setAssigned(prev => ({ ...prev, [p.id]: true }))
          setShowAssign(null)
          setSelectedReps(prev => ({ ...prev, [p.id]: [] }))
        }

        return (
          <div key={p.id} className="bg-[#161618] border border-[#2a2a2e]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#2a2a2e]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display font-bold text-white tracking-wide">
                    WINNING PLAYBOOK — {topName.toUpperCase()}
                  </span>
                  {p.role && (
                    <span className="ml-3 text-xs font-mono text-[#6b7280] border border-[#2a2a2e] px-2 py-0.5">
                      {p.role}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#6b7280] font-mono">
                  Generated {new Date(p.generated_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Narrative */}
            <div className="px-6 py-4 border-b border-[#2a2a2e]">
              <p className="text-sm text-[#d1d1d3] leading-relaxed">{p.narrative}</p>
            </div>

            {/* Stats table */}
            {top && tavg && (
              <div className="px-6 py-4 border-b border-[#2a2a2e]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#6b7280] font-mono">
                      <th className="text-left pb-2">Metric</th>
                      <th className="text-right pb-2">This Rep</th>
                      <th className="text-right pb-2">Team Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a2e]">
                    {STAT_LABELS.map(({ key, label, unit, invert }) => {
                      const topVal  = top[key as keyof typeof top]  as number | null
                      const avgVal  = tavg[key === 'transfer_gap' ? 'transfer_gap_overall' : key as keyof typeof tavg] as number | null
                      const isPct   = unit === '%' && (key === 'next_step_rate' || key === 'implication_rate')
                      const better  = topVal != null && avgVal != null
                        ? invert ? topVal < avgVal : topVal > avgVal
                        : null
                      return (
                        <tr key={key}>
                          <td className="py-1.5 text-[#9ca3af]">{label}</td>
                          <td className="py-1.5 text-right font-mono" style={{ color: better === true ? '#10B981' : better === false ? '#FF6B6B' : '#fff' }}>
                            {fmt(topVal, unit, isPct)}
                          </td>
                          <td className="py-1.5 text-right font-mono text-[#6b7280]">
                            {fmt(avgVal, unit, isPct)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Assign section */}
            <div className="px-6 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {assigned[p.id] && (
                  <span className="flex items-center gap-1 text-xs text-[#10B981] font-mono">
                    <Check size={12} /> Assigned
                  </span>
                )}
                {p.assigned_to_rep_ids.length > 0 && (
                  <span className="text-xs text-[#6b7280] font-mono">
                    {p.assigned_to_rep_ids.length} rep{p.assigned_to_rep_ids.length !== 1 ? 's' : ''} assigned
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 bg-[#6366F1] text-white hover:bg-[#4f52d3] transition-colors"
                  onClick={() => setShowAssign(isShowingAssign ? null : p.id)}
                >
                  Assign to Rep
                  {isShowingAssign ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {isShowingAssign && (
                  <div className="absolute right-0 bottom-full mb-1 w-64 bg-[#1c1c1f] border border-[#2a2a2e] z-10 shadow-xl">
                    <div className="max-h-48 overflow-y-auto">
                      {reps.map(r => (
                        <label key={r.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2e] cursor-pointer text-sm text-white">
                          <input
                            type="checkbox"
                            checked={sel.includes(r.id)}
                            onChange={e => setSelectedReps(prev => ({
                              ...prev,
                              [p.id]: e.target.checked
                                ? [...(prev[p.id] ?? []), r.id]
                                : (prev[p.id] ?? []).filter(id => id !== r.id),
                            }))}
                            className="accent-[#6366F1]"
                          />
                          <span className="font-mono text-xs">{r.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="px-3 py-2 border-t border-[#2a2a2e]">
                      <button
                        disabled={!sel.length || assign.isPending}
                        onClick={handleAssign}
                        className="w-full text-xs font-mono py-1.5 bg-[#6366F1] text-white disabled:opacity-50 hover:bg-[#4f52d3] transition-colors"
                      >
                        {assign.isPending ? 'Assigning…' : `Assign to ${sel.length} rep${sel.length !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
