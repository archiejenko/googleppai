/**
 * usePipelineConversion — R8
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface ConversionRow {
  rep_id: string
  from_stage: string
  total_exits: number
  advanced_count: number
  conversion_rate_pct: number | null
}

export interface FunnelStage {
  stage: string
  count: number
  conversionToNext: number | null
}

const STAGE_ORDER = ['Prospect', 'Qualify', 'Demo', 'Proposal', 'Negotiate', 'Close']

export function usePipelineConversion() {
  return useQuery({
    queryKey: ['pipeline-conversion'],
    queryFn: async () => {
      const { data: convData, error: convError } = await supabase
        .from('stage_conversion_rates')
        .select('*')
      if (convError) throw convError

      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('stage, outcome')
      if (dealError) throw dealError

      // Funnel: count active deals per stage
      const stageCounts: Record<string, number> = {}
      for (const deal of dealData ?? []) {
        if (!deal.outcome) {
          stageCounts[deal.stage] = (stageCounts[deal.stage] ?? 0) + 1
        }
      }

      const funnel: FunnelStage[] = STAGE_ORDER.map((stage, _i) => ({
        stage,
        count: stageCounts[stage] ?? 0,
        conversionToNext: null, // computed after
      }))

      // Compute team-average conversion between each consecutive stage pair
      for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
        const fromStage = STAGE_ORDER[i]
        const rows = (convData ?? []) as ConversionRow[]
        const relevant = rows.filter((r) => r.from_stage === fromStage)
        if (relevant.length > 0) {
          const avg = relevant.reduce((sum, r) => sum + (r.conversion_rate_pct ?? 0), 0) / relevant.length
          funnel[i].conversionToNext = Math.round(avg)
        }
      }

      // Rep conversion table: group by rep, then stage
      const repMap: Record<string, Record<string, number | null>> = {}
      for (const row of (convData ?? []) as ConversionRow[]) {
        if (!repMap[row.rep_id]) repMap[row.rep_id] = {}
        repMap[row.rep_id][row.from_stage] = row.conversion_rate_pct
      }

      // Team averages per stage
      const teamAvg: Record<string, number | null> = {}
      for (const stage of STAGE_ORDER) {
        const vals = Object.values(repMap)
          .map((r) => r[stage])
          .filter((v): v is number => v !== null)
        teamAvg[stage] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }

      return { funnel, repConversions: repMap, teamAvg, stageOrder: STAGE_ORDER }
    },
  })
}
