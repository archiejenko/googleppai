/**
 * useDeals — R1
 * Deal pipeline data with MEDDIC completion join.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export type DealStage = 'Prospect' | 'Qualify' | 'Demo' | 'Proposal' | 'Negotiate' | 'Close'
export type DealOutcome = 'won' | 'lost'

export interface Deal {
  id: string
  org_id: string
  rep_id: string
  name: string
  value_gbp: number
  stage: DealStage
  outcome: DealOutcome | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // joined from deal_meddic
  meddic_completion_pct: number | null
}

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          deal_meddic (meddic_completion_pct)
        `)
        .is('outcome', null)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((d: Record<string, unknown>) => ({
        ...d,
        meddic_completion_pct: (d.deal_meddic as { meddic_completion_pct: number | null }[] | null)?.[0]?.meddic_completion_pct ?? null,
      })) as Deal[]
    },
  })
}

export function useDeal(dealId: string | undefined) {
  return useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      if (!dealId) return null
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          deal_meddic (meddic_completion_pct)
        `)
        .eq('id', dealId)
        .single()
      if (error) throw error
      return {
        ...data,
        meddic_completion_pct: data.deal_meddic?.[0]?.meddic_completion_pct ?? null,
      } as Deal
    },
    enabled: !!dealId,
  })
}
