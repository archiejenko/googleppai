/**
 * useCallBuyingSignals — L6
 *
 * Per-call buying signals, rep-level missed signal trend,
 * and team-wide missed signal insight for managers.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { SIGNAL_TYPE_LABELS } from '../config/buyingSignals'
import type { SignalType } from '../config/buyingSignals'

export type { SignalType }
export { SIGNAL_TYPE_LABELS }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CallBuyingSignal {
  id:                       string
  call_id:                  string
  rep_id:                   string
  signal_text:              string
  signal_type:              SignalType
  signal_timestamp_seconds: number
  capitalised:              boolean | null
  capitalisation_score:     number | null
  rep_response_text:        string | null
  created_at:               string
}

export interface BuyingSignalTrendPoint {
  call_id:      string
  call_date:    string
  total:        number
  capitalised:  number
  missed:       number
  missed_rate:  number   // 0–100 percentage
}

export interface TeamBuyingSignalInsight {
  team_missed_rate:  number        // 0–100
  most_missed_type:  SignalType | null
  total_signals:     number
  total_missed:      number
}

// ── Capitalisation score helper ───────────────────────────────────────────────

export function computeCapitalisationScore(
  nextStep: number, advancement: number, acknowledgement: number,
): number {
  return Math.min(100, Math.round(nextStep + advancement + acknowledgement))
}

// ── Missed-signal rate helper (pure, testable) ────────────────────────────────

export function missedSignalRate(total: number, capitalised: number): number {
  if (total === 0) return 0
  return Math.round(((total - capitalised) / total) * 100)
}

// ── Trend insight ─────────────────────────────────────────────────────────────

export function buyingSignalInsight(points: BuyingSignalTrendPoint[]): string | null {
  if (!points.length) return null
  const latest = points[points.length - 1]
  if (latest.missed_rate > 50) {
    return `Missing ${latest.missed_rate}% of buying signals — coach on capitalisation technique.`
  }
  return null
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Per-call signals list with capitalisation status */
export function useCallBuyingSignals(callId: string) {
  return useQuery<CallBuyingSignal[]>({
    queryKey: ['call-buying-signals', callId],
    enabled:  Boolean(callId),
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('call_buying_signals')
        .select('*')
        .eq('call_id', callId)
        .order('signal_timestamp_seconds', { ascending: true })

      if (error) throw error
      return (data ?? []) as unknown as CallBuyingSignal[]
    },
  })
}

/** Missed signal rate over last N calls for a rep */
export function useBuyingSignalTrend(repId: string, limit = 20) {
  return useQuery<BuyingSignalTrendPoint[]>({
    queryKey: ['buying-signal-trend', repId, limit],
    enabled:  Boolean(repId),
    queryFn:  async () => {
      // Fetch all signals for last `limit` calls (ordered by call date)
      const { data, error } = await supabase
        .from('call_buying_signals')
        .select('call_id, created_at, capitalised')
        .eq('rep_id', repId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!data?.length) return []

      const rows = data as unknown as { call_id: string; created_at: string; capitalised: boolean | null }[]

      // Group by call_id
      const callMap = new Map<string, { date: string; total: number; capitalised: number }>()
      for (const row of rows) {
        const prev = callMap.get(row.call_id) ?? { date: row.created_at, total: 0, capitalised: 0 }
        callMap.set(row.call_id, {
          date:       prev.date,
          total:      prev.total + 1,
          capitalised: prev.capitalised + (row.capitalised ? 1 : 0),
        })
      }

      return [...callMap.entries()]
        .slice(-limit)
        .map(([call_id, { date, total, capitalised }]) => {
          const missed = total - capitalised
          return {
            call_id,
            call_date:   date,
            total,
            capitalised,
            missed,
            missed_rate: missedSignalRate(total, capitalised),
          }
        })
    },
  })
}

/** Team-wide missed signal insight for managers */
export function useTeamBuyingSignalInsight(days = 30) {
  return useQuery<TeamBuyingSignalInsight>({
    queryKey: ['team-buying-signal-insight', days],
    queryFn:  async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data, error } = await supabase
        .from('call_buying_signals')
        .select('signal_type, capitalised')
        .gte('created_at', since)

      if (error) throw error
      const rows = (data ?? []) as { signal_type: SignalType; capitalised: boolean | null }[]

      if (!rows.length) {
        return { team_missed_rate: 0, most_missed_type: null, total_signals: 0, total_missed: 0 }
      }

      const total     = rows.length
      const cap       = rows.filter(r => r.capitalised).length
      const missed    = total - cap

      // Find most missed signal type
      const missedCounts = new Map<SignalType, number>()
      for (const row of rows.filter(r => !r.capitalised)) {
        missedCounts.set(row.signal_type, (missedCounts.get(row.signal_type) ?? 0) + 1)
      }
      const mostMissed = [...missedCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      return {
        team_missed_rate:  missedSignalRate(total, cap),
        most_missed_type:  mostMissed,
        total_signals:     total,
        total_missed:      missed,
      }
    },
  })
}
