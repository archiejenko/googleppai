/**
 * DealView — /deals/:id
 * Per-deal page shell. R-layer components slot in here.
 * R1: MEDDIC radial chart.
 */

import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { useDeal } from '../../hooks/useDeals'
import { useMeddic } from '../../hooks/useMeddic'
import TierGate from '../../components/shared/TierGate'
import MeddicRadialChart from './MeddicRadialChart'
import { MEDDIC_PILLARS } from '../../hooks/useMeddic'
import RelationshipDepthMap from './RelationshipDepthMap'
import SentimentTrend from './SentimentTrend'
import EngagementVelocityCard from './EngagementVelocityCard'
import MeetingTimeline from './MeetingTimeline'
import SimilarDealsPanel from './SimilarDealsPanel'
import OutcomeForm from './OutcomeForm'

const STAGE_COLOURS: Record<string, string> = {
  Prospect:  'bg-[#2a2a2e] text-[#9ca3af]',
  Qualify:   'bg-[#1c3a5e] text-[#60a5fa]',
  Demo:      'bg-[#1a2e1a] text-[#10B981]',
  Proposal:  'bg-[#2e2a1a] text-[#F59E0B]',
  Negotiate: 'bg-[#2e1a1a] text-[#FF6B6B]',
  Close:     'bg-[#1e1a2e] text-[#6366F1]',
}

export default function DealView() {
  const { id } = useParams<{ id: string }>()
  const { data: deal, isLoading: dealLoading } = useDeal(id)
  const { data: meddic, isLoading: meddicLoading } = useMeddic(id)

  if (dealLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="p-8 text-[#9ca3af]">Deal not found.</div>
    )
  }

  const stageClass = STAGE_COLOURS[deal.stage] ?? 'bg-[#2a2a2e] text-[#9ca3af]'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/dashboard/revenue"
          className="mt-1 p-2 border border-[#2a2a2e] hover:border-[#6366F1] text-[#9ca3af] hover:text-[#6366F1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl text-[#f9fafb] uppercase tracking-wide">
              {deal.name}
            </h1>
            <span className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 font-mono font-semibold ${stageClass}`}>
              {deal.stage}
            </span>
          </div>
          <p className="text-[#9ca3af] text-sm mt-0.5">
            £{deal.value_gbp.toLocaleString()} ·{' '}
            <span className="text-[#6b7280]">Updated {new Date(deal.updated_at).toLocaleDateString('en-GB')}</span>
          </p>
        </div>
      </div>

      {/* R1 — MEDDIC */}
      <TierGate>
        <section className="bg-[#161618] border border-[#2a2a2e] p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-[#6366F1]" />
            <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af]">
              MEDDIC Score
            </h2>
          </div>

          {meddicLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <MeddicRadialChart meddic={meddic ?? null} size={220} />

              {/* Pillar breakdown */}
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                {MEDDIC_PILLARS.map((pillar) => {
                  const score = meddic ? (meddic[pillar.key] as number | null) : null
                  const colour =
                    score === null ? '#FF6B6B'
                    : score >= 80  ? '#10B981'
                    :                '#F59E0B'
                  return (
                    <div key={pillar.key} className="flex items-center gap-3 p-3 bg-[#1c1c1f] border border-[#2a2a2e]">
                      <div className="w-1.5 h-8 flex-shrink-0" style={{ backgroundColor: colour }} />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b7280]">
                          {pillar.label}
                        </p>
                        <p className="font-mono text-lg font-semibold" style={{ color: colour }}>
                          {score !== null ? `${Math.round(score)}` : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!meddic && !meddicLoading && (
            <p className="text-sm text-[#6b7280] mt-4">
              No MEDDIC data yet. Scores populate automatically after each scored call linked to this deal.
            </p>
          )}
        </section>
      </TierGate>

      {/* R3 — Relationship Depth Map */}
      {id && <RelationshipDepthMap dealId={id} />}

      {/* R4 — Sentiment Trend */}
      {id && <SentimentTrend dealId={id} />}

      {/* R5 — Engagement Velocity */}
      {id && <EngagementVelocityCard dealId={id} />}

      {/* R6 — Meeting Timeline */}
      {id && <MeetingTimeline dealId={id} />}

      {/* R10 — Similar Deals */}
      {id && <SimilarDealsPanel dealId={id} />}

      {/* R11 — Outcome Form */}
      <OutcomeForm deal={deal} />

      {/* Future R-layer components slot below here */}
    </div>
  )
}
