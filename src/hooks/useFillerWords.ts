/**
 * useFillerWords — L4
 *
 * Reads filler word data from live_scores for a single call,
 * and provides trend data across recent calls for a rep.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { FILLER_RATE_WARNING, FILLER_RATE_CRITICAL, FILLER_RATE_TARGET } from '../config/fillerWords'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FillerWordData {
  filler_word_count:     number
  filler_rate_per_min:   number
  filler_words_breakdown: Record<string, number>
}

export interface FillerWordTrendPoint {
  call_id:          string
  call_date:        string
  filler_rate:      number
  filler_count:     number
}

// ── Severity helper ───────────────────────────────────────────────────────────

export type FillerSeverity = 'good' | 'warning' | 'critical'

export function fillerSeverity(rate: number): FillerSeverity {
  if (rate >= FILLER_RATE_CRITICAL) return 'critical'
  if (rate >= FILLER_RATE_WARNING)  return 'warning'
  return 'good'
}

export { FILLER_RATE_WARNING, FILLER_RATE_CRITICAL, FILLER_RATE_TARGET }

// ── Trend insight ─────────────────────────────────────────────────────────────

/**
 * Returns a coaching insight string if the filler rate is trending up
 * over the last N points (default 5). Returns null if stable or improving.
 */
export function fillerTrendInsight(
  points: FillerWordTrendPoint[],
  window = 5,
): string | null {
  if (points.length < window) return null

  const recent = points.slice(-window)
  const first  = recent[0].filler_rate
  const last   = recent[recent.length - 1].filler_rate

  // Count how many consecutive increases
  let increases = 0
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].filler_rate > recent[i - 1].filler_rate) increases++
  }

  // Trending up if majority of steps are increases AND last > first
  if (increases >= Math.ceil(window / 2) && last > first) {
    const delta = (last - first).toFixed(1)
    return `Filler rate up ${delta}/min over last ${window} calls — review pacing habits.`
  }

  return null
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useFillerWords(callId: string) {
  return useQuery<FillerWordData | null>({
    queryKey: ['filler-words', callId],
    enabled:  Boolean(callId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select('filler_word_count, filler_rate_per_min, filler_words_breakdown')
        .eq('call_id', callId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return {
        filler_word_count:      data.filler_word_count     ?? 0,
        filler_rate_per_min:    data.filler_rate_per_min   ?? 0,
        filler_words_breakdown: (data.filler_words_breakdown ?? {}) as Record<string, number>,
      }
    },
  })
}

export function useFillerWordTrend(repId: string, limit = 20) {
  return useQuery<FillerWordTrendPoint[]>({
    queryKey: ['filler-word-trend', repId, limit],
    enabled:  Boolean(repId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select('call_id, call_started_at, filler_rate_per_min, filler_word_count')
        .eq('rep_id', repId)
        .not('filler_rate_per_min', 'is', null)
        .order('call_started_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      if (!data) return []

      return (data as unknown as {
        call_id: string
        call_started_at: string
        filler_rate_per_min: number
        filler_word_count: number
      }[]).map(row => ({
        call_id:      row.call_id,
        call_date:    row.call_started_at,
        filler_rate:  row.filler_rate_per_min,
        filler_count: row.filler_word_count,
      }))
    },
  })
}
