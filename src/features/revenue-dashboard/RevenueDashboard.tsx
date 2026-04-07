/**
 * RevenueDashboard — /dashboard/revenue
 * R-layer overview. Manager/admin protected.
 * R1: Pipeline table with MEDDIC % column.
 * R2: Risk column + at-risk alert panel + risk factor expansion.
 */

import { useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, ChevronRight } from 'lucide-react'
import { useDeals, type DealStage } from '../../hooks/useDeals'
import RecentMeetingsFeed from './RecentMeetingsFeed'
import CompetitiveIntelChart from './CompetitiveIntelChart'
import PipelineConversionFunnel from './PipelineConversionFunnel'
import ForecastPanel from './ForecastPanel'
import WinLossCharts from './WinLossCharts'
import { useAllDealRisks, computeAtRiskArr, riskColour, type DealRiskScore } from '../../hooks/useDealRisk'
import TierGate from '../../components/shared/TierGate'

type SortField = 'name' | 'value_gbp' | 'stage' | 'meddic_completion_pct' | 'risk_score'
type SortDir = 'asc' | 'desc'

const STAGE_ORDER: DealStage[] = ['Prospect', 'Qualify', 'Demo', 'Proposal', 'Negotiate', 'Close']

const RISK_FACTOR_LABELS: Record<string, string> = {
  contact_recency:      'Contact Recency',
  meddic_gaps:          'MEDDIC Gaps',
  sentiment_trajectory: 'Sentiment Trajectory',
  competitor_mentions:  'Competitor Mentions',
  stage_overstay:       'Stage Overstay',
  engagement_decel:     'Engagement Deceleration',
}

