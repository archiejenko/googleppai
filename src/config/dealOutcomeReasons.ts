/**
 * Deal Outcome Reasons — R11
 */

export const WIN_REASONS = [
  'Strong discovery',
  'Multi-threaded engagement',
  'ROI clearly articulated',
  'Champion identified early',
  'Fast follow-up cadence',
  'Competitive differentiation',
  'Full MEDDIC completion',
  'Executive sponsor engaged',
  'Mutual action plan',
  'Proposal matched decision criteria',
] as const

export const LOSS_REASONS = [
  'Price or competitor',
  'No champion identified',
  'Slow sales cycle',
  'Single-threaded engagement',
  'Budget not confirmed',
  'Late multi-threading',
  'No mutual action plan',
  'Feature gap',
  'Trust deficit',
  'Internal priority change',
] as const

export type WinReason = typeof WIN_REASONS[number]
export type LossReason = typeof LOSS_REASONS[number]
export type OutcomeReason = WinReason | LossReason

export const WIN_REASON_LABELS: Record<WinReason, string> = Object.fromEntries(
  WIN_REASONS.map((r) => [r, r])
) as Record<WinReason, string>

export const LOSS_REASON_LABELS: Record<LossReason, string> = Object.fromEntries(
  LOSS_REASONS.map((r) => [r, r])
) as Record<LossReason, string>

/** Training skill correlation for loss reasons */
export const LOSS_REASON_TO_SKILL: Partial<Record<LossReason, string>> = {
  'No champion identified':     'Champion Building',
  'Single-threaded engagement': 'Stakeholder Mapping',
  'Budget not confirmed':       'Discovery',
  'No mutual action plan':      'Closing Technique',
  'Feature gap':                'Product Knowledge',
  'Trust deficit':              'Rapport Building',
  'Late multi-threading':       'Account Strategy',
  'Price or competitor':        'Value Articulation',
  'Slow sales cycle':           'Pipeline Management',
  'Internal priority change':   'Executive Alignment',
}

/**
 * Maps loss reasons to SkillKey for cross-layer coaching triggers (X4).
 * Used by deal-risk-engine to link revenue losses to training skill gaps.
 */
export const LOSS_REASON_TO_SKILL_KEY: Partial<Record<LossReason, string>> = {
  'No champion identified':     'champion_building',
  'Single-threaded engagement': 'champion_building',
  'Budget not confirmed':       'discovery_questioning',
  'No mutual action plan':      'closing_commitment',
  'Feature gap':                'value_articulation',
  'Trust deficit':              'active_listening',
  'Late multi-threading':       'champion_building',
  'Price or competitor':        'value_articulation',
  'Slow sales cycle':           'closing_commitment',
  'Internal priority change':   'discovery_questioning',
}

/** Recommended training module label per skill key */
export const SKILL_KEY_TO_MODULE: Record<string, string> = {
  champion_building:     'Champion Building Masterclass',
  discovery_questioning: 'Deep Discovery Techniques',
  closing_commitment:    'Closing & Next Steps Workshop',
  value_articulation:    'Value Articulation Playbook',
  active_listening:      'Active Listening & Rapport',
  objection_handling:    'Objection Handling — AER Framework',
  meddic_qualification:  'Full MEDDIC Qualification',
}

/** Deal size band */
export function dealSizeBand(valueGbp: number): string {
  if (valueGbp < 50000)  return '< £50K'
  if (valueGbp <= 100000) return '£50–100K'
  return '£100K+'
}
