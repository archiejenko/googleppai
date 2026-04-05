/**
 * PipelineConversionFunnel — R8
 * SVG funnel + rep conversion table. TierGated.
 */

import { usePipelineConversion } from '../../hooks/usePipelineConversion'
import TierGate from '../../components/shared/TierGate'

export default function PipelineConversionFunnel() {
  const { data, isLoading } = usePipelineConversion()

  if (isLoading || !data) return null

  const { funnel, repConversions, teamAvg, stageOrder } = data
  const maxCount = Math.max(...funnel.map((f) => f.count), 1)
  const barMaxW = 280
  const barH = 28
  const gap = 4
  const svgH = funnel.length * (barH + gap)
  const reps = Object.keys(repConversions)

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
          Pipeline Stage Conversion
        </h2>

        {/* SVG funnel */}
        <svg width="100%" viewBox={`0 0 ${barMaxW + 160} ${svgH}`} className="mb-6" data-testid="pipeline-funnel">
          {funnel.map((stage, i) => {
            const barW = Math.max(4, (stage.count / maxCount) * barMaxW)
            const y = i * (barH + gap)
            return (
              <g key={stage.stage}>
                <text x={90} y={y + barH / 2} textAnchor="end" dominantBaseline="middle"
                  fontSize={11} fontFamily="DM Sans, sans-serif" fill="#9ca3af">
                  {stage.stage}
                </text>
                <rect x={95} y={y} width={barW} height={barH} fill="#6366F1" fillOpacity={0.2} />
                <rect x={95} y={y} width={4} height={barH} fill="#6366F1" />
                <text x={95 + barW + 6} y={y + barH / 2} dominantBaseline="middle"
                  fontSize={11} fontFamily="DM Mono, monospace" fill="#9ca3af">
                  {stage.count}
                </text>
                {stage.conversionToNext !== null && (
                  <text x={95 + barMaxW + 10} y={y + barH / 2 + (barH + gap) / 2} dominantBaseline="middle"
                    fontSize={10} fontFamily="DM Mono, monospace"
                    fill={stage.conversionToNext < 30 ? '#FF6B6B' : stage.conversionToNext < 60 ? '#F59E0B' : '#10B981'}>
                    ↓{stage.conversionToNext}%
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Rep conversion table */}
        {reps.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a2e]">
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-[#6b7280]">Rep</th>
                  {stageOrder.slice(0, -1).map((s) => (
                    <th key={s} className="text-center px-2 py-2 text-[10px] uppercase tracking-[0.15em] text-[#6b7280]">
                      {s}→
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reps.map((repId) => (
                  <tr key={repId} className="border-b border-[#2a2a2e]">
                    <td className="px-3 py-2 font-mono text-[#9ca3af]">{repId.slice(0, 8)}</td>
                    {stageOrder.slice(0, -1).map((stage) => {
                      const rate = repConversions[repId]?.[stage] ?? null
                      const avg = teamAvg[stage] ?? null
                      const belowAvg = rate !== null && avg !== null && (avg - rate) > 15
                      return (
                        <td key={stage} className="text-center px-2 py-2">
                          {rate !== null ? (
                            <span
                              className="font-mono"
                              style={{ color: belowAvg ? '#FF6B6B' : '#9ca3af' }}
                            >
                              {Math.round(rate)}%
                            </span>
                          ) : (
                            <span className="text-[#2a2a2e]">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </TierGate>
  )
}
