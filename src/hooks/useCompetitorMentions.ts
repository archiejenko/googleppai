/**
 * useCompetitorMentions — R7
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'


export interface CompetitorMention {
  id: string
  call_id: string
  deal_id: string | null
  competitor_name: string
  mention_timestamp_seconds: number | null
  rep_response_quality: number | null
  deal_stage_at_mention: string | null
  created_at: string
}

export interface CompetitorStats {
  competitor_name: string
  mention_count: number
  win_rate: number | null // null if no closed deals with this competitor
}

/** Win rate colour */
export function winRateColour(rate: number | null): string {
  if (rate === null) return '#6b7280'
  if (rate > 0.4)  return '#10B981'
  if (rate >= 0.2) return '#F59E0B'
  return '#FF6B6B'
}

export function useCompetitorStatsForCall(callId: string | undefined) {
  return useQuery({
    queryKey: ['competitor-mentions-call', callId],
    queryFn: async () => {
      if (!callId) return []
      const { data, error } = await supabase
        .from('competitor_mentions')
        .select('*')
        .eq('call_id', callId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as CompetitorMention[]
    },
    enabled: !!callId,
  })
}

export function useCompetitorStats() {
  return useQuery({
    queryKey: ['competitor-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_mentions')
        .select('competitor_name, deal_id, deals(outcome)')
      if (error) throw error

      const rows = data ?? []
      const byCompetitor: Record<string, { total: number; wonDeals: Set<string>; closedDeals: Set<string> }> = {}

      for (const row of (rows as unknown) as (CompetitorMention & { deals: { outcome: string | null } | null })[]) {
        const name = row.competitor_name
        if (!byCompetitor[name]) {
          byCompetitor[name] = { total: 0, wonDeals: new Set(), closedDeals: new Set() }
        }
        byCompetitor[name].total++
        if (row.deal_id && row.deals?.outcome) {
          byCompetitor[name].closedDeals.add(row.deal_id)
          if (row.deals.outcome === 'won') byCompetitor[name].wonDeals.add(row.deal_id)
        }
      }

      return Object.entries(byCompetitor)
        .map(([competitor_name, stats]): CompetitorStats => ({
          competitor_name,
          mention_count: stats.total,
          win_rate: stats.closedDeals.size > 0
            ? stats.wonDeals.size / stats.closedDeals.size
            : null,
        }))
        .sort((a, b) => b.mention_count - a.mention_count)
    },
  })
}
