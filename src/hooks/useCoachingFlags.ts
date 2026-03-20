import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface CoachingFlag {
    id: string
    manager_id: string
    rep_id: string
    flag_type: string
    detail: string | null
    weakest_skill: string | null
    suggested_topic: string | null
    trend: 'improving' | 'declining' | 'flat' | null
    dismissed: boolean
    created_at: string
    updated_at: string
}

export interface CoachingFlagWithRep extends CoachingFlag {
    rep?: {
        id: string
        name: string | null
        email: string
        avatar_url: string | null
    }
}

export function useCoachingFlags(managerId?: string) {
    return useQuery<CoachingFlagWithRep[]>({
        queryKey: ['coaching-flags', managerId],
        queryFn: async () => {
            if (!managerId) return []

            const { data, error } = await supabase
                .from('coaching_flags')
                .select(`
                    *,
                    rep:profiles!coaching_flags_rep_id_fkey(id, name, email, avatar_url)
                `)
                .eq('manager_id', managerId)
                .eq('dismissed', false)
                .order('updated_at', { ascending: false })

            if (error) throw error
            return (data || []) as CoachingFlagWithRep[]
        },
        enabled: !!managerId,
        staleTime: 60 * 1000,
    })
}

export function useDismissFlag() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (flagId: string) => {
            const { error } = await supabase
                .from('coaching_flags')
                .update({ dismissed: true })
                .eq('id', flagId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coaching-flags'] })
        },
    })
}

export function useRefreshCoachingPrompts() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const { data: { session } } = await supabase.auth.getSession()
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

            const res = await fetch(`${supabaseUrl}/functions/v1/generate-coaching-prompts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({}),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to refresh coaching prompts')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coaching-flags'] })
        },
    })
}
