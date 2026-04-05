/**
 * OAST Buying Signal Configuration — L6
 *
 * Canonical list of buying signal types and exact-match phrases.
 * Single source of truth used by:
 *   - call-intelligence-scorer Edge Function (exact phrase detection)
 *   - UI label renderers (type → human label)
 *   - Hook aggregation logic
 *
 * GPT-4o mini handles non-exact-match classification in the Edge Function,
 * but always maps back to one of these signal_type values.
 */

export type SignalType =
  | 'timeline'
  | 'onboarding'
  | 'proposal'
  | 'stakeholder'
  | 'contract'
  | 'pricing'
  | 'other'

export const ALL_SIGNAL_TYPES: SignalType[] = [
  'timeline', 'onboarding', 'proposal', 'stakeholder', 'contract', 'pricing', 'other',
]

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  timeline:    'Timeline',
  onboarding:  'Onboarding',
  proposal:    'Proposal',
  stakeholder: 'Stakeholder',
  contract:    'Contract',
  pricing:     'Pricing',
  other:       'Other',
}

/**
 * Exact-match phrase list per signal_type.
 * All phrases are lowercased — match against lowercased prospect speech.
 */
export const BUYING_SIGNAL_PHRASES: Record<SignalType, string[]> = {
  timeline: [
    'when we implement',
    'when we get started',
    'when could we start',
    'how long does it take',
    'how soon can we',
    'what is the timeline',
    'when can we go live',
    'when would this be ready',
    'start date',
    'go live',
  ],
  onboarding: [
    'onboarding',
    'getting started',
    'implementation process',
    'set up process',
    'how do we get set up',
    'what does onboarding look like',
    'training process',
    'how do we train',
  ],
  proposal: [
    'send a proposal',
    'send over a proposal',
    'can you send me',
    "what's the next step",
    'next step',
    'what are the next steps',
    'move forward',
    'let us move forward',
    "let's do it",
    'sign up',
    'ready to proceed',
  ],
  stakeholder: [
    'need to involve',
    'need to bring in',
    'involve my team',
    'get my manager',
    'loop in',
    'include our',
    'my cto',
    'my cfo',
    'my ceo',
    'my vp',
    'my director',
    'get sign-off',
    'get sign off',
    'need buy-in',
    'need buy in',
  ],
  contract: [
    'contract terms',
    'terms and conditions',
    'legal review',
    'legal team',
    'review the contract',
    'sign the contract',
    'agreement',
    'service level',
    'sla',
    'data processing',
    'gdpr',
  ],
  pricing: [
    'payment terms',
    'annual plan',
    'monthly plan',
    'discount',
    'budget approved',
    'budget available',
    'price per',
    'cost per',
    'total cost',
    'what does it cost',
    'how much does',
    'can we negotiate',
    'can you do better',
  ],
  other: [],
}

/**
 * Detect buying signal types from prospect text using exact phrase matching.
 * Returns an array of matched { signal_type, matched_phrase } pairs.
 * Multiple signal types can match a single utterance.
 */
export function detectExactSignals(
  prospectText: string,
): { signal_type: SignalType; matched_phrase: string }[] {
  const lower   = prospectText.toLowerCase()
  const matches: { signal_type: SignalType; matched_phrase: string }[] = []

  for (const type of ALL_SIGNAL_TYPES) {
    if (type === 'other') continue
    for (const phrase of BUYING_SIGNAL_PHRASES[type]) {
      if (lower.includes(phrase)) {
        matches.push({ signal_type: type, matched_phrase: phrase })
        break // one match per type per utterance
      }
    }
  }

  return matches
}
