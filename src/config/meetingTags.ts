/**
 * Meeting Intelligence Tags — R6
 */

export const MEETING_TAGS = [
  // Positive
  'MEDDIC_complete',
  'Champion_confirmed',
  'Mutual_plan_set',
  'Strong_rapport',
  'Buying_signal_capitalised',
  'Next_step_confirmed',
  'Good_discovery_depth',
  'Implication_questions_used',
  // Negative
  'Budget_unconfirmed',
  'Weak_close_attempt',
  'No_next_step',
  'Competitor_gap',
  'Single_threaded',
  'Engagement_dipped',
  'No_discovery_questions',
  'Immediate_counter_to_objection',
  'Filler_spike',
  'Monotone_delivery',
  'No_champion_identified',
  'Late_objection_handling',
] as const

export type MeetingTag = typeof MEETING_TAGS[number]

export const TAG_LABELS: Record<MeetingTag, string> = {
  MEDDIC_complete:                'MEDDIC Complete',
  Champion_confirmed:             'Champion Confirmed',
  Mutual_plan_set:                'Mutual Plan Set',
  Strong_rapport:                 'Strong Rapport',
  Buying_signal_capitalised:      'Buying Signal Capitalised',
  Next_step_confirmed:            'Next Step Confirmed',
  Good_discovery_depth:           'Good Discovery Depth',
  Implication_questions_used:     'Implication Questions Used',
  Budget_unconfirmed:             'Budget Unconfirmed',
  Weak_close_attempt:             'Weak Close Attempt',
  No_next_step:                   'No Next Step',
  Competitor_gap:                 'Competitor Gap',
  Single_threaded:                'Single Threaded',
  Engagement_dipped:              'Engagement Dipped',
  No_discovery_questions:         'No Discovery Questions',
  Immediate_counter_to_objection: 'Immediate Counter to Objection',
  Filler_spike:                   'Filler Spike',
  Monotone_delivery:              'Monotone Delivery',
  No_champion_identified:         'No Champion Identified',
  Late_objection_handling:        'Late Objection Handling',
}

export const TAG_SENTIMENT: Record<MeetingTag, 'positive' | 'negative'> = {
  MEDDIC_complete:                'positive',
  Champion_confirmed:             'positive',
  Mutual_plan_set:                'positive',
  Strong_rapport:                 'positive',
  Buying_signal_capitalised:      'positive',
  Next_step_confirmed:            'positive',
  Good_discovery_depth:           'positive',
  Implication_questions_used:     'positive',
  Budget_unconfirmed:             'negative',
  Weak_close_attempt:             'negative',
  No_next_step:                   'negative',
  Competitor_gap:                 'negative',
  Single_threaded:                'negative',
  Engagement_dipped:              'negative',
  No_discovery_questions:         'negative',
  Immediate_counter_to_objection: 'negative',
  Filler_spike:                   'negative',
  Monotone_delivery:              'negative',
  No_champion_identified:         'negative',
  Late_objection_handling:        'negative',
}

/** Positive tags set */
export const POSITIVE_TAGS = new Set(
  MEETING_TAGS.filter((t) => TAG_SENTIMENT[t] === 'positive')
)
