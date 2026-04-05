/**
 * useTransferIndex — X1
 *
 * For each training scenario (grouped by training_sessions.scenario),
 * compute the average improvement in the targeted snapshot dimension
 * within the 14-day windows before and after session completion.
 *
 * Transfer Index = avg(post_score - pre_score) across reps who completed it.
 * Null when fewer than 3 reps have data (insufficient sample).
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import {
  SKILL_TO_SNAPSHOT_DIMENSION,
  getTransferIndexBand,
  type SkillKey,
  type TransferIndexBand,
  type SnapshotColumn,
} from '../config/benchmarks'

export interface ScenarioTransferIndex {
  scenario_id: string        // scenario text value used as ID
  scenario_name: string
  skill_target: SkillKey
  rep_count: number
  transfer_index_score: number | null   // null if < 3 reps
  transfer_index_band: TransferIndexBand | null
  pre_avg: number | null
  post_avg: number | null
}

interface SnapshotRow {
  rep_id: string
  snapshot_date: string
  [key: string]: unknown
}

interface SessionRow {
  id: string
  user_id: string
  scenario: string
  created_at: string
}

// ── Pure functions (exported for tests) ──────────────────────────────────────

/**
 * Maps a scenario name (training_sessions.scenario) to the closest SkillKey.
 * Falls back to 'discovery_questioning' when no match.
 */
export function scenarioToSkillKey(scenario: string): SkillKey {
  const s = scenario.toLowerCase()
  if (s.includes('objection'))              return 'objection_handling'
  if (s.includes('value') || s.includes('articul') || s.includes('pitch')) return 'value_articulation'
  if (s.includes('clos') || s.includes('commit') || s.includes('decision')) return 'closing_commitment'
  if (s.includes('listen') || s.includes('active'))                        return 'active_listening'
  if (s.includes('meddic') || s.includes('qualif'))                        return 'meddic_qualification'
  if (s.includes('champion') || s.includes('stakeholder'))                 return 'champion_building'
  return 'discovery_questioning'
}

/**
 * Compute the improvement delta for a single rep in a single scenario.
 * Returns null if there are no snapshots in either window.
 *
 * direction='gap'   → improvement = pre_value - post_value  (gap shrinking)
 * direction='score' → improvement = post_value - pre_value  (score rising)
 */
export function computeRepDelta(
  snapshots: SnapshotRow[],
  completionDate: string,
  column: SnapshotColumn,
  direction: 'gap' | 'score',
): number | null {
  const completion = new Date(completionDate).getTime()
  const window14 = 14 * 24 * 60 * 60 * 1000

  const preSnaps  = snapshots.filter(s => {
    const t = new Date(s.snapshot_date).getTime()
    return t >= completion - window14 && t < completion
  })
  const postSnaps = snapshots.filter(s => {
    const t = new Date(s.snapshot_date).getTime()
    return t > completion && t <= completion + window14
  })

  if (!preSnaps.length || !postSnaps.length) return null

  const avg = (rows: SnapshotRow[]) =>
    rows.reduce((sum, r) => sum + (Number(r[column]) || 0), 0) / rows.length

  const preAvg  = avg(preSnaps)
  const postAvg = avg(postSnaps)

  return direction === 'gap' ? preAvg - postAvg : postAvg - preAvg
}

/**
 * Aggregate per-rep deltas into a Transfer Index for a scenario.
 * Returns null if fewer than 3 reps have valid deltas.
 */
