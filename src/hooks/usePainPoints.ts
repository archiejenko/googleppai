import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type InsightType =
  | 'objection_loop_failure'
  | 'low_discovery_depth'
  | 'silence_aversion'
  | 'training_drop_off'

export type InsightSeverity = 'critical' | 'warning' | 'positive'

export interface PainPoint {
  insightType:     InsightType
  severity:        InsightSeverity | null
  impactPct:       number | null
  affectedRepIds:  string[]
  insightData:     Record<string, unknown>
  generatedAt:     string | null
  /** True when the Engine has run and returned data for this type. */
  hasData:         boolean
  /** True when insight_data.data_unavailable = true (Silence Aversion). */
  isDataUnavailable: boolean
}

// Canonical order for the 2×2 grid
const INSIGHT_ORDER: InsightType[] = [
  'objection_loop_failure',
  'low_discovery_depth',
  'silence_aversion',
  'training_drop_off',
]

// ── Query ─────────────────────────────────────────────────────────────────────

interface AiInsightRow {
  insight_type:     InsightType
  severity:         InsightSeverity | null
  impact_pct:       number | null
  affected_rep_ids: string[]
  insight_data:     Record<string, unknown>
  generated_at:     string
}

async function fetchPainPoints(): Promise<PainPoint[]> {
  // RLS scopes to the authenticated user's org automatically.
  // We upsert one row per type, so this returns ≤ 4 rows.
  const { data, error } = await supabase
    .from('ai_insights')
    .select('insight_type, severity, impact_pct, affected_rep_ids, insight_data, generated_at')
    .order('generated_at', { ascending: false })

  if (error) throw error

  const rowsByType = new Map<InsightType, AiInsightRow>()
  for (const row of (data ?? []) as AiInsightRow[]) {
    // Keep the most recent row per type (order is DESC so first wins)
    if (!rowsByType.has(row.insight_type)) {
      rowsByType.set(row.insight_type, row)
    }
  }

  return INSIGHT_ORDER.map(type => {
    const row = rowsByType.get(type)
    if (!row) {
      // Edge Function hasn't run yet or this type has no entry
      return {
        insightType:       type,
        severity:          null,
        impactPct:         null,
        affectedRepIds:    [],
        insightData:       {},
        generatedAt:       null,
        hasData:           false,
        isDataUnavailable: type === 'silence_aversion',
      }
    }

    return {
      insightType:       type,
      severity:          row.severity,
      impactPct:         row.impact_pct,
      affectedRepIds:    row.affected_rep_ids ?? [],
      insightData:       row.insight_data ?? {},
      generatedAt:       row.generated_at,
      hasData:           true,
      isDataUnavailable: row.insight_data?.data_unavailable === true,
    }
  })
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the latest AI-identified training pain points for the authenticated
 * manager's org. The `days` parameter is accepted for interface consistency
 * with other hooks but does not filter results — pain points are precomputed
 * daily by the pain-point-engine Edge Function and the latest run is always
 * returned.
 */
export function usePainPoints(_days?: number) {
  return useQuery<PainPoint[]>({
    queryKey: ['pain-points'],
    staleTime: 300_000,
    queryFn:  fetchPainPoints,
  })
}
