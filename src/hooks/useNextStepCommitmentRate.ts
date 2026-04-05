/**
 * useNextStepCommitmentRate — L7
 *
 * Rolling commitment rate, trend vs previous period,
 * and team leaderboard for managers.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { commitmentRate, trendDirection } from '../config/nextStep'
import type { TrendDirection } from '../config/nextStep'

export type { TrendDirection }
export { commitmentRate, trendDirection }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CallCommitmentRow {
  call_id:              string
  call_date:            string
  next_step_confirmed:  boolean
  next_step_text:       string | null
}

export interface CommitmentRateData {
  rate:        number           // 0–100
  trend:       TrendDirection
  trend_delta: number           // signed delta vs previous period
  confirmed:   number
  total:        number
  recent_calls: CallCommitmentRow[]
}

export interface RepLeaderboardRow {
  rep_id:    string
  rep_name:  string
  rate:      number
  trend:     TrendDirection
  call_count: number
}

// ── useNextStepCommitmentRate ─────────────────────────────────────────────────

export function useNextStepCommitmentRate(repId: string, days = 30) {
  return useQuery<CommitmentRateData>({
    queryKey: ['next-step-commitment-rate', repId, days],
    enabled:  Boolean(repId),
    queryFn:  async () => {
      const now      = Date.now()
      const since    = new Date(now - days * 86_400_000).toISOString()
      const prevSince = new Date(now - 2 * days * 86_400_000).toISOString()

      const { data, error } = await supabase
        .from('live_scores')
        .select('call_id, call_started_at, next_step_confirmed, next_step_text')
        .eq('rep_id', repId)
        .not('next_step_confirmed', 'is', null)
        .gte('call_started_at', prevSince)
        .order('call_started_at', { ascending: false })

      if (error) throw error

      const rows = (data ?? []) as unknown as {
        call_id:             string
        call_started_at:     string
        next_step_confirmed: boolean
        next_step_text:      string | null
      }[]

      const current  = rows.filter(r => r.call_started_at >= since)
      const previous = rows.filter(r => r.call_started_at < since)

      const curConfirmed  = current.filter(r => r.next_step_confirmed).length
      const curRate       = commitmentRate(curConfirmed, current.length)
      const prevConfirmed = previous.filter(r => r.next_step_confirmed).length
      const prevRate      = commitmentRate(prevConfirmed, previous.length)

      const recent_calls: CallCommitmentRow[] = current.slice(0, 10).map(r => ({
        call_id:             r.call_id,
        call_date:           r.call_started_at,
        next_step_confirmed: r.next_step_confirmed,
        next_step_text:      r.next_step_text,
      }))

      return {
        rate:        curRate,
        trend:       trendDirection(curRate, prevRate),
        trend_delta: curRate - prevRate,
        confirmed:   curConfirmed,
        total:       current.length,
        recent_calls,
      }
    },
  })
}

// ── useTeamCommitmentLeaderboard ──────────────────────────────────────────────

export function useTeamCommitmentLeaderboard(days = 30) {
  return useQuery<RepLeaderboardRow[]>({
    queryKey: ['team-commitment-leaderboard', days],
    queryFn:  async () => {
      const now       = Date.now()
      const since     = new Date(now - days * 86_400_000).toISOString()
      const prevSince = new Date(now - 2 * days * 86_400_000).toISOString()

      const { data, error } = await supabase
        .from('live_scores')
        .select('rep_id, call_started_at, next_step_confirmed, profiles!inner(full_name)')
        .not('next_step_confirmed', 'is', null)
        .gte('call_started_at', prevSince)

      if (error) throw error

      const rows = (data ?? []) as unknown as {
        rep_id:              string
        call_started_at:     string
        next_step_confirmed: boolean
        profiles:            { full_name: string }
      }[]

      // Aggregate per rep
      const repMap = new Map<string, {
        name: string
        curConfirmed: number; curTotal: number
        prevConfirmed: number; prevTotal: number
      }>()

      for (const row of rows) {
        const prev = repMap.get(row.rep_id) ?? {
          name: row.profiles?.full_name ?? row.rep_id,
          curConfirmed: 0, curTotal: 0, prevConfirmed: 0, prevTotal: 0,
        }
        const isCurrent = row.call_started_at >= since
        repMap.set(row.rep_id, {
          ...prev,
          curConfirmed:  prev.curConfirmed  + (isCurrent && row.next_step_confirmed ? 1 : 0),
          curTotal:      prev.curTotal      + (isCurrent ? 1 : 0),
          prevConfirmed: prev.prevConfirmed + (!isCurrent && row.next_step_confirmed ? 1 : 0),
          prevTotal:     prev.prevTotal     + (!isCurrent ? 1 : 0),
        })
      }

      return [...repMap.entries()]
        .map(([rep_id, { name, curConfirmed, curTotal, prevConfirmed, prevTotal }]) => {
          const rate     = commitmentRate(curConfirmed, curTotal)
          const prevRate = commitmentRate(prevConfirmed, prevTotal)
          return {
            rep_id,
            rep_name:   name,
            rate,
            trend:      trendDirection(rate, prevRate),
            call_count: curTotal,
          }
        })
        .sort((a, b) => b.rate - a.rate)
    },
  })
}
