/**
 * MeddicRadialChart — R1
 * Pure SVG 6-segment radial chart. One arc segment per MEDDIC pillar.
 * Complete (≥80) = green, partial (>0 <80) = amber, empty (null/0) = coral.
 */

import { MEDDIC_PILLARS, type MeddicRow } from '../../hooks/useMeddic'

interface Props {
  meddic: MeddicRow | null
  size?: number
}

const CORAL  = '#FF6B6B'
const AMBER  = '#F59E0B'
const GREEN  = '#10B981'
const TRACK  = '#2a2a2e'

function pillarColour(score: number | null): string {
  if (score === null || score === 0) return CORAL
  if (score >= 80) return GREEN
  return AMBER
}

export default function MeddicRadialChart({ meddic, size = 200 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.42
  const innerR = size * 0.26
  const gap = 0.04 // radians gap between segments
  const segmentAngle = (2 * Math.PI) / 6

  const completion = meddic?.meddic_completion_pct ?? null

  function describeArc(
    startAngle: number,
    endAngle: number,
    r: number,
    iR: number
  ): string {
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + iR * Math.cos(endAngle)
    const iy1 = cy + iR * Math.sin(endAngle)
    const ix2 = cx + iR * Math.cos(startAngle)
    const iy2 = cy + iR * Math.sin(startAngle)
    return [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 0 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${iR} ${iR} 0 0 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ')
  }

  const startOffset = -Math.PI / 2 // start at top

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="MEDDIC completion radial chart"
      data-testid="meddic-radial-chart"
    >
      {MEDDIC_PILLARS.map((pillar, i) => {
        const score = meddic ? (meddic[pillar.key] as number | null) : null
        const colour = pillarColour(score)
        const startAngle = startOffset + i * segmentAngle + gap / 2
        const endAngle   = startOffset + (i + 1) * segmentAngle - gap / 2

        // Track (background arc)
        const trackPath = describeArc(startAngle, endAngle, outerR, innerR)
        // Fill arc (proportional to score)
        const fillFraction = score ? Math.min(score / 100, 1) : 0
        const fillR = innerR + (outerR - innerR) * fillFraction
        const fillPath = fillFraction > 0
          ? describeArc(startAngle, endAngle, fillR, innerR)
          : null

        return (
          <g key={pillar.key} data-testid={`meddic-segment-${pillar.key}`}>
            {/* track */}
            <path d={trackPath} fill={TRACK} />
            {/* filled portion */}
            {fillPath && <path d={fillPath} fill={colour} opacity={0.9} />}
            {/* label */}
            {(() => {
              const labelAngle = startOffset + (i + 0.5) * segmentAngle
              const labelR = outerR + 12
              const lx = cx + labelR * Math.cos(labelAngle)
              const ly = cy + labelR * Math.sin(labelAngle)
              return (
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={size * 0.055}
                  fill="#9ca3af"
                  fontFamily="DM Sans, sans-serif"
                >
                  {pillar.label.split(' ')[0]}
                </text>
              )
            })()}
          </g>
        )
      })}

      {/* Centre label */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.13}
        fontFamily="Oswald, sans-serif"
        fontWeight="600"
        fill={completion !== null ? GREEN : '#6b7280'}
        data-testid="meddic-completion-label"
      >
        {completion !== null ? `${Math.round(completion)}%` : '—'}
      </text>
      <text
        x={cx}
        y={cy + size * 0.1}
        textAnchor="middle"
        fontSize={size * 0.055}
        fontFamily="DM Sans, sans-serif"
        fill="#6b7280"
      >
        MEDDIC
      </text>
    </svg>
  )
}
