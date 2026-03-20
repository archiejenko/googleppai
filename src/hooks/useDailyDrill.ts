import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export interface DailyDrill {
    id: string
    user_id: string
    scenario_type: string
    target_skill: string
    scenario_text?: string
    score: number | null
    completed_at: string | null
    created_at: string
}

export interface DailyDrillResponse {
    already_completed: boolean
    drill: DailyDrill
    scenario?: string
    time_limit_seconds?: number
    target_skill?: string
    drill_id?: string
    current_streak: number
    longest_streak: number
}

async function callDailyDrillFunction(action: 'generate' | 'complete', payload?: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

    const res = await fetch(`${supabaseUrl}/functions/v1/generate-daily-drill`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, ...payload }),
    })

    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to call daily drill function')
    }

    return res.json()
}

export function useDailyDrill(userId?: string) {
    return useQuery<DailyDrillResponse | null>({
        queryKey: ['daily-drill', userId],
        queryFn: async () => {
            if (!userId) return null
            return callDailyDrillFunction('generate')
        },
        enabled: !!userId,
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
    })
}

export function useCompleteDrill() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ drillId, score }: { drillId: string; score: number }) => {
            return callDailyDrillFunction('complete', { drill_id: drillId, score })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['daily-drill'] })
        },
    })
}
