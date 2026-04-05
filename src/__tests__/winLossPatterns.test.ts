/**
 * R11: Win/Loss Pattern Engine — smoke tests
 * 1. WIN_REASONS has exactly 10 entries
 * 2. LOSS_REASONS has exactly 10 entries
 * 3. dealSizeBand: correct band for < £50K
 * 4. dealSizeBand: correct band for £50–100K
 * 5. dealSizeBand: correct band for > £100K
 * 6. LOSS_REASON_TO_SKILL covers key loss reasons
 */

import { describe, it, expect } from 'vitest'
import { WIN_REASONS, LOSS_REASONS, dealSizeBand, LOSS_REASON_TO_SKILL } from '../config/dealOutcomeReasons'

describe('dealOutcomeReasons config', () => {
  it('WIN_REASONS has exactly 10 entries', () => {
    expect(WIN_REASONS).toHaveLength(10)
  })

  it('LOSS_REASONS has exactly 10 entries', () => {
    expect(LOSS_REASONS).toHaveLength(10)
  })

  it('LOSS_REASON_TO_SKILL covers at least 8 loss reasons', () => {
    const covered = Object.keys(LOSS_REASON_TO_SKILL)
    expect(covered.length).toBeGreaterThanOrEqual(8)
  })

  it('LOSS_REASON_TO_SKILL maps "No champion identified" to "Champion Building"', () => {
    expect(LOSS_REASON_TO_SKILL['No champion identified']).toBe('Champion Building')
  })
})

describe('dealSizeBand', () => {
  it('returns "< £50K" for values below 50000', () => {
    expect(dealSizeBand(0)).toBe('< £50K')
    expect(dealSizeBand(49999)).toBe('< £50K')
  })

  it('returns "£50–100K" for values 50000–100000', () => {
    expect(dealSizeBand(50000)).toBe('£50–100K')
    expect(dealSizeBand(100000)).toBe('£50–100K')
  })

  it('returns "£100K+" for values above 100000', () => {
    expect(dealSizeBand(100001)).toBe('£100K+')
    expect(dealSizeBand(500000)).toBe('£100K+')
  })
})
