/**
 * MeetingTimeline — R6
 * Timeline of scored meetings per deal. TierGated.
 */

import { useMeetingScoresForDeal } from '../../hooks/useMeetingScores'
import { TAG_LABELS, TAG_SENTIMENT, type MeetingTag } from '../../config/meetingTags'
import TierGate from '../../components/shared/TierGate'

function scoreColour(score: number): string {
  if (score >= 70) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#FF6B6B'
}

function TagPill({ tag }: { tag: MeetingTag }) {
  const positive = TAG_SENTIMENT[tag] === 'positive'
  return (
    <span
      className="text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 font-semibold"
      style={{
        backgroundColor: positive ? '#10B98120' : '#FF6B6B20',
        color: positive ? '#10B981' : '#FF6B6B',
        border: `1px solid ${positive ? '#10B98140' : '#FF6B6B40'}`,
      }}
    >
      {TAG_LABELS[tag] ?? tag}
    </span>
  )
}

interface Props { dealId: string }

export default function MeetingTimeline({ dealId }: Props) {
  const { data: meetings = [], isLoading } = useMeetingScoresForDeal(dealId)

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e] p-6">
        <h2 className="font-display text-sm uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
          Meeting Timeline
        </h2>

        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : meetings.length === 0 ? (
          <p className="text-sm text-[#6b7280]">No scored meetings yet.</p>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => {
              const colour = scoreColour(m.score)
              return (
                <div key={m.id} className="border border-[#2a2a2e] bg-[#1c1c1f] p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="font-display text-2xl font-semibold"
                        style={{ color: colour }}
                      >
                        {Math.round(m.score)}
                      </span>
                      <span className="text-xs text-[#6b7280]">
                        {new Date(m.scored_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  {m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {m.tags.map((t) => <TagPill key={t} tag={t as MeetingTag} />)}
                    </div>
                  )}
                  {m.ai_coaching_note && (
                    <p className="text-xs text-[#6b7280] leading-relaxed italic">
                      "{m.ai_coaching_note}"
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </TierGate>
  )
}
