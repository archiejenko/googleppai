import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface RepProfile {
    user_id: string
    talk_ratio: number
    filler_phrase_hits: Record<string, number>
    discovery_depth_avg: number
    objection_win_rates: Record<string, number>
    last_updated: string
}

export function useRepDNA(userId?: string) {
    return useQuery<RepProfile | null>({
        queryKey: ['rep-dna', userId],
        queryFn: async () => {
            if (!userId) return null
            const { data, error } = await supabase
                .from('rep_profiles')
                .select('*')
                .eq('user_id', userId)
                .single()
            if (error) {
                if (error.code === 'PGRST116') return null // no profile yet
                throw error
            }
            return data as RepProfile
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    })
}
