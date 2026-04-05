/**
 * SimilarDealsPanel — R10
 * Shows similar historical deals or "insufficient data" state. TierGated.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../utils/supabase'
import TierGate from '../../components/shared/TierGate'

const THRESHOLD = 50

interface SimilarDeal {
  similar_deal_id: string
  similarity: number
  outcome: string | null
}

function useClosedDealCount() {
  return useQuery({
    queryKey: ['closed-deal-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .not('outcome', 'is', null)
      return count ?? 0
    },
  })
}

function useSimilarDeals(dealId: string | undefined) {
  return useQuery({
    queryKey: ['similar-deals', dealId],
    queryFn: async () => {
      if (!dealId) return []
      const { data, error } = await supabase.rpc('match_similar_deals', {
        p_deal_id: dealId,
        match_limit: 5,
      })
      if (error) throw error
      return (data ?? []) as SimilarDeal[]
    },
    enabled: !!dealId,
  })
}

interface Props { dealId: string }

export default function SimilarDealsPanel({ dealId }: Props) {
  const { data: closedCount = 0, isLoading: countLoading } = useClosedDealCount()
  const { data: similar = [], isLoading: simLoading } = useSimilarDeals(
    closedCount >= THRESHOLD ? dealId : undefined
  )

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-6" data-testid="similar-deals-panel">
        <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
          Pattern Matching
        </h2>

        {countLoading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : closedCount < THRESHOLD ? (
          <div data-testid="insufficient-data-state">
            <p className="text-sm text-[#6b7280] mb-3">
              Pattern matching activates after {THRESHOLD} closed deals.{' '}
              <span className="text-[#9ca3af] font-semibold">{closedCount} deals</span> recorded so far.
            </p>
            {/* Progress bar */}
            <div className="w-full bg-[#2a2a2e] h-1.5">
              <div
                className="h-1.5 bg-[#6366F1]"
                style={{ width: `${Math.min(100, (closedCount / THRESHOLD) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[#6b7280] mt-1">
              {THRESHOLD - closedCount} more closed deals needed
            </p>
          </div>
        ) : simLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : similar.length === 0 ? (
          <p className="text-sm text-[#6b7280]">No similar deals found — run the vectoriser to index this deal.</p>
        ) : (
          <div className="space-y-2">
            {similar.map((s) => (
              <div key={s.similar_deal_id} className="flex items-center justify-between bg-[#1c1c1f] border border-[#2a2a2e] px-4 py-2">
                <span className="font-mono text-xs text-[#6b7280]">{s.similar_deal_id.slice(0, 8)}…</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#9ca3af]">
                    {Math.round(s.similarity * 100)}% similar
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 font-semibold"
                    style={{
                      color: s.outcome === 'won' ? '#10B981' : '#FF6B6B',
                      backgroundColor: s.outcome === 'won' ? '#10B98115' : '#FF6B6B15',
                      border: `1px solid ${s.outcome === 'won' ? '#10B98140' : '#FF6B6B40'}`,
                    }}
                  >
                    {s.outcome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </TierGate>
  )
}
