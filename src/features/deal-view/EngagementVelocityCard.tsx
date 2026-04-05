/**
 * EngagementVelocityCard — R5
 * Velocity stat card per deal. TierGated.
 */

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { useEngagementVelocity } from '../../hooks/useEngagementVelocity'
import TierGate from '../../components/shared/TierGate'

interface Props { dealId: string }

export default function EngagementVelocityCard({ dealId }: Props) {
  const { data: velocity, isLoading } = useEngagementVelocity(dealId)

  const directionConfig = {
    accelerating: { icon: TrendingUp,   colour: '#10B981', label: 'Accelerating' },
    stable:       { icon: Minus,        colour: '#F59E0B', label: 'Stable' },
    decelerating: { icon: TrendingDown, colour: '#FF6B6B', label: 'Decelerating' },
  }

  const config = velocity?.direction ? directionConfig[velocity.direction] : null
  const Icon = config?.icon ?? Minus
  const severe = velocity?.magnitude === 'severe'

  // Mini sparkline SVG (simple polyline)
  const sparkline = velocity?.sparkline ?? []
  const maxVal = Math.max(...sparkline, 1)
  const svgW = 80
  const svgH = 24
  const points = sparkline.map((v, i) => {
    const x = (i / Math.max(sparkline.length - 1, 1)) * svgW
    const y = svgH - (v / maxVal) * svgH
    return `${x},${y}`
  }).join(' ')

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-5">
        <h2 className="font-display text-xs uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
          Engagement Velocity
        </h2>

        {severe && (
          <div className="flex items-start gap-2 bg-[#FF6B6B]/10 border border-[#FF6B6B]/40 p-3 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#FF6B6B]">
              Engagement slowing significantly — prospect may be disengaging.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !velocity?.score ? (
          <p className="text-sm text-[#6b7280]">Velocity requires 3+ touchpoints with response times.</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Icon className="w-6 h-6" style={{ color: config?.colour }} />
              <div>
                <p className="font-display text-lg" style={{ color: config?.colour }}>
                  {config?.label}
                </p>
                {velocity.magnitude && (
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#6b7280]">
                    {velocity.magnitude}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-semibold" style={{ color: config?.colour }}>
                {velocity.score.toFixed(2)}×
              </span>
              {sparkline.length >= 2 && (
                <svg width={svgW} height={svgH} className="opacity-60">
                  <polyline
                    points={points}
                    fill="none"
                    stroke={config?.colour ?? '#6b7280'}
                    strokeWidth={1.5}
                  />
                </svg>
              )}
            </div>
          </div>
        )}
      </section>
    </TierGate>
  )
}
