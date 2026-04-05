/**
 * WeeklyCoachingSummary — X4
 *
 * UI preview of the weekly coaching summary email.
 * Renders unresolved trigger counts by type, top 3 at-risk reps,
 * top 3 at-risk deals, and one recommended action per category.
 *
 * Email sending is a future feature. This is a UI preview only.
 */

import { Mail, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react'
import { filterByType, type CoachingTrigger } from '../../hooks/useCoachingTriggers'

interface Props {
  triggers: CoachingTrigger[]
}

function Section({ icon: Icon, title, color, children }: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-[#2a2a2e] last:border-0">
      <div className="px-6 py-3 flex items-center gap-2 border-b border-[#2a2a2e]" style={{ background: `${color}0a` }}>
        <Icon size={13} color={color} />
        <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}

export default function WeeklyCoachingSummary({ triggers }: Props) {
  const training   = filterByType(triggers, 'training')
  const liveCall   = filterByType(triggers, 'live_call')
  const dealRisk   = filterByType(triggers, 'deal_risk')
  const crossLayer = filterByType(triggers, 'cross_layer')
  const total      = triggers.length
  const critical   = triggers.filter(t => t.severity === 'critical')

  // Top 3 at-risk reps — by trigger count
  const repCounts: Record<string, { name: string; count: number; hasCritical: boolean }> = {}
  for (const t of triggers) {
    if (!repCounts[t.repId]) repCounts[t.repId] = { name: t.repName, count: 0, hasCritical: false }
    repCounts[t.repId].count++
    if (t.severity === 'critical') repCounts[t.repId].hasCritical = true
  }
  const topReps = Object.values(repCounts).sort((a, b) => (b.hasCritical ? 1 : 0) - (a.hasCritical ? 1 : 0) || b.count - a.count).slice(0, 3)

  // Top 3 at-risk deals — from deal_risk triggers
  const topDeals = dealRisk
    .map(t => ({
      dealId: String(t.triggerData?.deal_id ?? ''),
      repName: t.repName,
      riskScore: Number(t.triggerData?.risk_score ?? 0),
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3)

  // Recommendations
  const recommendations: { category: string; action: string }[] = []
  if (training.length > 0) {
    recommendations.push({
      category: 'Training',
      action: `${training.length} rep${training.length > 1 ? 's have' : ' has'} skill decay or gap widening. Schedule 1:1 coaching sessions this week.`,
    })
  }
  if (dealRisk.length > 0) {
    recommendations.push({
      category: 'Deal Risk',
      action: `${dealRisk.length} deal${dealRisk.length > 1 ? 's are' : ' is'} at high risk. Review pipeline with reps and identify blockers.`,
    })
  }
  if (crossLayer.length > 0) {
    recommendations.push({
      category: 'Cross-Layer',
      action: `${crossLayer.length} loss${crossLayer.length > 1 ? 'es correlate' : ' correlates'} with training skill gaps. Assign recommended modules.`,
    })
  }
  if (!recommendations.length) {
    recommendations.push({ category: 'General', action: 'No critical actions this week. Keep up the momentum.' })
  }

  // Type breakdown table
  const typeBreakdown = [
    { label: 'Training (Skill Decay / Gap)',  count: training.length   },
    { label: 'Live Call (Commitment Rate)',   count: liveCall.length   },
    { label: 'Deal Risk',                     count: dealRisk.length   },
    { label: 'Cross-Layer (Loss → Skill)',    count: crossLayer.length },
  ]

  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="font-sans">
      {/* Email header */}
      <div className="px-6 py-5 border-b border-[#2a2a2e] bg-[#1c1c1f]">
        <div className="flex items-center gap-3 mb-1">
          <Mail size={16} className="text-[#6366F1]" />
          <span className="font-display font-bold text-white tracking-wide text-base">
            WEEKLY COACHING SUMMARY
          </span>
          <span className="text-xs text-[#6b7280] font-mono ml-auto">PREVIEW ONLY</span>
        </div>
        <p className="text-xs text-[#6b7280] font-mono">{dateStr}</p>
      </div>

      {/* Summary stats */}
      <Section icon={AlertTriangle} title="This Week's Overview" color="#F59E0B">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#1c1c1f] border border-[#2a2a2e] p-3 text-center">
            <p className="text-2xl font-mono font-bold text-white">{total}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Total Unresolved</p>
          </div>
          <div className="bg-[#1c1c1f] border border-[#FF6B6B33] p-3 text-center">
            <p className="text-2xl font-mono font-bold text-[#FF6B6B]">{critical.length}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Critical</p>
          </div>
          <div className="bg-[#1c1c1f] border border-[#2a2a2e] p-3 text-center">
            <p className="text-2xl font-mono font-bold text-white">{dealRisk.length}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">At-Risk Deals</p>
          </div>
          <div className="bg-[#1c1c1f] border border-[#6366F133] p-3 text-center">
            <p className="text-2xl font-mono font-bold text-[#6366F1]">{crossLayer.length}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Cross-Layer</p>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#6b7280] font-mono">
              <th className="text-left pb-1">Trigger Type</th>
              <th className="text-right pb-1">Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2e]">
            {typeBreakdown.map(row => (
              <tr key={row.label}>
                <td className="py-1.5 text-[#d1d1d3]">{row.label}</td>
                <td className="py-1.5 text-right font-mono font-bold text-white">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Top 3 at-risk reps */}
      <Section icon={TrendingDown} title="Top 3 At-Risk Reps" color="#FF6B6B">
        {topReps.length === 0 ? (
          <p className="text-xs text-[#6b7280] font-mono">No at-risk reps this week.</p>
        ) : (
          <div className="space-y-2">
            {topReps.map((rep, i) => (
              <div key={rep.name} className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#6b7280] w-4">{i + 1}.</span>
                <span className="text-sm text-white font-mono flex-1">{rep.name}</span>
                <span className="text-xs font-mono text-[#6b7280]">{rep.count} trigger{rep.count !== 1 ? 's' : ''}</span>
                {rep.hasCritical && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#FF6B6B18] text-[#FF6B6B] border border-[#FF6B6B44]">
                    CRITICAL
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Top 3 at-risk deals */}
      <Section icon={DollarSign} title="Top 3 At-Risk Deals" color="#F59E0B">
        {topDeals.length === 0 ? (
          <p className="text-xs text-[#6b7280] font-mono">No high-risk deals this week.</p>
        ) : (
          <div className="space-y-2">
            {topDeals.map((deal, i) => (
              <div key={deal.dealId} className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#6b7280] w-4">{i + 1}.</span>
                <span className="text-xs text-[#6b7280] font-mono flex-1">Rep: {deal.repName}</span>
                <span className="text-xs font-mono font-bold" style={{ color: deal.riskScore >= 80 ? '#FF6B6B' : '#F59E0B' }}>
                  Risk {deal.riskScore}/100
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recommended actions */}
      <Section icon={Mail} title="Recommended Actions" color="#10B981">
        <div className="space-y-2">
          {recommendations.map((r, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-xs font-mono font-bold text-[#10B981] w-20 shrink-0">{r.category}</span>
              <p className="text-xs text-[#d1d1d3] leading-relaxed">{r.action}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer note */}
      <div className="px-6 py-3 bg-[#1c1c1f] border-t border-[#2a2a2e]">
        <p className="text-[10px] text-[#6b7280] font-mono text-center">
          This is a preview of your weekly coaching summary email. Email sending is a future feature.
        </p>
      </div>
    </div>
  )
}
