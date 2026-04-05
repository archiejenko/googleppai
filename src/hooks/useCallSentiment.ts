/**
 * useCallSentiment — R4
 * Sentiment trend per deal with trajectory computation.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface SentimentPoint {
  id: string
  call_id: string
  deal_id: string | null
  sentiment_score: number
  positive_signals: string[]
  negative_signals: string[]
  recorded_at: string
}

export type SentimentTrajectory = 'improving' | 'stable' | 'declining'

/**
 * Compute slope of last N scores. Returns trajectory label.
 * slope < -0.1 = declining, slope > 0.1 = improving, else stable.
 */
export function computeSentimentTrajectory(scores: number[]): SentimentTrajectory | null {
  if (scores.length < 2) return null
  const n = scores.length
  const slope = (scores[n - 1] - scores[0]) / (n - 1)
  if (slope < -0.1) return 'declining'
  if (slope > 0.1) return 'improving'
  return 'stable'
}

/** Area fill colour for sentiment score */
export function sentimentFillColour(score: number): string {
  if (score > 0.3)  return '#10B981'
  if (score >= 0)   return '#F59E0B'
  return '#FF6B6B'
}

export function useCallSentiment(dealId: string | undefined) {
  return useQuery({
    queryKey: ['call-sentiment', dealId],
    queryFn: async () => {
      if (!dealId) return []
      const { data, error } = await supabase
        .from('call_sentiment')
        .select('*')
        .eq('deal_id', dealId)
        .order('recorded_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as SentimentPoint[]
    },
    enabled: !!dealId,
  })
}
