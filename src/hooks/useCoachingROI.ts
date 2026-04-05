import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import type { SkillKey } from '../config/benchmarks';
import { SKILL_BENCHMARKS } from '../config/benchmarks';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Days before/after session_date that count as the pre/post window */
export const ROI_WINDOW_DAYS = 14

/** Minimum data points required in a window for a delta to be non-null */
export const MIN_WINDOW_POINTS = 2

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SkillDelta {
  skill:      SkillKey
  skillLabel: string
  delta:      number | null  // null = insufficient data (< MIN_WINDOW_POINTS in either window)
  preAvg:     number | null
  postAvg:    number | null
}

export interface CoachingSessionWithROI {
  id:          string
  orgId:       string
  managerId:   string
  repId:       string
  repName:     string
  skillFocus:  SkillKey[]
  sessionDate: string        // ISO date string 'YYYY-MM-DD'
  notes:       string | null
  createdAt:   string
  deltas:      SkillDelta[]
}

export interface CoachingROISummary {
  totalSessions:       number
  avgDelta:            number | null  // mean of all non-null deltas; null if none
  skillsWithPositiveROI: number       // count of distinct skills where mean delta > 0
  bestSkill:           SkillKey | null
  bestSkillLabel:      string | null
  bestSkillDelta:      number | null
}

export interface CoachingROIData {
  sessions: CoachingSessionWithROI[]
  summary:  CoachingROISummary
}

export interface LogSessionInput {
  repId:       string
  skillFocus:  SkillKey[]
  sessionDate: string   // 'YYYY-MM-DD'
  notes?:      string
}

// ── Pure helpers (exported for unit testing) ──────────────────────────────────

/**
 * Given a list of {score, recordedAt} observations and a [windowStart, windowEnd)
 * half-open interval (ISO strings), returns the average score or null if fewer
 * than MIN_WINDOW_POINTS observations fall in the window.
 */
export function windowAvg(
  observations: { score: number; recordedAt: string }[],
  windowStart:  string,
  windowEnd:    string,
): number | null {
  const pts = observations.filter(
    o => o.recordedAt >= windowStart && o.recordedAt < windowEnd,
  )
  if (pts.length < MIN_WINDOW_POINTS) return null
  return pts.reduce((s, o) => s + o.score, 0) / pts.length
}

/**
 * Computes per-skill deltas for one coaching session given the rep's full
 * skill score history and the session date string ('YYYY-MM-DD').
 *
 * Pre-window:  [sessionDate - ROI_WINDOW_DAYS, sessionDate)
 * Post-window: [sessionDate,                   sessionDate + ROI_WINDOW_DAYS)
 *
 * Returns a SkillDelta per skill in skillFocus[].
 */
export function computeSessionDeltas(
  skillFocus:    SkillKey[],
  sessionDate:   string,
  observations:  { skill: SkillKey; score: number; recordedAt: string }[],
): SkillDelta[] {
  const sessionMs  = new Date(sessionDate).getTime()
  const preStart   = new Date(sessionMs - ROI_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)
  const postEnd    = new Date(sessionMs + ROI_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)

  return skillFocus.map(skill => {
    const skillLabel = SKILL_BENCHMARKS.find(s => s.key === skill)?.label ?? skill
    const skillObs   = observations
      .filter(o => o.skill === skill)
      .map(o => ({ score: o.score, recordedAt: o.recordedAt }))

    const preAvg  = windowAvg(skillObs, preStart,    sessionDate)
    const postAvg = windowAvg(skillObs, sessionDate,  postEnd)
    const delta   = preAvg !== null && postAvg !== null ? postAvg - preAvg : null

    return { skill, skillLabel, delta, preAvg, postAvg }
  })
}

/**
 * Aggregates per-session deltas into summary stats.
 * - avgDelta: mean of all non-null deltas across every session
 * - skillsWithPositiveROI: distinct skills where their mean delta > 0
 * - bestSkill / bestSkillDelta: skill with highest mean delta (must be positive)
 */
export function computeSummary(sessions: CoachingSessionWithROI[]): CoachingROISummary {
  const totalSessions = sessions.length

  const allDeltas: number[] = sessions
    .flatMap(s => s.deltas)
    .map(d => d.delta)
    .filter((d): d is number => d !== null)

  const avgDelta = allDeltas.length > 0
    ? allDeltas.reduce((a, b) => a + b, 0) / allDeltas.length
    : null

  // Per-skill mean across all sessions
  const skillDeltas = new Map<SkillKey, number[]>()
  for (const session of sessions) {
    for (const d of session.deltas) {
      if (d.delta === null) continue
      if (!skillDeltas.has(d.skill)) skillDeltas.set(d.skill, [])
      skillDeltas.get(d.skill)!.push(d.delta)
    }
  }

  let skillsWithPositiveROI = 0
  let bestSkill:      SkillKey | null = null
  let bestSkillLabel: string | null   = null
  let bestSkillDelta: number | null   = null

  for (const [skill, deltas] of skillDeltas) {
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length
    if (mean > 0) {
      skillsWithPositiveROI++
      if (bestSkillDelta === null || mean > bestSkillDelta) {
        bestSkillDelta = mean
        bestSkill      = skill
        bestSkillLabel = SKILL_BENCHMARKS.find(s => s.key === skill)?.label ?? skill
      }
    }
  }

  return { totalSessions, avgDelta, skillsWithPositiveROI, bestSkill, bestSkillLabel, bestSkillDelta }
}

