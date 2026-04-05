/**
 * PacingStatCard — L8
 *
 * Stat card on CallsDashboard:
 *   - pacing_score as large number with trend arrow
 *   - avg wpm
 *   - variance label ("Natural variation" / "Monotone delivery" / "Moderate variation")
 *
 * Wrapped in TierGate.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Dot,
} from 'recharts'
import TierGate from '../../components/shared/TierGate'
import { usePacingTrend } from '../../hooks/useCallPacing'
import { pacingScoreColor } from '../../config/pacing'
import { useAuth } from '../../context/AuthContext'
import type { PacingTrendPoint } from '../../hooks/useCallPacing'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function trendArrow(points: PacingTrendPoint[]) {
  if (points.length < 2) return null
  const delta = points[points.length - 1].pacing_score - points[0].pacing_score
  if (delta > 3)  return <TrendingUp  className="w-4 h-4 text-[#10B981]" />
  if (delta < -3) return <TrendingDown className="w-4 h-4 text-[#FF6B6B]" />
  return <Minus className="w-4 h-4 text-[rgb(var(--text-muted))]" />
}

// ── Inner component ───────────────────────────────────────────────────────────

function PacingStatCardInner({ repId }: { repId: string }) {
  const { data: points, isLoading } = usePacingTrend(repId)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-40 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-44 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  if (!points?.length) {
    return (
      <div className="h-44 flex items-center justify-center border border-dashed border-[rgb(var(--border-default))]">
        <p className="text-xs text-[rgb(var(--text-muted))]">No pacing data yet</p>
      </div>
    )
  }

  const latest    = points[points.length - 1]
  const color     = pacingScoreColor(latest.pacing_score)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
            Pacing Score
          </p>
          <div className="flex items-end gap-2 mt-1">
            <span
              className="text-4xl font-black tabular-nums leading-none"
              style={{ fontFamily: 'Oswald, sans-serif', color }}
            >
              {Math.round(latest.pacing_score)}
            </span>
            {trendArrow(points)}
          </div>
          <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">
            Last {points.length} calls
          </p>
        </div>
      </div>

      {/* Trend chart */}
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="call_date"
            tickFormatter={formatDate}
            tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a1b', border: '1px solid rgb(var(--border-default))', borderRadius: 0, fontSize: 11 }}
            labelFormatter={formatDate}
            formatter={(v: number | undefined) => [Math.round(v ?? 0), 'Pacing score']}
          />
          <ReferenceLine y={75} stroke="#10B981" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Line
            type="monotone"
            dataKey="pacing_score"
            stroke="#6366F1"
            strokeWidth={1.5}
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: PacingTrendPoint }
              return (
                <Dot
                  key={`dot-${payload.call_id}`}
                  cx={cx} cy={cy} r={3}
                  fill={pacingScoreColor(payload.pacing_score)}
                  stroke="none"
                />
              )
            }}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function PacingStatCard() {
  const { user } = useAuth()
  const repId = user?.id ?? ''
  return (
    <TierGate>
      <PacingStatCardInner repId={repId} />
    </TierGate>
  )
}
