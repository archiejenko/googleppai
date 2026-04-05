/**
 * OutcomeForm — R11
 * Record deal outcome. Analytics view TierGated; form available to all tiers.
 */

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import {
  useDealOutcomeRecord,
  useRecordOutcome,
} from '../../hooks/useWinLossPatterns'
import {
  WIN_REASONS, LOSS_REASONS,
} from '../../config/dealOutcomeReasons'
import type { Deal } from '../../hooks/useDeals'

interface Props { deal: Deal }

export default function OutcomeForm({ deal }: Props) {
  const { data: existing, isLoading } = useDealOutcomeRecord(deal.id)
  const record = useRecordOutcome(deal.id)
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null)
  const [primaryReason, setPrimaryReason] = useState('')
  const [secondaryReason, setSecondaryReason] = useState('')

  // If deal already has an outcome set
  if (deal.outcome) {
    if (isLoading) return null
    return (
      <section className="bg-[#161618] border border-[#2a2a2e] p-6">
        <div className="flex items-center gap-3 mb-4">
          {deal.outcome === 'won'
            ? <CheckCircle className="w-5 h-5 text-[#10B981]" />
            : <XCircle className="w-5 h-5 text-[#FF6B6B]" />}
          <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af]">
            Deal {deal.outcome === 'won' ? 'Won' : 'Lost'}
          </h2>
        </div>

        {existing ? (
          <div>
            <p className="text-sm text-[#9ca3af] mb-1">
              Primary reason:{' '}
              <span className="text-[#f9fafb] font-medium">{existing.primary_reason}</span>
            </p>
            {existing.secondary_reason && (
              <p className="text-sm text-[#6b7280]">
                Secondary: {existing.secondary_reason}
              </p>
            )}
            {existing.ai_suggested_reason && (
              <p className="text-xs text-[#6b7280] mt-2 italic">
                AI insight: "{existing.ai_suggested_reason}"
              </p>
            )}
          </div>
        ) : (
          <OutcomeRecordForm
            dealId={deal.id}
            aiSuggested={null}
            onRecorded={() => {}}
          />
        )}
      </section>
    )
  }

  // Deal still active — show recording form
  const reasons = outcome === 'won' ? WIN_REASONS : outcome === 'lost' ? LOSS_REASONS : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!outcome || !primaryReason) return
    await record.mutateAsync({ outcome, primary_reason: primaryReason, secondary_reason: secondaryReason || undefined })
  }

  return (
    <section className="bg-[#161618] border border-[#2a2a2e] p-6">
      <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
        Record Outcome
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Won / Lost toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setOutcome('won'); setPrimaryReason('') }}
            className={`flex items-center gap-2 px-4 py-2 text-sm border transition-colors ${
              outcome === 'won'
                ? 'border-[#10B981] bg-[#10B981]/10 text-[#10B981]'
                : 'border-[#2a2a2e] text-[#6b7280] hover:border-[#10B981]/40'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> Won
          </button>
          <button
            type="button"
            onClick={() => { setOutcome('lost'); setPrimaryReason('') }}
            className={`flex items-center gap-2 px-4 py-2 text-sm border transition-colors ${
              outcome === 'lost'
                ? 'border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]'
                : 'border-[#2a2a2e] text-[#6b7280] hover:border-[#FF6B6B]/40'
            }`}
          >
            <XCircle className="w-4 h-4" /> Lost
          </button>
        </div>

        {outcome && (
          <>
            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">
                Primary Reason
              </label>
              <select
                value={primaryReason}
                onChange={(e) => setPrimaryReason(e.target.value)}
                className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 focus:border-[#6366F1] outline-none"
                required
              >
                <option value="">Select reason…</option>
                {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">
                Secondary Reason (optional)
              </label>
              <select
                value={secondaryReason}
                onChange={(e) => setSecondaryReason(e.target.value)}
                className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 focus:border-[#6366F1] outline-none"
              >
                <option value="">None</option>
                {reasons.filter((r) => r !== primaryReason).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={record.isPending || !primaryReason}
              className="bg-[#6366F1] text-white text-sm px-4 py-2 hover:bg-[#5457e5] transition-colors disabled:opacity-50"
            >
              {record.isPending ? 'Recording…' : 'Confirm Outcome'}
            </button>
          </>
        )}
      </form>
    </section>
  )
}

// Standalone form used when outcome exists but no record yet
function OutcomeRecordForm({ dealId, aiSuggested, onRecorded }: {
  dealId: string
  aiSuggested: string | null
  onRecorded: () => void
}) {
  const record = useRecordOutcome(dealId)
  const [primaryReason, setPrimaryReason] = useState(aiSuggested ?? '')

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await record.mutateAsync({ outcome: 'lost', primary_reason: primaryReason })
        onRecorded()
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-[9px] uppercase tracking-[0.15em] text-[#6b7280] block mb-1">Reason</label>
        <select
          value={primaryReason}
          onChange={(e) => setPrimaryReason(e.target.value)}
          className="w-full bg-[#0f0f10] border border-[#2a2a2e] text-[#f9fafb] text-sm px-3 py-2 outline-none"
          required
        >
          {LOSS_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <button
        type="submit"
        disabled={record.isPending}
        className="bg-[#6366F1] text-white text-sm px-4 py-2 hover:bg-[#5457e5] transition-colors disabled:opacity-50"
      >
        {record.isPending ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
