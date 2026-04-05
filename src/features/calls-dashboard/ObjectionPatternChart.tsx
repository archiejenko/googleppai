/**
 * ObjectionPatternChart — L5
 *
 * Two charts on CallsDashboard:
 *   1. Bar chart: objection frequency sorted by count
 *   2. Bar chart: avg AER response score by type (weakest types surface first)
 *
 * Wrapped in TierGate.
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import TierGate from '../../components/shared/TierGate'
import { useObjectionPatterns, OBJECTION_TYPE_LABELS, aerScoreColor } from '../../hooks/useCallObjections'
import { useAuth } from '../../context/AuthContext'

// ── Inner component ───────────────────────────────────────────────────────────

function ObjectionPatternChartInner({ repId, days }: { repId: string; days: number }) {
  const { data, isLoading } = useObjectionPatterns(repId, days)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-40 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-44 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="h-44 flex items-center justify-center border border-dashed border-[rgb(var(--border-default))]">
        <p className="text-xs text-[rgb(var(--text-muted))]">No objection data yet</p>
      </div>
    )
  }

  const freqData  = data.map(d => ({
    name:  OBJECTION_TYPE_LABELS[d.objection_type],
    count: d.count,
  }))

  const scoreData = [...data]
    .filter(d => d.avg_response_score !== null)
    .sort((a, b) => (a.avg_response_score ?? 0) - (b.avg_response_score ?? 0))
    .map(d => ({
      name:  OBJECTION_TYPE_LABELS[d.objection_type],
      score: d.avg_response_score!,
      color: aerScoreColor(d.avg_response_score),
    }))

  return (
    <div className="space-y-6">
      {/* Chart 1: Frequency */}
      <div>
        <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-3">
          Objection Frequency
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={freqData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1b', border: '1px solid rgb(var(--border-default))', borderRadius: 0, fontSize: 11 }}
              formatter={(v: number | undefined) => [v ?? 0, 'Objections']}
            />
            <Bar dataKey="count" fill="#F59E0B" radius={0} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Avg AER Score by type */}
      {scoreData.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-3">
            Avg AER Response Score (weakest first)
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={scoreData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a1b', border: '1px solid rgb(var(--border-default))', borderRadius: 0, fontSize: 11 }}
                formatter={(v: number | undefined) => [`${v ?? 0}/100`, 'Avg AER score']}
              />
              <Bar dataKey="score" radius={0}>
                {scoreData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Exported wrapper ──────────────────────────────────────────────────────────

export default function ObjectionPatternChart({ days = 30 }: { days?: number }) {
  const { user } = useAuth()
  const repId = user?.id ?? ''

  return (
    <TierGate>
      <ObjectionPatternChartInner repId={repId} days={days} />
    </TierGate>
  )
}
