/**
 * CompetitiveIntelChart — R7
 * SVG bar chart of competitor mention frequency, coloured by win rate. TierGated.
 */

import { useCompetitorStats, winRateColour } from '../../hooks/useCompetitorMentions'
import TierGate from '../../components/shared/TierGate'

export default function CompetitiveIntelChart() {
  const { data: stats = [], isLoading } = useCompetitorStats()

  if (isLoading) return null

  const top = stats.slice(0, 8)
  if (top.length === 0) return null

  const maxCount = Math.max(...top.map((s) => s.mention_count), 1)
  const barH = 22
  const labelW = 100
  const chartW = 320
  const gap = 6
  const svgH = top.length * (barH + gap)

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
          Competitive Mentions
        </h2>
        <svg
          width="100%"
          viewBox={`0 0 ${labelW + chartW + 60} ${svgH}`}
          data-testid="competitor-bar-chart"
        >
          {top.map((stat, i) => {
            const y = i * (barH + gap)
            const barWidth = (stat.mention_count / maxCount) * chartW
            const colour = winRateColour(stat.win_rate)
            const winPct = stat.win_rate !== null ? `${Math.round(stat.win_rate * 100)}%` : 'n/a'
            return (
              <g key={stat.competitor_name} data-testid={`competitor-bar-${stat.competitor_name}`}>
                <text
                  x={labelW - 8}
                  y={y + barH / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontFamily="DM Sans, sans-serif"
                  fill="#9ca3af"
                >
                  {stat.competitor_name}
                </text>
                <rect
                  x={labelW}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={colour}
                  fillOpacity={0.25}
                />
                <rect
                  x={labelW}
                  y={y}
                  width={4}
                  height={barH}
                  fill={colour}
                />
                <text
                  x={labelW + barWidth + 6}
                  y={y + barH / 2}
                  dominantBaseline="middle"
                  fontSize={10}
                  fontFamily="DM Mono, monospace"
                  fill={colour}
                >
                  {stat.mention_count}× · win {winPct}
                </text>
              </g>
            )
          })}
        </svg>
        {/* Insight callout */}
        {top[0] && (
          <p className="text-xs text-[#6b7280] mt-4">
            <span className="text-[#9ca3af] font-semibold">{top[0].competitor_name}</span>
            {' '}mentioned in{' '}
            <span className="text-[#9ca3af]">{top[0].mention_count}× calls</span>.
            {top[0].win_rate !== null && (
              <> Win rate when mentioned:{' '}
                <span style={{ color: winRateColour(top[0].win_rate) }}>
                  {Math.round(top[0].win_rate * 100)}%
                </span>.
              </>
            )}
          </p>
        )}
      </section>
    </TierGate>
  )
}
