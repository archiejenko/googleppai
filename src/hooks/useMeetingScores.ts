/**
 * useMeetingScores — R6
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import type { MeetingTag } from '../config/meetingTags'
import { TAG_SENTIMENT } from '../config/meetingTags'

export interface MeetingScore {
  id: string
  call_id: string
  deal_id: string | null
  org_id: string
  score: number
  tags: MeetingTag[]
  ai_coaching_note: string | null
  scored_at: string
}

/** Return the highest-severity negative tag, or null if all positive */
export function primaryTag(tags: MeetingTag[]): MeetingTag | null {
  const negatives = tags.filter((t) => TAG_SENTIMENT[t] === 'negative')
  return negatives[0] ?? null
}

export function useMeetingScoresForDeal(dealId: string | undefined) {
  return useQuery({
    queryKey: ['meeting-scores-deal', dealId],
    queryFn: async () => {
      if (!dealId) return []
      const { data, error } = await supabase
        .from('meeting_scores')
        .select('*')
        .eq('deal_id', dealId)
        .order('scored_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as MeetingScore[]
    },
    enabled: !!dealId,
  })
}

export function useRecentMeetingScores(limit = 5) {
  return useQuery({
    queryKey: ['meeting-scores-recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_scores')
        .select('*, profiles:rep_id(full_name), deals(name)')
        .order('scored_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as (MeetingScore & {
        profiles: { full_name: string } | null
        deals: { name: string } | null
      })[]
    },
  })
}
