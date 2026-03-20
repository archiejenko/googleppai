import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface DealOutcome {
    id: string
    user_id: string
    deal_session_id: string | null
    deal_name: string
    outcome: 'won' | 'lost' | 'no_decision'
    deal_value: number | null
    close_date: string | null
    notes: string | null
    created_at: string
}

export interface CorrelationRow {
    outcome_id: string
    user_id: string
    outcome: string
    deal_value: number | null
    close_date: string | null
    deal_session_id: string | null
    was_prepped: boolean
    avg_training_score: number | null
    related_metrics_count: number
    created_at: string
}

export interface CorrelationStats {
    preppedWinRate: number
    unpreppedWinRate: number
    totalDeals: number
    preppedCount: number
    unpreppedCount: number
    winRateDelta: number
}

export function useDealOutcomes(userId?: string) {
    return useQuery<DealOutcome[]>({
        queryKey: ['deal-outcomes', userId],
        queryFn: async () => {
            if (!userId) return []
            const { data, error } = await supabase
                .from('deal_outcomes')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20)
            if (error) throw error
            return (data || []) as DealOutcome[]
        },
        enabled: !!userId,
        staleTime: 60 * 1000,
    })
}

export function useAddDealOutcome() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (entry: {
            deal_name: string
            outcome: 'won' | 'lost' | 'no_decision'
            deal_value?: number
            close_date?: string
            notes?: string
            deal_session_id?: string
        }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('deal_outcomes')
                .insert({ ...entry, user_id: user.id })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deal-outcomes'] })
            queryClient.invalidateQueries({ queryKey: ['correlation-stats'] })
        },
    })
}

export function useCorrelationStats(userId?: string, days: number = 30) {
    return useQuery<CorrelationStats | null>({
        queryKey: ['correlation-stats', userId, days],
        queryFn: async () => {
            if (!userId) return null

            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

            const { data, error } = await supabase
                .from('training_correlation')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', since)

            if (error) throw error
            if (!data || data.length === 0) return null

            const rows = data as CorrelationRow[]

            const prepped = rows.filter(r => r.was_prepped)
            const unprepped = rows.filter(r => !r.was_prepped)

            const preppedWins = prepped.filter(r => r.outcome === 'won').length
            const unpreppedWins = unprepped.filter(r => r.outcome === 'won').length

            const preppedWinRate = prepped.length > 0
                ? Math.round((preppedWins / prepped.length) * 100)
                : 0
            const unpreppedWinRate = unprepped.length > 0
                ? Math.round((unpreppedWins / unprepped.length) * 100)
                : 0

            return {
                preppedWinRate,
                unpreppedWinRate,
                totalDeals: rows.length,
                preppedCount: prepped.length,
                unpreppedCount: unprepped.length,
                winRateDelta: preppedWinRate - unpreppedWinRate,
            }
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000,
    })
}
