import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface DealSession {
    id: string
    user_id: string
    deal_name: string
    prospect_name: string | null
    prospect_title: string | null
    prospect_company: string | null
    known_objections: string[]
    stage: string | null
    simulation_id: string | null
    outcome: 'won' | 'lost' | 'no_decision' | 'still_active' | null
    created_at: string
}

export function useDealSessions(userId?: string) {
    return useQuery<DealSession[]>({
        queryKey: ['deal-sessions', userId],
        queryFn: async () => {
            if (!userId) return []
            const { data, error } = await supabase
                .from('deal_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50)
            if (error) throw error
            return (data || []) as DealSession[]
        },
        enabled: !!userId,
        staleTime: 60 * 1000,
    })
}

export function useUpdateDealOutcome() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            dealSessionId,
            outcome,
        }: {
            dealSessionId: string
            outcome: 'won' | 'lost' | 'no_decision' | 'still_active'
        }) => {
            const { error } = await supabase
                .from('deal_sessions')
                .update({ outcome })
                .eq('id', dealSessionId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deal-sessions'] })
        },
    })
}

export function useGenerateDealPersona() {
    return useMutation({
        mutationFn: async (params: {
            prospect_name: string
            prospect_title?: string
            prospect_company: string
            known_objections?: string[]
            stage?: string
            deal_name?: string
        }) => {
            const { data: { session } } = await supabase.auth.getSession()
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

            try {
                const res = await fetch(`${supabaseUrl}/functions/v1/generate-deal-persona`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify(params),
                    signal: controller.signal,
                })
                clearTimeout(timeoutId)
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || 'Failed to generate persona')
                }
                return res.json() as Promise<{
                    persona_prompt: string
                    suggested_focus: string
                    deal_session_id: string | null
                }>
            } catch (err: any) {
                clearTimeout(timeoutId)
                if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.')
                throw err
            }
        },
    })
}
