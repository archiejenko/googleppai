/**
 * Competitors config — R7
 */

export const COMPETITORS = [
  'Gong',
  'Chorus',
  'Salesloft',
  'Outreach',
  'Mindtickle',
  'Allego',
  'Jiminny',
  'Oliv',
] as const

export type Competitor = typeof COMPETITORS[number]

export const COMPETITOR_LABELS: Record<Competitor, string> = {
  Gong:       'Gong',
  Chorus:     'Chorus',
  Salesloft:  'Salesloft',
  Outreach:   'Outreach',
  Mindtickle: 'Mindtickle',
  Allego:     'Allego',
  Jiminny:    'Jiminny',
  Oliv:       'Oliv',
}
