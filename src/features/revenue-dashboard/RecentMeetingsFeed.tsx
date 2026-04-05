/**
 * RecentMeetingsFeed — R6
 * Last 5 scored meetings across all reps. TierGated.
 */

import { useRecentMeetingScores, primaryTag } from '../../hooks/useMeetingScores'
import { TAG_LABELS, type MeetingTag } from '../../config/meetingTags'
import TierGate from '../../components/shared/TierGate'

function scoreColour(score: number): string {
  if (score >= 70) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#FF6B6B'
}

export default function RecentMeetingsFeed() {
  const { data: meetings = [], isLoading } = useRecentMeetingScores(5)

  return (
    <TierGate>
      <section className="bg-[#161618] border border-[#2a2a2e]">
        <div className="px-4 py-3 border-b border-[#2a2a2e]">
          <h2 className="font-display text-xs uppercase tracking-[0.2em] text-[#9ca3af]">
            Recent Meetings
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-4 h-4 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-6 text-center text-[#6b7280] text-sm">No scored meetings yet.</div>
        ) : (
          <div className="divide-y divide-[#2a2a2e]">
            {meetings.map((m) => {
              const colour = scoreColour(m.score)
              const negTag = primaryTag(m.tags as MeetingTag[])
              const tagLabel = negTag
                ? TAG_LABELS[negTag]
                : m.tags.length > 0 ? 'All positive' : '—'
              const tagColour = negTag ? '#FF6B6B' : '#10B981'
              return (
                <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-[#f9fafb] font-medium truncate">
                      {m.deals?.name ?? 'Unknown deal'}
                    </p>
                    <p className="text-xs text-[#6b7280] truncate">
                      {m.profiles?.full_name ?? 'Rep'} ·{' '}
                      {new Date(m.scored_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 border font-semibold"
                      style={{ color: tagColour, borderColor: `${tagColour}40`, backgroundColor: `${tagColour}15` }}
                    >
                      {tagLabel}
                    </span>
                    <span
                      className="font-display text-xl font-semibold w-10 text-right"
                      style={{ color: colour }}
                    >
                      {Math.round(m.score)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </TierGate>
  )
}
