/**
 * useCallObjections — L5
 *
 * Hooks for reading objection detection + AER scoring data.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ObjectionType =
  | 'price' | 'timing' | 'competitor' | 'internal_priority'
  | 'not_now' | 'feature_gap' | 'trust' | 'other'

export type ResponsePattern =
  | 'aer_complete' | 'acknowledge_only' | 'immediate_counter' | 'no_response'

export interface CallObjection {
  id:                          string
  call_id:                     string
  rep_id:                      string
  objection_type:              ObjectionType
  objection_text:              string
  objection_timestamp_seconds: number
  rep_response_text:           string | null
  rep_response_score:          number | null
  response_pattern:            ResponsePattern | null
  created_at:                  string
}

export interface ObjectionPatternStat {
  objection_type:     ObjectionType
  count:              number
  avg_response_score: number | null
}

export interface TeamObjectionCell {
  rep_id:             string
  rep_name:           string
  objection_type:     ObjectionType
  avg_response_score: number | null
  count:              number
}

// ── Labels ────────────────────────────────────────────────────────────────────

export const OBJECTION_TYPE_LABELS: Record<ObjectionType, string> = {
  price:             'Price',
  timing:            'Timing',
  competitor:        'Competitor',
  internal_priority: 'Internal Priority',
  not_now:           'Not Now',
  feature_gap:       'Feature Gap',
  trust:             'Trust',
  other:             'Other',
}

export const RESPONSE_PATTERN_LABELS: Record<ResponsePattern, string> = {
  aer_complete:      'AER Complete',
  acknowledge_only:  'Acknowledge Only',
  immediate_counter: 'Immediate Counter',
  no_response:       'No Response',
}

// ── Pure AER helpers (also used in Edge Function inline) ─────────────────────

export function deriveResponsePattern(
  acknowledge: number,
  explore:     number,
  respond:     number,
): ResponsePattern {
  const hasAck     = acknowledge >= 15
  const hasExplore = explore     >= 15
  const hasRespond = respond     >= 20

  if (hasAck && hasExplore && hasRespond) return 'aer_complete'
  if (hasAck && !hasExplore && !hasRespond) return 'acknowledge_only'
  if (!hasAck && !hasExplore && hasRespond) return 'immediate_counter'
  return 'no_response'
}

export function computeAerScore(
  acknowledge: number,
  explore:     number,
  respond:     number,
): number {
  return Math.min(100, Math.round(acknowledge + explore + respond))
}

export function responsePatternColor(pattern: ResponsePattern | null): string {
  if (!pattern) return '#6B7280'
  if (pattern === 'aer_complete')      return '#10B981'
  if (pattern === 'acknowledge_only')  return '#F59E0B'
  if (pattern === 'immediate_counter') return '#F59E0B'
  return '#FF6B6B'
}

export function aerScoreColor(score: number | null): string {
  if (score === null) return '#6B7280'
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#FF6B6B'
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Per-call objections list */
export function useCallObjections(callId: string) {
  return useQuery<CallObjection[]>({
    queryKey: ['call-objections', callId],
    enabled:  Boolean(callId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('call_objections')
        .select('*')
        .eq('call_id', callId)
        .order('objection_timestamp_seconds', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as CallObjection[]
    },
  })
}

/** Aggregated objection frequency + avg response score per type for a rep */
export function useObjectionPatterns(repId: string, days = 30) {
  return useQuery<ObjectionPatternStat[]>({
    queryKey: ['objection-patterns', repId, days],
    enabled:  Boolean(repId),
    queryFn:  async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data, error } = await supabase
        .from('call_objections')
        .select('objection_type, rep_response_score')
        .eq('rep_id', repId)
        .gte('created_at', since)

      if (error) throw error

      const rows = (data ?? []) as { objection_type: ObjectionType; rep_response_score: number | null }[]

      // Aggregate client-side
      const map = new Map<ObjectionType, { count: number; total: number; scored: number }>()
      for (const row of rows) {
        const prev = map.get(row.objection_type) ?? { count: 0, total: 0, scored: 0 }
        const score = row.rep_response_score
        map.set(row.objection_type, {
          count:  prev.count + 1,
          total:  prev.total  + (score ?? 0),
          scored: prev.scored + (score !== null ? 1 : 0),
        })
      }

      return Array.from(map.entries())
        .map(([objection_type, { count, total, scored }]) => ({
          objection_type,
          count,
          avg_response_score: scored > 0 ? Math.round(total / scored) : null,
        }))
        .sort((a, b) => b.count - a.count)
    },
  })
}

/** Manager view: rep × objection_type matrix of avg_response_score */
export function useTeamObjectionHeatmap(days = 30) {
  return useQuery<TeamObjectionCell[]>({
    queryKey: ['team-objection-heatmap', days],
    queryFn:  async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data, error } = await supabase
        .from('call_objections')
        .select('rep_id, objection_type, rep_response_score, profiles!inner(full_name)')
        .gte('created_at', since)

      if (error) throw error

      const rows = (data ?? []) as unknown as Array<{
        rep_id:             string
        objection_type:     ObjectionType
        rep_response_score: number | null
        profiles:           { full_name: string }
      }>

      // Aggregate rep × type
      const map = new Map<string, { rep_id: string; rep_name: string; objection_type: ObjectionType; total: number; scored: number; count: number }>()
      for (const row of rows) {
        const key  = `${row.rep_id}::${row.objection_type}`
        const prev = map.get(key) ?? {
          rep_id:        row.rep_id,
          rep_name:      row.profiles?.full_name ?? row.rep_id,
          objection_type: row.objection_type,
          total:  0, scored: 0, count: 0,
        }
        map.set(key, {
          ...prev,
          count:  prev.count  + 1,
          total:  prev.total  + (row.rep_response_score ?? 0),
          scored: prev.scored + (row.rep_response_score !== null ? 1 : 0),
        })
      }

      return Array.from(map.values()).map(({ rep_id, rep_name, objection_type, total, scored, count }) => ({
        rep_id,
        rep_name,
        objection_type,
        avg_response_score: scored > 0 ? Math.round(total / scored) : null,
        count,
      }))
    },
  })
}
