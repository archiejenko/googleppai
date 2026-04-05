/**
 * ForecastPanel — R9
 * Three-column current period summary + submission form.
 * Analytics view is TierGated; submission form is available to all tiers.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  useTeamForecast,
  useSubmitForecast,
  aiAdjustedForecast,
  forecastBias,
  currentPeriod,
  type ForecastSubmission,
} from '../../hooks/useForecasting'
import TierGate from '../../components/shared/TierGate'

function fmt(v: number): string {
  return `£${Math.round(v).toLocaleString()}`
}

export default function ForecastPanel() {
  const period = currentPeriod()
  const { data, isLoading } = useTeamForecast(period)
  const submit = useSubmitForecast()
  const [showForm, setShowForm] = useState(false)
  const [committed, setCommitted] = useState('')
  const [bestCase, setBestCase] = useState('')

  const bias = data
    ? forecastBias(
        (data.submissions as ForecastSubmission[]).map((s) => ({
          committed_amount: s.committed_amount,
          actual_amount: data.actualTotal > 0 ? data.actualTotal : null,
        }))
      )
    : null

  const aiAdjusted = data ? aiAdjustedForecast(data.committedTotal, bias) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const c = parseFloat(committed)
    const b = parseFloat(bestCase)
    if (isNaN(c) || isNaN(b)) return
    await submit.mutateAsync({ period, committed_amount: c, best_case_amount: b })
    setCommitted('')
    setBestCase('')
    setShowForm(false)
  }

  return (
    <section className="bg-[#161618] border border-[#2a2a2e]">
      <div className="px-4 py-3 border-b border-[#2a2a2e] flex items-center justify-between">
        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-[#9ca3af]">
          Forecast · {period}
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#818cf8] transition-colors"
        >
          + Submit Forecast
          {showForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Submission form — available to all tiers */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-[#2a2a2e] grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">
              Committed (£)
            </label>
            <input
              type="number"
              value={committed}
              onChange={(e) => setCommitted(e.target.value)}
              placeholder="50000"
              className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 focus:border-[#6366F1] outline-none"
              required
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">
              Best Case (£)
            </label>
            <input
              type="number"
              value={bestCase}
              onChange={(e) => setBestCase(e.target.value)}
              placeholder="75000"
              className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 focus:border-[#6366F1] outline-none"
              required
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submit.isPending}
              className="bg-[#6366F1] text-white text-sm px-4 py-2 hover:bg-[#5457e5] transition-colors disabled:opacity-50"
            >
              {submit.isPending ? 'Submitting…' : 'Submit Forecast'}
            </button>
          </div>
        </form>
      )}

      {/* Analytics — TierGated */}
      <TierGate>
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 divide-x divide-[#2a2a2e]" data-testid="forecast-summary">
            <div className="p-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] mb-1">Committed</p>
              <p className="font-display text-2xl text-[#f9fafb]">
                {data ? fmt(data.committedTotal) : '—'}
              </p>
            </div>
            <div className="p-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] mb-1">AI-Adjusted</p>
              <p className="font-display text-2xl text-[#6366F1]">
                {aiAdjusted !== null ? fmt(aiAdjusted) : '—'}
              </p>
              {bias !== null && (
                <p className="text-[10px] text-[#6b7280] mt-0.5">
                  {bias > 1 ? 'Typically over-forecasts' : 'Typically under-forecasts'}{' '}
                  {Math.abs(Math.round((bias - 1) * 100))}%
                </p>
              )}
            </div>
            <div className="p-5">
              <p className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] mb-1">Actual to Date</p>
              <p className="font-display text-2xl text-[#10B981]">
                {data ? fmt(data.actualTotal) : '—'}
              </p>
            </div>
          </div>
        )}
      </TierGate>
    </section>
  )
}
