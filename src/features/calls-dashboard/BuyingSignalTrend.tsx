/**
 * BuyingSignalTrend — L6
 *
 * Missed signal rate line chart over last 20 calls on CallsDashboard.
 * Coaching insight banner if latest missed rate > 50%.
 * Wrapped in TierGate.
 */

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'
import TierGate from '../../components/shared/TierGate'
import {
  useBuyingSignalTrend,
  buyingSignalInsight,
} from '../../hooks/useCallBuyingSignals'
import type { BuyingSignalTrendPoint } from '../../hooks/useCallBuyingSignals'
import { useAuth } from '../../context/AuthContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function dotColor(rate: number): string {
  if (rate > 50) return '#FF6B6B'
  if (rate > 25) return '#F59E0B'
  return '#10B981'
}

// ── Inner component ───────────────────────────────────────────────────────────

function BuyingSignalTrendInner({ repId }: { repId: string }) {
  const { data: points, isLoading } = useBuyingSignalTrend(repId)
  const insight = buyingSignalInsight(points ?? [])

  const atTarget = (points ?? []).filter(p => p.missed_rate <= 50).length
  const above    = (points ?? []).length - atTarget

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-40 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-44 bg-[rgb(var(--border-default))] rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
            Buying Signal Capitalisation
          </p>
          {(points?.length ?? 0) > 0 && (
            <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">
              Last {points!.length} calls ·{' '}
              <span className="text-[#10B981]">{atTarget} capitalising</span>
              {' · '}
              <span className="text-[#FF6B6B]">{above} missing &gt;50%</span>
            </p>
          )}
        </div>
        <p className="text-[10px] text-[rgb(var(--text-muted))] shrink-0 pt-0.5">Missed signal %</p>
      </div>

      {/* Coaching insight */}
      {insight && (
        <div className="border border-[#FF6B6B] bg-[rgba(255,107,107,0.06)] px-3 py-2">
          <p className="text-[10px] text-[#FF6B6B]">{insight}</p>
        </div>
      )}

      {/* Empty state */}
      {!points?.length ? (
        <div className="h-44 flex items-center justify-center border border-dashed border-[rgb(var(--border-default))]">
          <p className="text-xs text-[rgb(var(--text-muted))]">No buying signal data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={176}>
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a1b', border: '1px solid rgb(var(--border-default))', borderRadius: 0, fontSize: 11 }}
              labelFormatter={formatDate}
              formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Missed signals']}
            />
            <ReferenceLine
              y={50}
              stroke="#F59E0B"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              label={{ value: '50%', fill: '#F59E0B', fontSize: 9, position: 'insideTopRight' }}
            />
            <Line
              type="monotone"
              dataKey="missed_rate"
              stroke="#6366F1"
              strokeWidth={1.5}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: BuyingSignalTrendPoint }
                return (
                  <Dot
                    key={`dot-${payload.call_id}`}
                    cx={cx} cy={cy} r={3}
                    fill={dotColor(payload.missed_rate)}
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

// ── Exported wrapper ──────────────────────────────────────────────────────────

export default function BuyingSignalTrend() {
  const { user } = useAuth()
  const repId = user?.id ?? ''

  return (
    <TierGate>
      <BuyingSignalTrendInner repId={repId} />
    </TierGate>
  )
}