export function computeTransferIndex(deltas: (number | null)[]): number | null {
  const valid = deltas.filter((d): d is number => d !== null)
  if (valid.length < 3) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTransferIndex() {
  return useQuery({
    queryKey: ['transfer-index'],
    queryFn: async (): Promise<ScenarioTransferIndex[]> => {
      // 1. Fetch all completed training sessions
      const { data: sessions, error: sErr } = await supabase
        .from('training_sessions')
        .select('id, user_id, scenario, created_at')
        .eq('completed', true)
        .order('created_at', { ascending: true })
      if (sErr) throw sErr

      const sessionRows = (sessions ?? []) as SessionRow[]
      if (!sessionRows.length) return []

      // Collect unique rep IDs
      const repIds = [...new Set(sessionRows.map(s => s.user_id))]

      // 2. Fetch all snapshot rows for these reps
      const { data: snapshots, error: snErr } = await supabase
        .from('rep_correlation_snapshots')
        .select('rep_id, snapshot_date, discovery_gap, engagement_gap, objection_handling_gap, transfer_gap_overall, live_avg_overall')
        .in('rep_id', repIds)
        .order('snapshot_date', { ascending: true })
      if (snErr) throw snErr

      const snapshotRows = (snapshots ?? []) as SnapshotRow[]

      // Group snapshots by rep
      const snapByRep: Record<string, SnapshotRow[]> = {}
      for (const snap of snapshotRows) {
        const rid = String(snap.rep_id)
        if (!snapByRep[rid]) snapByRep[rid] = []
        snapByRep[rid].push(snap)
      }

      // 3. Group sessions by scenario
      const byScenario: Record<string, SessionRow[]> = {}
      for (const s of sessionRows) {
        if (!byScenario[s.scenario]) byScenario[s.scenario] = []
        byScenario[s.scenario].push(s)
      }

      // 4. Compute Transfer Index per scenario
      const results: ScenarioTransferIndex[] = []

      for (const [scenario, scenarioSessions] of Object.entries(byScenario)) {
        const skillTarget = scenarioToSkillKey(scenario)
        const { column, direction } = SKILL_TO_SNAPSHOT_DIMENSION[skillTarget]

        // Use the latest session per rep (avoid double-counting repeat sessions)
        const latestByRep: Record<string, SessionRow> = {}
        for (const s of scenarioSessions) {
          if (!latestByRep[s.user_id] ||
              new Date(s.created_at) > new Date(latestByRep[s.user_id].created_at)) {
            latestByRep[s.user_id] = s
          }
        }

        const deltas: (number | null)[] = []
        const preAvgs: number[] = []
        const postAvgs: number[] = []

        for (const session of Object.values(latestByRep)) {
          const repSnaps = snapByRep[session.user_id] ?? []
          const delta = computeRepDelta(repSnaps, session.created_at, column, direction)
          deltas.push(delta)

          // Collect pre/post avgs for display
          if (delta !== null) {
            const completion = new Date(session.created_at).getTime()
            const window14 = 14 * 24 * 60 * 60 * 1000
            const pre  = repSnaps.filter(s => {
              const t = new Date(s.snapshot_date).getTime()
              return t >= completion - window14 && t < completion
            })
            const post = repSnaps.filter(s => {
              const t = new Date(s.snapshot_date).getTime()
              return t > completion && t <= completion + window14
            })
            if (pre.length)  preAvgs.push(pre.reduce((sum, r) => sum + (Number(r[column]) || 0), 0) / pre.length)
            if (post.length) postAvgs.push(post.reduce((sum, r) => sum + (Number(r[column]) || 0), 0) / post.length)
          }
        }

        const tiScore = computeTransferIndex(deltas)
        const repCount = Object.keys(latestByRep).length

        results.push({
          scenario_id: scenario,
          scenario_name: scenario.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          skill_target: skillTarget,
          rep_count: repCount,
          transfer_index_score: tiScore,
          transfer_index_band: tiScore !== null ? getTransferIndexBand(tiScore) : null,
          pre_avg: preAvgs.length ? preAvgs.reduce((a, b) => a + b, 0) / preAvgs.length : null,
          post_avg: postAvgs.length ? postAvgs.reduce((a, b) => a + b, 0) / postAvgs.length : null,
        })
      }

      // Sort descending by score (nulls last)
      results.sort((a, b) => {
        if (a.transfer_index_score === null && b.transfer_index_score === null) return 0
        if (a.transfer_index_score === null) return 1
        if (b.transfer_index_score === null) return -1
        return b.transfer_index_score - a.transfer_index_score
      })

      return results
    },
    staleTime: 5 * 60_000,
  })
}
