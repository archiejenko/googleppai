import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TriggerType = 'skill_decay' | 'live_score_drop' | 'gap_widening' | 'low_commitment_rate' | 'deal_risk'
export type TriggerSeverity = 'critical' | 'warning'

export interface CoachingTrigger {
  id:                  string
  orgId:               string
  repId:               string
  repName:             string
  managerId:           string | null
  triggerType:         TriggerType
  skillName:           string | null
  severity:            TriggerSeverity
  triggerData:         Record<string, unknown>
  recommendedModuleId: string | null
  createdAt:           string
  resolvedAt:          string | null
  snoozedUntil:        string | null
  /** True if snoozed and snooze has not expired. */
  isSnoozed:           boolean
}

// ── Human-readable labels ─────────────────────────────────────────────────────

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  skill_decay:         'Skill Decay',
  live_score_drop:     'Live Score Drop',
  gap_widening:        'Gap Widening',
  low_commitment_rate: 'Low Commitment Rate',
  deal_risk:           'Deal Risk',
}

export const SKILL_LABELS: Record<string, string> = {
  meddic_qualification:  'MEDDIC Qualification',
  champion_building:     'Champion Building',
  discovery_questioning: 'Discovery & Questioning',
  value_articulation:    'Value Articulation',
  active_listening:      'Active Listening',
  closing_commitment:    'Closing & Commitment',
  objection_handling:    'Objection Handling',
}

// ── Row shape from Supabase ───────────────────────────────────────────────────

interface TriggerRow {
  id:                    string
  org_id:                string
  rep_id:                string
  manager_id:            string | null
  trigger_type:          TriggerType
  skill_name:            string | null
  severity:              TriggerSeverity
  trigger_data:          Record<string, unknown>
  recommended_module_id: string | null
  created_at:            string
  resolved_at:           string | null
  snoozed_until:         string | null
  profiles:              { name: string | null; email: string } | null
}

function rowToTrigger(row: TriggerRow): CoachingTrigger {
  const now = new Date().toISOString()
  const isSnoozed = row.snoozed_until !== null && row.snoozed_until > now

  return {
    id:                  row.id,
    orgId:               row.org_id,
    repId:               row.rep_id,
    repName:             row.profiles?.name ?? row.profiles?.email?.split('@')[0] ?? 'Unknown',
    managerId:           row.manager_id,
    triggerType:         row.trigger_type,
    skillName:           row.skill_name,
    severity:            row.severity,
    triggerData:         row.trigger_data ?? {},
    recommendedModuleId: row.recommended_module_id,
    createdAt:           row.created_at,
    resolvedAt:          row.resolved_at,
    snoozedUntil:        row.snoozed_until,
    isSnoozed,
  }
}

const SEVERITY_ORDER: Record<TriggerSeverity, number> = { critical: 0, warning: 1 }

// ── Manager coaching queue ────────────────────────────────────────────────────

