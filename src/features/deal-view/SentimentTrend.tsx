/**
 * SentimentTrend — R4
 * Recharts AreaChart of prospect sentiment per deal. TierGated.
 */

import { AlertTriangle } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer
} from 'recharts'
import {
  useCallSentiment,
  computeSentimentTrajectory,
} from '../../hooks/useCallSentiment'
import TierGate from '../../components/shared/TierGate'

const TRAJECTORY_COLOURS = {
  improving: '#10B981',
  stable:    '#F59E0B',
  declining: '#FF6B6B',
}

const TRAJECTORY_LABELS = {
  improving: 'Improving',
  stable:    'Stable',
  declining: 'Declining',
}

interface Props { dealId: string }

export default function SentimentTrend({ dealId }: Props) {
  const { data: points = [], isLoading } = useCallSentiment(dealId)

  const last3 = points.slice(-3).map((p) => p.sentiment_score)
  const trajectory = computeSentimentTrajectory(last3)
  const declining = trajectory === 'declining' && points.length >= 2
  const colour = trajectory ? TRAJECTORY_COLOURS[trajectory] : '#6b7280'

  const chartData = points.map((p) => ({
    date: new Date(p.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    score: Math.round(p.sentiment_score * 100) / 100,
  }))

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af]">
            Prospect Sentiment
          </h2>
          {trajectory && (
            <span
              className="text-[10px] uppercase tracking-[0.15em] font-semibold px-2 py-0.5 border"
              style={{ color: colour, borderColor: `${colour}40`, backgroundColor: `${colour}15` }}
            >
              {TRAJECTORY_LABELS[trajectory]}
            </span>
          )}
        </div>

        {declining && (
          <div className="flex items-start gap-2 bg-[#FF6B6B]/10 border border-[#FF6B6B]/40 p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#FF6B6B]">
              Prospect sentiment declining — recommend manager review.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : points.length < 2 ? (
          <div className="h-32 flex items-center justify-center text-[#6b7280] text-sm">
            Sentiment trend requires 2+ scored calls.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161618', border: '1px solid #2a2a2e', fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
              />
              {/* Reference bands */}
              <ReferenceLine y={0.3} stroke="#10B981" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={0}   stroke="#F59E0B" strokeDasharray="3 3" strokeOpacity={0.4} />
              <Area
                type="monotone"
                dataKey="score"
                stroke={colour}
                fill={colour}
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ fill: colour, r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>
    </TierGate>
  )
}
