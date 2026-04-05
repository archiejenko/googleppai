/**
 * R7: Competitive Intelligence Tracker — smoke tests
 * 1. COMPETITORS has exactly 8 entries
 * 2. COMPETITOR_BATTLECARDS covers all 8 competitors
 * 3. Each battlecard has 2–3 bullets
 * 4. winRateColour: green > 40%
 * 5. winRateColour: amber 20–40%
 * 6. winRateColour: coral < 20%
 */

import { describe, it, expect } from 'vitest'
import { COMPETITORS } from '../config/competitors'
import { COMPETITOR_BATTLECARDS } from '../config/competitorBattlecards'
import { winRateColour } from '../hooks/useCompetitorMentions'

describe('competitors config', () => {
  it('has exactly 8 competitors', () => {
    expect(COMPETITORS).toHaveLength(8)
  })

  it('battlecards cover all 8 competitors', () => {
    for (const c of COMPETITORS) {
      expect(COMPETITOR_BATTLECARDS[c]).toBeDefined()
    }
  })

  it('each battlecard has 2–3 differentiator bullets', () => {
    for (const c of COMPETITORS) {
      const bullets = COMPETITOR_BATTLECARDS[c]
      expect(bullets.length).toBeGreaterThanOrEqual(2)
      expect(bullets.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('winRateColour', () => {
  it('returns green (#10B981) when win rate > 40%', () => {
    expect(winRateColour(0.41)).toBe('#10B981')
    expect(winRateColour(1.0)).toBe('#10B981')
  })

  it('returns amber (#F59E0B) when win rate 20–40%', () => {
    expect(winRateColour(0.2)).toBe('#F59E0B')
    expect(winRateColour(0.4)).toBe('#F59E0B')
  })

  it('returns coral (#FF6B6B) when win rate < 20%', () => {
    expect(winRateColour(0.0)).toBe('#FF6B6B')
    expect(winRateColour(0.19)).toBe('#FF6B6B')
  })
})
