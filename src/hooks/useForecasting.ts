/**
 * useForecasting — R9
 * Forecast accuracy, bias, AI-adjusted forecast.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface ForecastSubmission {
  id: string
  org_id: string
  rep_id: string
  period: string
  committed_amount: number
  best_case_amount: number
  submitted_at: string
}

/** forecastAccuracy = actual / committed. Null if either is null/zero */
export function forecastAccuracy(committed: number | null, actual: number | null): number | null {
  if (committed == null || actual == null || committed === 0) return null
  return actual / committed
}

/** forecastBias = avg(committed / actual) over submissions with non-null actual.
 *  Null if fewer than 2 periods with actual data. */
export function forecastBias(
  submissions: { committed_amount: number; actual_amount: number | null }[]
): number | null {
  const valid = submissions.filter((s) => s.actual_amount != null && s.actual_amount > 0)
  if (valid.length < 2) return null
  const sum = valid.reduce((acc, s) => acc + s.committed_amount / s.actual_amount!, 0)
  return sum / valid.length
}

/** aiAdjustedForecast = committed / bias. Null if bias null/zero */
export function aiAdjustedForecast(committed: number | null, bias: number | null): number | null {
  if (committed == null || bias == null || bias === 0) return null
  return committed / bias
}

/** Current quarter in YYYY-QN format */
export function currentPeriod(): string {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${q}`
}

export function useForecasting() {
  return useQuery({
    queryKey: ['forecast-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecast_submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ForecastSubmission[]
    },
  })
}

export function useSubmitForecast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { period: string; committed_amount: number; best_case_amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user?.id ?? '')
        .single()
      const { error } = await supabase.from('forecast_submissions').insert({
        rep_id: user?.id,
        org_id: profile?.org_id,
        ...input,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecast-submissions'] }),
  })
}

export function useTeamForecast(period: string) {
  return useQuery({
    queryKey: ['team-forecast', period],
    queryFn: async () => {
      const { data: subs, error: subErr } = await supabase
        .from('forecast_submissions')
        .select('*')
        .eq('period', period)
      if (subErr) throw subErr

      // Actual: sum of won deals closed in the period quarter
      const [year, q] = period.split('-Q')
      const qNum = parseInt(q)
      const startMonth = (qNum - 1) * 3
      const periodStart = new Date(parseInt(year), startMonth, 1).toISOString()
      const periodEnd = new Date(parseInt(year), startMonth + 3, 0).toISOString()

      const { data: closedDeals, error: dealsErr } = await supabase
        .from('deals')
        .select('value_gbp')
        .eq('outcome', 'won')
        .gte('closed_at', periodStart)
        .lte('closed_at', periodEnd)
      if (dealsErr) throw dealsErr

      const committedTotal = (subs ?? []).reduce((s: number, r: ForecastSubmission) => s + r.committed_amount, 0)
      const actualTotal = (closedDeals ?? []).reduce((s: number, r: { value_gbp: number }) => s + r.value_gbp, 0)

      return { submissions: (subs ?? []) as ForecastSubmission[], committedTotal, actualTotal }
    },
  })
}
