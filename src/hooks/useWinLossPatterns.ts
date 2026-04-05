/**
 * useWinLossPatterns — R11
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import {
  dealSizeBand
} from '../config/dealOutcomeReasons'

export interface DealOutcomeRecord {
  id: string
  deal_id: string
  outcome: 'won' | 'lost'
  primary_reason: string
  secondary_reason: string | null
  rep_id: string
  deal_size_gbp: number
  segment: string | null
  ai_suggested_reason: string | null
  closed_at: string
}

export interface ReasonFrequency {
  reason: string
  count: number
  byBand: Record<string, number>
}

export function useWinLossPatterns() {
  return useQuery({
    queryKey: ['win-loss-patterns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_outcome_records')
        .select('*')
        .order('closed_at', { ascending: false })
      if (error) throw error

      const records = (data ?? []) as DealOutcomeRecord[]
      const won = records.filter((r) => r.outcome === 'won')
      const lost = records.filter((r) => r.outcome === 'lost')

      function buildFrequencies(subset: DealOutcomeRecord[]): ReasonFrequency[] {
        const map: Record<string, ReasonFrequency> = {}
        for (const r of subset) {
          const key = r.primary_reason
          if (!map[key]) map[key] = { reason: key, count: 0, byBand: {} }
          map[key].count++
          const band = dealSizeBand(r.deal_size_gbp)
          map[key].byBand[band] = (map[key].byBand[band] ?? 0) + 1
        }
        return Object.values(map).sort((a, b) => b.count - a.count)
      }

      return {
        winFrequencies: buildFrequencies(won),
        lossFrequencies: buildFrequencies(lost),
        total: records.length,
      }
    },
  })
}

export function useDealOutcomeRecord(dealId: string | undefined) {
  return useQuery({
    queryKey: ['deal-outcome-record', dealId],
    queryFn: async () => {
      if (!dealId) return null
      const { data, error } = await supabase
        .from('deal_outcome_records')
        .select('*')
        .eq('deal_id', dealId)
        .maybeSingle()
      if (error) throw error
      return data as DealOutcomeRecord | null
    },
    enabled: !!dealId,
  })
}

export function useRecordOutcome(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      outcome: 'won' | 'lost'
      primary_reason: string
      secondary_reason?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: deal } = await supabase
        .from('deals')
        .select('org_id, value_gbp')
        .eq('id', dealId)
        .single()
      const { error } = await supabase.from('deal_outcome_records').upsert({
        deal_id: dealId,
        org_id: deal?.org_id,
        outcome: input.outcome,
        primary_reason: input.primary_reason,
        secondary_reason: input.secondary_reason ?? null,
        rep_id: user?.id,
        deal_size_gbp: deal?.value_gbp ?? 0,
      }, { onConflict: 'deal_id' })
      if (error) throw error
      // Also update deals.outcome
      await supabase.from('deals').update({ outcome: input.outcome, closed_at: new Date().toISOString() }).eq('id', dealId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-outcome-record', dealId] })
      qc.invalidateQueries({ queryKey: ['win-loss-patterns'] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
