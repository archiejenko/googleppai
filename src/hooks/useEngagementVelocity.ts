/**
 * useEngagementVelocity — R5
 * Engagement velocity from deal_contacts response_time_hours.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export type VelocityDirection = 'accelerating' | 'stable' | 'decelerating'
export type VelocityMagnitude = 'mild' | 'moderate' | 'severe'

export interface VelocityResult {
  score: number | null
  direction: VelocityDirection | null
  magnitude: VelocityMagnitude | null
  sparkline: number[]
}

/**
 * Compute engagement velocity.
 * velocity = avg(last_3_response_times) / avg(first_3_response_times)
 * < 1.0 = accelerating (faster responses), > 1.0 = decelerating (slower)
 */
export function computeVelocity(responseTimes: number[]): VelocityResult {
  if (responseTimes.length < 3) {
    return { score: null, direction: null, magnitude: null, sparkline: responseTimes }
  }

  const first3 = responseTimes.slice(0, 3)
  const last3  = responseTimes.slice(-3)

  const avgFirst = first3.reduce((a, b) => a + b, 0) / 3
  const avgLast  = last3.reduce((a, b)  => a + b, 0) / 3

  if (avgFirst === 0) return { score: null, direction: null, magnitude: null, sparkline: responseTimes }

  const score = avgLast / avgFirst

  let direction: VelocityDirection
  if (score < 1.0) direction = 'accelerating'
  else if (score === 1.0) direction = 'stable'
  else direction = 'decelerating'

  let magnitude: VelocityMagnitude | null = null
  if (direction === 'decelerating') {
    if (score > 2.0) magnitude = 'severe'
    else if (score > 1.5) magnitude = 'moderate'
    else magnitude = 'mild'
  }

  return { score, direction, magnitude, sparkline: responseTimes }
}

export function useEngagementVelocity(dealId: string | undefined) {
  return useQuery({
    queryKey: ['engagement-velocity', dealId],
    queryFn: async () => {
      if (!dealId) return { score: null, direction: null, magnitude: null, sparkline: [] }
      const { data, error } = await supabase
        .from('deal_contacts')
        .select('response_time_hours, last_contacted_at')
        .eq('deal_id', dealId)
        .order('last_contacted_at', { ascending: true })
      if (error) throw error
      const times = (data ?? [])
        .map((c: { response_time_hours: number | null }) => c.response_time_hours)
        .filter((t): t is number => t !== null)
      return computeVelocity(times)
    },
    enabled: !!dealId,
  })
}