function meddicColour(pct: number | null): string {
  if (pct === null) return '#FF6B6B'
  if (pct < 40)    return '#FF6B6B'
  if (pct < 60)    return '#F59E0B'
  return '#10B981'
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-[#6b7280]" />
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-[#6366F1]" />
    : <ChevronDown className="w-3 h-3 text-[#6366F1]" />
}

function RiskDot({ score }: { score: number }) {
  const colour = riskColour(score)
  return (
    <span className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} />
      <span className="font-mono text-sm font-semibold" style={{ color: colour }}>
        {Math.round(score)}
      </span>
    </span>
  )
}

function RiskFactorPanel({ risk }: { risk: DealRiskScore }) {
  const factors = risk.risk_factors
  return (
    <div className="px-4 pb-3 bg-[#0f0f10] border-t border-[#2a2a2e]">
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b7280] pt-3 mb-2">Risk Factor Breakdown</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.entries(factors).map(([key, val]) => {
          const contribution = Math.round(val.weighted)
          const colour = contribution > 15 ? '#FF6B6B' : contribution > 8 ? '#F59E0B' : '#10B981'
          return (
            <div key={key} className="flex items-center gap-2 bg-[#161618] border border-[#2a2a2e] p-2">
              <div className="w-1 h-6 flex-shrink-0" style={{ backgroundColor: colour }} />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.1em] text-[#6b7280] truncate">
                  {RISK_FACTOR_LABELS[key] ?? key}
                </p>
                <p className="font-mono text-xs font-semibold" style={{ color: colour }}>
                  +{contribution}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function RevenueDashboard() {
  const { data: deals = [], isLoading: dealsLoading } = useDeals()
  const { data: riskRows = [] } = useAllDealRisks()
  const [sortField, setSortField] = useState<SortField>('risk_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null)

  // Build risk lookup by deal_id
  const riskByDeal = Object.fromEntries(riskRows.map((r) => [r.deal_id, r]))

  // At-risk alert
  const atRisk = computeAtRiskArr(riskRows.map((r) => ({
    ...r,
    deals: riskRows.find((x) => x.deal_id === r.deal_id)?.deals ?? null,
  })))

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'risk_score' ? 'desc' : 'asc')
    }
  }

  const dealsWithRisk = deals.map((d) => ({
    ...d,
    risk_score: riskByDeal[d.id]?.risk_score ?? null,
  }))

  const sorted = [...dealsWithRisk].sort((a, b) => {
    let av: number | string
    let bv: number | string
    if (sortField === 'stage') {
      av = STAGE_ORDER.indexOf(a.stage as DealStage)
      bv = STAGE_ORDER.indexOf(b.stage as DealStage)
    } else if (sortField === 'meddic_completion_pct') {
      av = a.meddic_completion_pct ?? -1
      bv = b.meddic_completion_pct ?? -1
    } else if (sortField === 'risk_score') {
      av = a.risk_score ?? -1
      bv = b.risk_score ?? -1
    } else if (sortField === 'value_gbp') {
      av = a.value_gbp
      bv = b.value_gbp
    } else {
      av = a.name.toLowerCase()
      bv = b.name.toLowerCase()
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function th(label: string, field: SortField) {
    return (
      <th
        className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-[#6b7280] cursor-pointer select-none hover:text-[#9ca3af] transition-colors"
        onClick={() => handleSort(field)}
      >
        <span className="flex items-center gap-1.5">
          {label}
          <SortIcon active={sortField === field} dir={sortDir} />
        </span>
      </th>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#6366F1]/10 border border-[#6366F1]/30 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#6366F1]" />
        </div>
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-[#f9fafb]">
            Revenue Intelligence
          </h1>
          <p className="text-xs text-[#6b7280] mt-0.5">Pipeline overview · R-layer analytics</p>
        </div>
      </div>

      {/* R2 — At-risk alert panel */}
      <TierGate>
        {atRisk.count > 0 && (
          <div className="flex items-start gap-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/40 p-4">
            <AlertTriangle className="w-4 h-4 text-[#FF6B6B] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#FF6B6B]">
              <span className="font-semibold">{atRisk.count} deal{atRisk.count > 1 ? 's' : ''}</span>
              {' '}with risk &gt; 70 represent{' '}
              <span className="font-semibold">£{atRisk.totalGbp.toLocaleString()}</span>
              {' '}at-risk ARR.
            </p>
          </div>
        )}
      </TierGate>

      {/* Pipeline table — R1 MEDDIC + R2 Risk */}
      <TierGate>
        <section className="bg-[#161618] border border-[#2a2a2e]">
          <div className="px-4 py-3 border-b border-[#2a2a2e]">
            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-[#9ca3af]">
              Pipeline · {deals.length} active deals
            </h2>
          </div>

          {dealsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deals.length === 0 ? (
            <div className="p-8 text-center text-[#6b7280] text-sm">
              No active deals. Add a deal to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="pipeline-table">
                <thead className="border-b border-[#2a2a2e]">
                  <tr>
                    <th className="px-4 py-3 w-6" />
                    {th('Deal', 'name')}
                    {th('Value', 'value_gbp')}
                    {th('Stage', 'stage')}
                    {th('MEDDIC %', 'meddic_completion_pct')}
                    {th('Risk', 'risk_score')}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((deal) => {
                    const meddicColourVal = meddicColour(deal.meddic_completion_pct)
                    const risk = riskByDeal[deal.id] ?? null
                    const expanded = expandedDealId === deal.id
                    return (
                      <Fragment key={deal.id}>
                        <tr
                          className="border-b border-[#2a2a2e] hover:bg-[#1c1c1f] transition-colors cursor-pointer"
                          data-testid="pipeline-row"
                          onClick={() => setExpandedDealId(expanded ? null : deal.id)}
                        >
                          <td className="px-3 py-3">
                            <ChevronRight
                              className={`w-3 h-3 text-[#6b7280] transition-transform ${expanded ? 'rotate-90' : ''}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/deals/${deal.id}`}
                              className="text-[#f9fafb] hover:text-[#6366F1] transition-colors font-medium text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {deal.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-[#9ca3af]">
                            £{deal.value_gbp.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[#9ca3af] bg-[#2a2a2e] px-2 py-0.5">
                              {deal.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="font-mono text-sm font-semibold"
                              style={{ color: meddicColourVal }}
                              data-testid="meddic-pct-cell"
                            >
                              {deal.meddic_completion_pct !== null
                                ? `${Math.round(deal.meddic_completion_pct)}%`
                                : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3" data-testid="risk-score-cell">
                            {risk ? (
                              <RiskDot score={risk.risk_score} />
                            ) : (
                              <span className="text-[#6b7280] text-sm font-mono">—</span>
                            )}
                          </td>
                        </tr>
                        {expanded && risk && (
                          <tr className="border-b border-[#2a2a2e]">
                            <td colSpan={6} className="p-0">
                              <RiskFactorPanel risk={risk} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </TierGate>

      {/* R6 — Recent Meetings */}
      <RecentMeetingsFeed />

      {/* R7 — Competitive Intel */}
      <CompetitiveIntelChart />

      {/* R8 — Pipeline Conversion Funnel */}
      <PipelineConversionFunnel />

      {/* R9 — Forecast */}
      <ForecastPanel />

      {/* R11 — Win/Loss Patterns */}
      <WinLossCharts />
    </div>
  )
}
