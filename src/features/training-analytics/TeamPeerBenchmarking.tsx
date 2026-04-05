import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import {
  useTeamPeerBenchmarking,
  computeTeamMedianPercentiles,
  percentileTier,
  percentileLabel,
  type SkillPercentile,
} from '../../hooks/usePeerBenchmarking';
import { useRoleReadiness } from '../../hooks/useRoleReadiness';
import { SKILL_BENCHMARKS, type SkillKey } from '../../config/benchmarks';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B'
const AMBER  = '#F59E0B'
const GREEN  = '#10B981'

const TIER_COLOR: Record<'top' | 'mid' | 'bottom', string> = {
  top:    GREEN,
  mid:    AMBER,
  bottom: CORAL,
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] ${className}`} />
}

// ── Cell pill ─────────────────────────────────────────────────────────────────

function CellPill({ skill }: { skill: SkillPercentile }) {
  if (skill.percentileRank === null || skill.cohortSize < 3) {
    return <span className="text-[10px] text-[rgba(255,255,255,0.2)]">—</span>
  }
  const tier  = percentileTier(skill.percentileRank)
  const color = TIER_COLOR[tier]
  const label = percentileLabel(skill.percentileRank)

  return (
    <span
      className="inline-block px-1.5 py-0.5 text-[8px] font-bold leading-none tabular-nums"
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}33` }}
      data-testid="cell-pill"
      data-tier={tier}
    >
      {label}
    </span>
  )
}

// ── Summary cell ──────────────────────────────────────────────────────────────

function SummaryCell({ median }: { median: number | null }) {
  if (median === null) return <span className="text-[10px] text-[rgba(255,255,255,0.2)]">—</span>

  const tier  = percentileTier(median)
  const color = TIER_COLOR[tier]

  return (
    <span
      className="inline-block px-1.5 py-0.5 text-[8px] font-bold leading-none tabular-nums"
      style={{ color, backgroundColor: `${color}24`, border: `1px solid ${color}44` }}
      data-testid="summary-cell"
      data-tier={tier}
    >
      {Math.round(median)}th
    </span>
  )
}

// ── Sort state ────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'
interface SortState { skill: SkillKey | 'name'; dir: SortDir }

function nextDir(current: SortDir): SortDir {
  return current === 'desc' ? 'asc' : 'desc'
}

function SortIcon({ skill, sort }: { skill: SkillKey | 'name'; sort: SortState }) {
  if (sort.skill !== skill) return <ChevronsUpDown className="w-2.5 h-2.5 opacity-30" />
  return sort.dir === 'desc'
    ? <ChevronDown className="w-2.5 h-2.5 text-[rgb(var(--accent-primary))]" />
    : <ChevronUp   className="w-2.5 h-2.5 text-[rgb(var(--accent-primary))]" />
}

// ── Main component ────────────────────────────────────────────────────────────

export interface TeamPeerBenchmarkingProps {
  days: 30 | 60 | 90
}