async function fetchManagerTriggers(): Promise<CoachingTrigger[]> {


  // RLS scopes to the manager's team automatically.
  // Fetch unresolved triggers — filter active snoozes client-side so we can still
  // show snoozed triggers differently in the UI if needed.
  const { data, error } = await supabase
    .from('coaching_triggers')
    .select(`
      id, org_id, rep_id, manager_id, trigger_type, skill_name, severity,
      trigger_data, recommended_module_id, created_at, resolved_at, snoozed_until,
      profiles!coaching_triggers_rep_id_fkey(name, email)
    `)
    .is('resolved_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return ((data ?? []) as unknown as TriggerRow[])
    .map(rowToTrigger)
    .filter(t => !t.isSnoozed)                        // hide snoozed from active queue
    .sort((a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      || a.createdAt.localeCompare(b.createdAt)        // oldest first within same severity
    )
}

/**
 * Manager coaching queue: all unresolved, non-snoozed triggers for the team,
 * sorted by severity (critical first) then created_at (oldest first).
 */
export function useCoachingTriggers() {
  return useQuery<CoachingTrigger[]>({
    queryKey: ['coaching-triggers'],
    staleTime: 60_000,   // shorter stale time — managers act on this
    queryFn:  fetchManagerTriggers,
  })
}

// ── Rep nudge (rep's own highest-severity trigger) ────────────────────────────

async function fetchRepNudge(): Promise<CoachingTrigger | null> {


  const { data, error } = await supabase
    .from('coaching_triggers')
    .select(`
      id, org_id, rep_id, manager_id, trigger_type, skill_name, severity,
      trigger_data, recommended_module_id, created_at, resolved_at, snoozed_until,
      profiles!coaching_triggers_rep_id_fkey(name, email)
    `)
    .is('resolved_at', null)
    .order('severity', { ascending: true })   // critical < warning alphabetically — use manual sort below
    .order('created_at', { ascending: false }) // most recent first as tiebreaker
    .limit(10)                                  // fetch a few to allow client-side sort

  if (error) throw error

  const triggers = ((data ?? []) as unknown as TriggerRow[])
    .map(rowToTrigger)
    .filter(t => !t.isSnoozed)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  return triggers[0] ?? null
}

/** Rep's highest-severity unresolved trigger for the nudge banner. */
export function useRepNudge() {
  return useQuery<CoachingTrigger | null>({
    queryKey: ['rep-nudge'],
    staleTime: 300_000,
    queryFn:  fetchRepNudge,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Sets resolved_at = now() on a trigger. */
export function useResolveTrigger() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (triggerId: string) => {
      const { error } = await supabase
        .from('coaching_triggers')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', triggerId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coaching-triggers'] })
      qc.invalidateQueries({ queryKey: ['rep-nudge'] })
    },
  })
}

// ── X4: Pure filter helpers (exported for tests) ─────────────────────────────

/** TriggerType groups for the Coaching Queue filter bar */
export type TriggerGroup = 'all' | 'training' | 'live_call' | 'deal_risk' | 'cross_layer'

const TRAINING_TYPES: TriggerType[]   = ['skill_decay', 'gap_widening']
const LIVE_CALL_TYPES: TriggerType[]  = ['low_commitment_rate']
const DEAL_RISK_TYPES: TriggerType[]  = ['deal_risk']

/** Returns true if trigger is a cross-layer trigger (loss reason → skill gap) */
export function isCrossLayerTrigger(t: CoachingTrigger): boolean {
  return t.triggerType === 'live_score_drop' && t.triggerData?.cross_layer === true
}

/**
 * Filters triggers by group.
 * Cross-layer triggers are live_score_drop with cross_layer: true in trigger_data.
 */
export function filterByType(triggers: CoachingTrigger[], group: TriggerGroup): CoachingTrigger[] {
  if (group === 'all') return triggers
  if (group === 'cross_layer') return triggers.filter(isCrossLayerTrigger)
  if (group === 'training')    return triggers.filter(t => TRAINING_TYPES.includes(t.triggerType))
  if (group === 'live_call')   return triggers.filter(t => LIVE_CALL_TYPES.includes(t.triggerType))
  if (group === 'deal_risk')   return triggers.filter(t => DEAL_RISK_TYPES.includes(t.triggerType))
  // live_score_drop (non-cross-layer) falls under training
  return triggers
}

/** Convenience hook: deal_risk triggers only */
export function useDealRiskTriggers() {
  const { data, ...rest } = useCoachingTriggers()
  return { data: filterByType(data ?? [], 'deal_risk'), ...rest }
}

/** Convenience hook: cross-layer triggers only */
export function useCrossLayerTriggers() {
  const { data, ...rest } = useCoachingTriggers()
  return { data: filterByType(data ?? [], 'cross_layer'), ...rest }
}

/** Sets snoozed_until = 7 days from now. */
export function useSnoozeTrigger() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (triggerId: string) => {
      const snoozedUntil = new Date(Date.now() + 7 * 86_400_000).toISOString()
      const { error } = await supabase
        .from('coaching_triggers')
        .update({ snoozed_until: snoozedUntil })
        .eq('id', triggerId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coaching-triggers'] })
    },
  })
}
