/**
 * useDealRisk — R2
 * Risk scores and at-risk alert data.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface RiskFactor {
  raw: unknown
  weighted: number
}

export interface DealRiskScore {
  id: string
  deal_id: string
  org_id: string
  risk_score: number
  risk_factors: Record<string, RiskFactor>
  computed_at: string
}

export function useDealRisk(dealId: string | undefined) {
  return useQuery({
    queryKey: ['deal-risk', dealId],
    queryFn: async () => {
      if (!dealId) return null
      const { data, error } = await supabase
        .from('deal_risk_scores')
        .select('*')
        .eq('deal_id', dealId)
        .maybeSingle()
      if (error) throw error
      return data as DealRiskScore | null
    },
    enabled: !!dealId,
  })
}

export function useAllDealRisks() {
  return useQuery({
    queryKey: ['deal-risks-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_risk_scores')
        .select('*, deals(name, value_gbp, stage)')
        .order('risk_score', { ascending: false })
      if (error) throw error
      return (data ?? []) as (DealRiskScore & {
        deals: { name: string; value_gbp: number; stage: string } | null
      })[]
    },
  })
}

/** Compute total at-risk ARR for deals with risk_score > 70 */
export function computeAtRiskArr(
  risks: (DealRiskScore & { deals: { value_gbp: number } | null })[]
): { count: number; totalGbp: number } {
  const atRisk = risks.filter((r) => r.risk_score > 70)
  const totalGbp = atRisk.reduce((sum, r) => sum + (r.deals?.value_gbp ?? 0), 0)
  return { count: atRisk.length, totalGbp }
}

/** Risk colour based on score */
export function riskColour(score: number): string {
  if (score > 70) return '#FF6B6B'
  if (score >= 30) return '#F59E0B'
  return '#10B981'
}
