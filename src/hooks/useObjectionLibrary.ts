import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useRef } from 'react'
import { supabase } from '../utils/supabase'

export interface ObjectionEntry {
    id: string
    user_id: string
    team_id: string | null
    objection_text: string
    handling_response: string | null
    score: number | null
    source: 'simulation' | 'real_call' | 'manual'
    tags: string[]
    pinned: boolean
    created_at: string
}

async function getEmbedding(text: string): Promise<number[]> {
    const { data: { session } } = await supabase.auth.getSession()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

    const res = await fetch(`${supabaseUrl}/functions/v1/embed-query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ text }),
    })
    if (!res.ok) throw new Error('Embedding failed')
    const { embedding } = await res.json()
    return embedding
}

export function useObjectionLibrary(userId?: string, teamId?: string | null, viewMode: 'personal' | 'team' = 'personal') {
    const [searchQuery, setSearchQuery] = useState('')
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [debouncedQuery, setDebouncedQuery] = useState('')

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value)
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => setDebouncedQuery(value), 300)
    }, [])

    const query = useQuery<ObjectionEntry[]>({
        queryKey: ['objections', userId, debouncedQuery, viewMode, teamId],
        queryFn: async () => {
            if (!userId) return []

            if (debouncedQuery.trim().length >= 3) {
                // Semantic search via embedding + RPC
                const embedding = await getEmbedding(debouncedQuery)

                const { data, error } = await supabase.rpc('search_objections', {
                    query_embedding: embedding,
                    match_user_id: userId,
                    match_team_id: viewMode === 'team' ? (teamId || null) : null,
                    match_count: 30,
                })
                if (error) throw error
                return (data || []) as ObjectionEntry[]
            }

            // Default: fetch without semantic search
            let q = supabase
                .from('objection_entries')
                .select('*')
                .order('pinned', { ascending: false })
                .order('created_at', { ascending: false })

            if (viewMode === 'personal') {
                q = q.eq('user_id', userId)
            } else if (viewMode === 'team' && teamId) {
                q = q.or(`user_id.eq.${userId},team_id.eq.${teamId}`)
            } else {
                q = q.eq('user_id', userId)
            }

            const { data, error } = await q
            if (error) throw error
            return (data || []) as ObjectionEntry[]
        },
        enabled: !!userId,
        staleTime: 60 * 1000,
    })

    return { ...query, searchQuery, handleSearchChange }
}

export function useAddObjection() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (entry: {
            objection_text: string
            handling_response?: string
            score?: number
            source: 'simulation' | 'real_call' | 'manual'
            tags?: string[]
        }) => {
            const { data: { session } } = await supabase.auth.getSession()
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

            const res = await fetch(`${supabaseUrl}/functions/v1/upsert-objection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify(entry),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to save objection')
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objections'] })
        },
    })
}

export function usePinObjection() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
            const { error } = await supabase
                .from('objection_entries')
                .update({ pinned })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['objections'] })
        },
    })
}
