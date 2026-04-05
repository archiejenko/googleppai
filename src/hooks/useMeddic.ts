/**
 * useMeddic — R1
 * MEDDIC pillar scores per deal.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface MeddicRow {
  id: string
  deal_id: string
  org_id: string
  metrics_score: number | null
  economic_buyer_score: number | null
  decision_criteria_score: number | null
  decision_process_score: number | null
  pain_score: number | null
  champion_score: number | null
  meddic_completion_pct: number | null
  last_updated_at: string
}

export interface MeddicPillar {
  key: keyof Omit<MeddicRow, 'id' | 'deal_id' | 'org_id' | 'meddic_completion_pct' | 'last_updated_at'>
  label: string
  score: number | null
}

export const MEDDIC_PILLARS: { key: keyof MeddicRow; label: string }[] = [
  { key: 'metrics_score',            label: 'Metrics' },
  { key: 'economic_buyer_score',     label: 'Economic Buyer' },
  { key: 'decision_criteria_score',  label: 'Decision Criteria' },
  { key: 'decision_process_score',   label: 'Decision Process' },
  { key: 'pain_score',               label: 'Pain' },
  { key: 'champion_score',           label: 'Champion' },
]

/** Compute completion pct from non-null pillars (client-side mirror of DB generated column) */
export function computeMeddicCompletion(row: Partial<MeddicRow>): number | null {
  const scores = MEDDIC_PILLARS.map((p) => row[p.key] as number | null)
  const nonNull = scores.filter((s) => s !== null && s !== undefined)
  if (nonNull.length === 0) return null
  const sum = nonNull.reduce((acc, s) => acc + (s ?? 0), 0)
  return sum / 6 // always divide by 6 (all pillars), not just non-null count
}

export function useMeddic(dealId: string | undefined) {
  return useQuery({
    queryKey: ['meddic', dealId],
    queryFn: async () => {
      if (!dealId) return null
      const { data, error } = await supabase
        .from('deal_meddic')
        .select('*')
        .eq('deal_id', dealId)
        .maybeSingle()
      if (error) throw error
      return data as MeddicRow | null
    },
    enabled: !!dealId,
  })
}
