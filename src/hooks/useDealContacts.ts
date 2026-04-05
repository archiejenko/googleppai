/**
 * useDealContacts — R3
 * Relationship depth map per deal.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'

export type ContactRole = 'Champion' | 'Influencer' | 'Economic_Buyer' | 'Blocker' | 'Unknown'
export type ContactSeniority = 'C-Suite' | 'VP' | 'Director' | 'Manager' | 'IC' | 'Unknown'

export interface DealContact {
  id: string
  org_id: string
  deal_id: string
  contact_name: string
  contact_role: ContactRole
  contact_seniority: ContactSeniority
  last_contacted_at: string | null
  engagement_count: number
  response_time_hours: number | null
  created_at: string
}

export interface NewContact {
  contact_name: string
  contact_role: ContactRole
  contact_seniority: ContactSeniority
}

/** Days since last contact */
export function daysSinceContact(lastContactedAt: string | null): number | null {
  if (!lastContactedAt) return null
  return (Date.now() - new Date(lastContactedAt).getTime()) / 86_400_000
}

/** Colour for node based on last contacted */
export function contactNodeColour(lastContactedAt: string | null): string {
  const days = daysSinceContact(lastContactedAt)
  if (days === null) return '#FF6B6B'     // never contacted
  if (days < 7)  return '#10B981'         // green: < 7 days
  if (days <= 21) return '#F59E0B'        // amber: 7–21 days
  return '#FF6B6B'                        // coral: > 21 days
}

/** Node radius proportional to engagement_count (20–40px) */
export function contactNodeRadius(engagementCount: number): number {
  return Math.min(40, Math.max(20, 20 + engagementCount * 2))
}

export function useDealContacts(dealId: string | undefined) {
  return useQuery({
    queryKey: ['deal-contacts', dealId],
    queryFn: async () => {
      if (!dealId) return []
      const { data, error } = await supabase
        .from('deal_contacts')
        .select('*')
        .eq('deal_id', dealId)
        .order('engagement_count', { ascending: false })
      if (error) throw error
      return (data ?? []) as DealContact[]
    },
    enabled: !!dealId,
  })
}

export function useAddContact(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contact: NewContact) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single()
      const { error } = await supabase.from('deal_contacts').insert({
        deal_id: dealId,
        org_id: profile?.org_id,
        ...contact,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal-contacts', dealId] }),
  })
}