// ── Row types ─────────────────────────────────────────────────────────────────

interface SessionRow {
  id:           string
  org_id:       string
  manager_id:   string
  rep_id:       string
  skill_focus:  string[]
  session_date: string
  notes:        string | null
  created_at:   string
  profiles:     { name: string | null; email: string } | null
}

interface SkillScoreRow {
  rep_id:      string
  skill_name:  string
  score:       number
  recorded_at: string
}

// ── Fetch function ────────────────────────────────────────────────────────────

async function fetchCoachingROI(days: number): Promise<CoachingROIData> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

  const { data: rawSessions, error: sessErr } = await supabase
    .from('coaching_sessions')
    .select(`
      id, org_id, manager_id, rep_id, skill_focus, session_date, notes, created_at,
      profiles!coaching_sessions_rep_id_fkey(name, email)
    `)
    .gte('session_date', since)
    .order('session_date', { ascending: true })

  if (sessErr) throw sessErr

  const rows = (rawSessions ?? []) as unknown as SessionRow[]
  if (rows.length === 0) {
    return { sessions: [], summary: computeSummary([]) }
  }

  // Derive the broadest date range we need for skill scores
  const sessionDates = rows.map(r => new Date(r.session_date).getTime())
  const minDate = new Date(Math.min(...sessionDates) - ROI_WINDOW_DAYS * 86_400_000).toISOString()
  const maxDate = new Date(Math.max(...sessionDates) + ROI_WINDOW_DAYS * 86_400_000).toISOString()
  const repIds  = [...new Set(rows.map(r => r.rep_id))]

  const { data: rawScores, error: scoresErr } = await supabase
    .from('skill_scores')
    .select('rep_id, skill_name, score, recorded_at')
    .in('rep_id', repIds)
    .gte('recorded_at', minDate)
    .lte('recorded_at', maxDate)

  if (scoresErr) throw scoresErr

  const scoreRows = (rawScores ?? []) as SkillScoreRow[]

  // Build observations lookup: repId → [{skill, score, recordedAt}]
  const obsMap = new Map<string, { skill: SkillKey; score: number; recordedAt: string }[]>()
  for (const s of scoreRows) {
    if (!obsMap.has(s.rep_id)) obsMap.set(s.rep_id, [])
    obsMap.get(s.rep_id)!.push({
      skill:       s.skill_name as SkillKey,
      score:       Number(s.score),
      recordedAt:  s.recorded_at,
    })
  }

  const sessions: CoachingSessionWithROI[] = rows.map(row => {
    const repProfile = row.profiles
    const repName    = repProfile?.name ?? repProfile?.email?.split('@')[0] ?? 'Unknown'
    const skillFocus = (row.skill_focus ?? []) as SkillKey[]
    const obs        = obsMap.get(row.rep_id) ?? []

    return {
      id:          row.id,
      orgId:       row.org_id,
      managerId:   row.manager_id,
      repId:       row.rep_id,
      repName,
      skillFocus,
      sessionDate: row.session_date,
      notes:       row.notes,
      createdAt:   row.created_at,
      deltas:      computeSessionDeltas(skillFocus, row.session_date, obs),
    }
  })

  return { sessions, summary: computeSummary(sessions) }
}

// ── useCoachingROI ────────────────────────────────────────────────────────────

/** Returns coaching sessions with computed per-skill ROI deltas + summary stats. */
export function useCoachingROI(days: number) {
  return useQuery<CoachingROIData>({
    queryKey:  ['coaching-roi', days],
    staleTime: 300_000,
    queryFn:   () => fetchCoachingROI(days),
  })
}

// ── useLogCoachingSession ─────────────────────────────────────────────────────

/** Inserts a new coaching session row. Invalidates all coaching-roi queries. */
export function useLogCoachingSession() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: LogSessionInput) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, team_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single()

      if (!profile) throw new Error('Could not resolve manager profile')

      const { error } = await supabase.from('coaching_sessions').insert({
        org_id:       profile.team_id,
        manager_id:   profile.id,
        rep_id:       input.repId,
        skill_focus:  input.skillFocus,
        session_date: input.sessionDate,
        notes:        input.notes ?? null,
      })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coaching-roi'] })
    },
  })
}
