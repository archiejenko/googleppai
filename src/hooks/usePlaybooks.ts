/**
 * usePlaybooks — X2
 *
 * Hooks for reading, assigning, and displaying AI-generated coaching playbooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'

export interface CoachingPlaybook {
  id: string
  org_id: string
  generated_for_rep_id: string | null
  role: string | null
  narrative: string
  stats_snapshot: {
    top: {
      transfer_gap: number | null
      talk_ratio: number | null
      next_step_rate: number | null
      filler_rate: number | null
      pacing_score: number | null
      implication_rate: number | null
    }
    team_avg: {
      transfer_gap_overall: number | null
      talk_ratio: number | null
      next_step_rate: number | null
      filler_rate: number | null
      pacing_score: number | null
      implication_rate: number | null
    }
  }
  generated_at: string
  assigned_to_rep_ids: string[]
}

/** All coaching playbooks for the org (manager/admin view) */
export function usePlaybooks() {
  return useQuery({
    queryKey: ['coaching-playbooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_playbooks')
        .select('*')
        .order('generated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CoachingPlaybook[]
    },
    staleTime: 5 * 60_000,
  })
}

/** Add a rep to a playbook's assigned_to_rep_ids array */
export function useAssignPlaybook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ playbookId, repId }: { playbookId: string; repId: string }) => {
      // Read current array then append (avoids RPC dependency)
      const { data: existing, error: readErr } = await supabase
        .from('coaching_playbooks')
        .select('assigned_to_rep_ids')
        .eq('id', playbookId)
        .single()
      if (readErr) throw readErr

      const current: string[] = existing?.assigned_to_rep_ids ?? []
      if (current.includes(repId)) return  // already assigned

      const { error } = await supabase
        .from('coaching_playbooks')
        .update({
          assigned_to_rep_ids: [...current, repId],
          updated_at: new Date().toISOString(),
        })
        .eq('id', playbookId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coaching-playbooks'] }),
  })
}

/** Playbook(s) assigned to a specific rep */
export function useRepPlaybook(repId: string | undefined) {
  return useQuery({
    queryKey: ['coaching-playbooks-rep', repId],
    queryFn: async () => {
      if (!repId) return null
      const { data, error } = await supabase
        .from('coaching_playbooks')
        .select('*')
        .contains('assigned_to_rep_ids', [repId])
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as CoachingPlaybook | null
    },
    enabled: !!repId,
    staleTime: 5 * 60_000,
  })
}

/** Returns the playbook assigned to the currently logged-in rep (if any) */
export function useMyPlaybook() {
  const { user } = useAuth()
  return useRepPlaybook(user?.id)
}
