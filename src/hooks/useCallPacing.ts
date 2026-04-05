/**
 * useCallPacing — L8
 *
 * Pacing window data, per-call pacing score, and trend across calls.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import type { PacingFlag } from '../config/pacing'

export type { PacingFlag }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PacingWindow {
  id:                   string
  window_start_seconds: number
  window_end_seconds:   number
  wpm:                  number | null
  flag:                 PacingFlag | null
}

export interface PacingScore {
  avg_speech_rate_wpm:  number | null
  speech_rate_variance: number | null
  pacing_score:         number | null
}

export interface PacingTrendPoint {
  call_id:    string
  call_date:  string
  pacing_score: number
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Per-call 30-second windows with wpm and flag */
export function useCallPacingWindows(callId: string) {
  return useQuery<PacingWindow[]>({
    queryKey: ['call-pacing-windows', callId],
    enabled:  Boolean(callId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('call_pacing_windows')
        .select('id, window_start_seconds, window_end_seconds, wpm, flag')
        .eq('call_id', callId)
        .order('window_start_seconds', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as PacingWindow[]
    },
  })
}

/** Per-call pacing aggregate from live_scores */
export function usePacingScore(callId: string) {
  return useQuery<PacingScore | null>({
    queryKey: ['pacing-score', callId],
    enabled:  Boolean(callId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select('avg_speech_rate_wpm, speech_rate_variance, pacing_score')
        .eq('call_id', callId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return {
        avg_speech_rate_wpm:  data.avg_speech_rate_wpm  ?? null,
        speech_rate_variance: data.speech_rate_variance ?? null,
        pacing_score:         data.pacing_score         ?? null,
      } as PacingScore
    },
  })
}

/** Pacing score trend over last N calls for a rep */
export function usePacingTrend(repId: string, limit = 20) {
  return useQuery<PacingTrendPoint[]>({
    queryKey: ['pacing-trend', repId, limit],
    enabled:  Boolean(repId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('live_scores')
        .select('call_id, call_started_at, pacing_score')
        .eq('rep_id', repId)
        .not('pacing_score', 'is', null)
        .order('call_started_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return ((data ?? []) as unknown as { call_id: string; call_started_at: string; pacing_score: number }[])
        .map(r => ({
          call_id:      r.call_id,
          call_date:    r.call_started_at,
          pacing_score: r.pacing_score,
        }))
    },
  })
}