export default function TeamPeerBenchmarking({ days }: TeamPeerBenchmarkingProps) {
  const [sort, setSort] = useState<SortState>({ skill: 'name', dir: 'asc' })

  const { data: teamMap, isLoading } = useTeamPeerBenchmarking(days)
  const { data: readiness }          = useRoleReadiness(days)

  // Build rep list from teamMap, keyed by repId
  const repPercentiles = useMemo(() => {
    if (!teamMap) return []
    return [...teamMap.entries()].map(([repId, percs]) => ({ repId, percs }))
  }, [teamMap])

  // Rep name lookup from useRoleReadiness (already fetches profiles)
  const repNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of readiness ?? []) m.set(r.repId, r.repName)
    return m
  }, [readiness])

  // Per-skill median across team
  const teamMedians = useMemo(() => {
    return computeTeamMedianPercentiles(repPercentiles.map(r => r.percs))
  }, [repPercentiles])

  // Helper: get a rep's percentile for a given skill
  function getSkillPerc(percs: SkillPercentile[], skill: SkillKey): SkillPercentile | undefined {
    return percs.find(p => p.skillName === skill)
  }

  // Sorted rows
  const sortedReps = useMemo(() => {
    return [...repPercentiles].sort((a, b) => {
      if (sort.skill === 'name') {
        const an = repNameMap.get(a.repId) ?? ''
        const bn = repNameMap.get(b.repId) ?? ''
        return sort.dir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an)
      }
      const ap = getSkillPerc(a.percs, sort.skill)?.percentileRank ?? -1
      const bp = getSkillPerc(b.percs, sort.skill)?.percentileRank ?? -1
      return sort.dir === 'desc' ? bp - ap : ap - bp
    })
  }, [repPercentiles, sort, repNameMap])

  function handleSortClick(skill: SkillKey | 'name') {
    setSort(prev =>
      prev.skill === skill
        ? { skill, dir: nextDir(prev.dir) }
        : { skill, dir: 'desc' }
    )
  }

  // Systemic weakness: skills where team median is in the bottom third
  const systemicWeaknesses = useMemo(() => {
    return SKILL_BENCHMARKS.filter(s => {
      const m = teamMedians.get(s.key)
      return m !== null && m !== undefined && m <= 33
    })
  }, [teamMedians])

  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-6">

      {/* Header */}
      <div className="mb-5">
        <h2
          className="text-lg font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Peer Benchmarking
        </h2>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Team percentile rankings by skill · sort any column
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : repPercentiles.length === 0 ? (
        <div
          className="py-12 text-center text-xs text-[rgb(var(--text-muted))] border border-dashed border-[rgb(var(--border-default))]"
          data-testid="team-empty"
        >
          No peer benchmarking data for this period.
        </div>
      ) : (
        <>
          {/* Systemic weakness alert */}
          {systemicWeaknesses.length > 0 && (
            <div
              className="mb-4 px-3 py-2 text-xs border"
              style={{ color: CORAL, backgroundColor: `${CORAL}10`, borderColor: `${CORAL}44` }}
              data-testid="systemic-weakness-alert"
            >
              Team-wide weakness in:{' '}
              {systemicWeaknesses.map(s => s.label).join(', ')}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="benchmarking-table">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.08)]">

                  {/* Rep name column */}
                  <th className="pb-2 pr-4 min-w-[120px]">
                    <button
                      className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
                      onClick={() => handleSortClick('name')}
                    >
                      Rep <SortIcon skill="name" sort={sort} />
                    </button>
                  </th>

                  {/* Skill columns */}
                  {SKILL_BENCHMARKS.map(skill => (
                    <th key={skill.key} className="pb-2 px-2">
                      <button
                        className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors whitespace-nowrap"
                        onClick={() => handleSortClick(skill.key)}
                        title={skill.label}
                      >
                        {skill.label.split(' ')[0]} <SortIcon skill={skill.key} sort={sort} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortedReps.map(({ repId, percs }) => (
                  <tr
                    key={repId}
                    className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <td className="py-2 pr-4 text-xs font-semibold text-[rgb(var(--text-secondary))] truncate max-w-[140px]">
                      {repNameMap.get(repId) ?? repId.slice(0, 8)}
                    </td>
                    {SKILL_BENCHMARKS.map(skill => (
                      <td key={skill.key} className="py-2 px-2 text-center">
                        <CellPill skill={getSkillPerc(percs, skill.key) ?? {
                          skillName: skill.key, skillLabel: skill.label,
                          repScore: null, percentileRank: null, cohortSize: 0,
                          jobRole: null, tenureBand: null, buckets: [0,0,0,0,0],
                        }} />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Summary row — team median per skill */}
                <tr className="border-t border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]">
                  <td className="py-2 pr-4 text-[9px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))]">
                    Team median
                  </td>
                  {SKILL_BENCHMARKS.map(skill => (
                    <td key={skill.key} className="py-2 px-2 text-center" data-testid={`median-${skill.key}`}>
                      <SummaryCell median={teamMedians.get(skill.key) ?? null} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-[9px] text-[rgb(var(--text-muted))]">
            {(['top', 'mid', 'bottom'] as const).map(tier => (
              <div key={tier} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_COLOR[tier] }} />
                <span>
                  {tier === 'top' ? 'Top 33%' : tier === 'mid' ? 'Middle 33%' : 'Bottom 33%'}
                </span>
              </div>
            ))}
            <span className="opacity-60">— = insufficient cohort (&lt;{3} reps)</span>
          </div>
        </>
      )}
    </div>
  )
}
