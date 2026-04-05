/**
 * FillerWordTrend — L4
 *
 * Line chart of filler rate per minute across recent calls.
 * Target reference line at 2/min.
 * Shows coaching insight string if trending upward over last 5 calls.
 */

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'
import type { FillerWordTrendPoint } from '../../hooks/useFillerWords'
import { fillerTrendInsight, FILLER_RATE_TARGET } from '../../hooks/useFillerWords'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function dotColor(rate: number): string {
  if (rate >= 6) return '#FF6B6B'
  if (rate >= 4) return '#F59E0B'
  return '#10B981'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  points: FillerWordTrendPoint[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FillerWordTrend({ points }: Props) {
  const insight = fillerTrendInsight(points)

  const atTarget = points.filter(p => p.filler_rate < FILLER_RATE_TARGET).length
  const above    = points.length - atTarget

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
            Filler Word Rate
          </p>
          {points.length > 0 && (
            <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">
              Last {points.length} calls ·{' '}
              <span className="text-[#10B981]">{atTarget} at target</span>
              {' · '}
              <span className="text-[#FF6B6B]">{above} above</span>
            </p>
          )}
        </div>
        <p className="text-[10px] text-[rgb(var(--text-muted))] shrink-0 pt-0.5">
          Target &lt;{FILLER_RATE_TARGET}/min
        </p>
      </div>

      {/* Coaching insight */}
      {insight && (
        <div className="border border-[#F59E0B] bg-[rgba(245,158,11,0.06)] px-3 py-2">
          <p className="text-[10px] text-[#F59E0B]">{insight}</p>
        </div>
      )}

      {/* Empty state */}
      {points.length === 0 ? (
        <div className="h-44 flex items-center justify-center border border-dashed border-[rgb(var(--border-default))]">
          <p className="text-xs text-[rgb(var(--text-muted))]">No filler data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={176}>
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="call_date"
              tickFormatter={formatDate}
              tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'rgb(var(--text-muted))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background:   '#1a1a1b',
                border:       '1px solid rgb(var(--border-default))',
                borderRadius: 0,
                fontSize:     11,
              }}
              labelFormatter={formatDate}
              formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)}/min`, 'Filler rate']}
            />
            <ReferenceLine
              y={FILLER_RATE_TARGET}
              stroke="#10B981"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              label={{ value: `${FILLER_RATE_TARGET}/min`, fill: '#10B981', fontSize: 9, position: 'insideTopRight' }}
            />
            <Line
              type="monotone"
              dataKey="filler_rate"
              stroke="#6366F1"
              strokeWidth={1.5}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: FillerWordTrendPoint }
                return (
                  <Dot
                    key={`dot-${payload.call_id}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={dotColor(payload.filler_rate)}
                    stroke="none"
                  />
                )
              }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
