/**
 * BattlecardPanel — R7
 * Shown on call review if a competitor was detected. TierGated.
 */

import { Shield } from 'lucide-react'
import { useCompetitorStatsForCall } from '../../hooks/useCompetitorMentions'
import { COMPETITOR_BATTLECARDS } from '../../config/competitorBattlecards'
import type { Competitor } from '../../config/competitors'
import TierGate from '../../components/shared/TierGate'

interface Props { callId: string }

export default function BattlecardPanel({ callId }: Props) {
  const { data: mentions = [], isLoading } = useCompetitorStatsForCall(callId)

  const knownMentions = mentions.filter(
    (m) => m.competitor_name !== 'Unknown' && COMPETITOR_BATTLECARDS[m.competitor_name as Competitor]
  )

  if (isLoading || knownMentions.length === 0) return null

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#6366F1]" />
          <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af]">
            Battlecard
          </h2>
        </div>
        {knownMentions.map((m) => {
          const bullets = COMPETITOR_BATTLECARDS[m.competitor_name as Competitor]
          return (
            <div key={m.id} className="mb-4 last:mb-0">
              <p className="text-xs uppercase tracking-[0.15em] text-[#6366F1] mb-2">
                vs {m.competitor_name}
              </p>
              <ul className="space-y-1.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#9ca3af]">
                    <span className="w-1 h-1 rounded-full bg-[#6366F1] mt-2 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </TierGate>
  )
}
