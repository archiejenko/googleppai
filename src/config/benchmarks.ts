/**
 * OAST Skill Benchmarks — top-quartile B2B SaaS rep scores.
 *
 * These are static constants, not DB-stored values. Update here when benchmarks
 * are recalibrated. Each skill maps to a canonical key used throughout the
 * analytics stack (hooks, components, correlation engine, future skill_scores table).
 *
 * Data sources per skill (current → future):
 *   discovery_questioning   : pitches.analysis.meddicScores.identifyPain (proxy)
 *                             → pitch-api direct score when prompt is updated
 *   objection_handling      : no current data source
 *                             → pitch-api direct score when prompt is updated
 *   value_articulation      : pitches.clarity_score (proxy)
 *                             → pitch-api direct score when prompt is updated
 *   closing_commitment      : pitches.analysis.meddicScores.decisionProcess (proxy)
 *                             → pitch-api direct score when prompt is updated
 *   active_listening        : pitches.confidence_score (proxy)
 *                             → pitch-api direct score when prompt is updated
 *   meddic_qualification    : avg of all 6 pitches.analysis.meddicScores.* (direct)
 *   champion_building       : pitches.analysis.meddicScores.champion (direct)
 */

export type SkillKey =
  | 'discovery_questioning'
  | 'objection_handling'
  | 'value_articulation'
  | 'closing_commitment'
  | 'active_listening'
  | 'meddic_qualification'
  | 'champion_building'

export type DataQuality = 'direct' | 'estimated' | 'none'

export interface SkillMeta {
  key: SkillKey
  label: string
  benchmark: number          // top-quartile B2B SaaS score (0–100)
  dataQuality: DataQuality   // reflects current scoring pipeline capability
  description: string
}

export const SKILL_BENCHMARKS: SkillMeta[] = [
  {
    key: 'discovery_questioning',
    label: 'Discovery & Questioning',
    benchmark: 70,
    dataQuality: 'estimated',
    description: 'Depth of pain discovery and quality of open/implication questions asked.',
  },
  {
    key: 'objection_handling',
    label: 'Objection Handling',
    benchmark: 68,
    dataQuality: 'none',
    description: 'Use of the AER framework (Acknowledge → Explore → Respond) when objections arise.',
  },
  {
    key: 'value_articulation',
    label: 'Value Articulation',
    benchmark: 72,
    dataQuality: 'estimated',
    description: 'Clarity and specificity when connecting product capability to prospect business outcomes.',
  },
  {
    key: 'closing_commitment',
    label: 'Closing & Commitment',
    benchmark: 65,
    dataQuality: 'estimated',
    description: 'Ability to advance the deal: next steps confirmed, timelines set, commitments secured.',
  },
  {
    key: 'active_listening',
    label: 'Active Listening',
    benchmark: 70,
    dataQuality: 'estimated',
    description: 'Demonstrated responsiveness to prospect signals; reflects and builds on what is heard.',
  },
  {
    key: 'meddic_qualification',
    label: 'MEDDIC Qualification',
    benchmark: 75,
    dataQuality: 'direct',
    description: 'Completion and quality of MEDDIC framework elements across the training scenario.',
  },
  {
    key: 'champion_building',
    label: 'Champion Building',
    benchmark: 62,
    dataQuality: 'direct',
    description: 'Identification and activation of an internal champion who advocates for the deal.',
  },
]

// ── Talk-to-Listen Ratio Benchmarks (L2) ─────────────────────────────────────

export type CallStage = 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'close'

export interface TalkRatioBenchmark {
  /** Maximum rep talk percentage considered "within benchmark" for this stage */
  rep_max: number
}

/**
 * Stage-aware rep talk ratio benchmarks.
 * Same ratio means different things at different stages — discovery requires
 * much more prospect air-time than a demo.
 */
export const TALK_RATIO_BENCHMARKS: Record<CallStage, TalkRatioBenchmark> = {
  discovery:   { rep_max: 45 },
  demo:        { rep_max: 65 },
  proposal:    { rep_max: 55 },
  negotiation: { rep_max: 50 },
  close:       { rep_max: 40 },
}

export const CALL_STAGE_LABELS: Record<CallStage, string> = {
  discovery:   'Discovery',
  demo:        'Demo',
  proposal:    'Proposal',
  negotiation: 'Negotiation',
  close:       'Close',
}

export const ALL_CALL_STAGES: CallStage[] = [
  'discovery', 'demo', 'proposal', 'negotiation', 'close',
]

/** Returns true if rep_talk_pct is within benchmark for the given stage */
export function isWithinTalkBenchmark(
  repTalkPct: number,
  stage: CallStage,
): boolean {
  return repTalkPct <= TALK_RATIO_BENCHMARKS[stage].rep_max
}

/** Quick lookup by key */
export const BENCHMARK_BY_KEY: Record<SkillKey, SkillMeta> = Object.fromEntries(
  SKILL_BENCHMARKS.map(s => [s.key, s])
) as Record<SkillKey, SkillMeta>

// ── X1: Transfer Index — Skill → Snapshot Dimension Mapping ──────────────────

/**
 * Maps each skill key to the closest column in rep_correlation_snapshots
 * and the direction for computing improvement.
 *
 * direction = 'gap'   → improvement = pre_value - post_value  (lower gap = better)
 * direction = 'score' → improvement = post_value - pre_value  (higher score = better)
 */
export type SnapshotColumn =
  | 'discovery_gap'
  | 'engagement_gap'
  | 'objection_handling_gap'
  | 'transfer_gap_overall'
  | 'live_avg_overall'

export interface DimensionMapping {
  column: SnapshotColumn
  direction: 'gap' | 'score'
}

export const SKILL_TO_SNAPSHOT_DIMENSION: Record<SkillKey, DimensionMapping> = {
  discovery_questioning: { column: 'discovery_gap',         direction: 'gap'   },
  objection_handling:    { column: 'objection_handling_gap', direction: 'gap'   },
  value_articulation:    { column: 'engagement_gap',         direction: 'gap'   },
  closing_commitment:    { column: 'transfer_gap_overall',   direction: 'gap'   },
  active_listening:      { column: 'engagement_gap',         direction: 'gap'   },
  meddic_qualification:  { column: 'live_avg_overall',       direction: 'score' },
  champion_building:     { column: 'discovery_gap',         direction: 'gap'   },
}

export const TRANSFER_INDEX_BANDS = {
  high:     { min: 10,         label: 'High',     color: '#10B981' },
  medium:   { min: 3,          label: 'Medium',   color: '#F59E0B' },
  low:      { min: 0,          label: 'Low',      color: '#6366F1' },
  negative: { min: -Infinity,  label: 'Negative', color: '#FF6B6B' },
} as const

export type TransferIndexBand = 'high' | 'medium' | 'low' | 'negative'

export function getTransferIndexBand(score: number): TransferIndexBand {
  if (score >= 10) return 'high'
  if (score >= 3)  return 'medium'
  if (score >= 0)  return 'low'
  return 'negative'
}

// ── X2: Playbook Config ───────────────────────────────────────────────────────

/** When true, top performer names are anonymised in PlaybookPanel. */
export const ANONYMISE_TOP_PERFORMERS = false
