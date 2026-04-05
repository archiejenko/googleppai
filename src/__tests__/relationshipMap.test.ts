/**
 * R3: Relationship Depth Map — smoke tests
 * 1. contactNodeColour: green when < 7 days ago
 * 2. contactNodeColour: amber when 7–21 days ago
 * 3. contactNodeColour: coral when > 21 days ago
 * 4. contactNodeColour: coral when never contacted (null)
 * 5. contactNodeRadius: min 20px when engagement_count = 0
 * 6. contactNodeRadius: max 40px clamp when engagement_count is very high
 */

import { describe, it, expect } from 'vitest'
import { contactNodeColour, contactNodeRadius, daysSinceContact } from '../hooks/useDealContacts'

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

describe('contactNodeColour', () => {
  it('returns green when last contacted < 7 days ago', () => {
    expect(contactNodeColour(daysAgo(3))).toBe('#10B981')
    expect(contactNodeColour(daysAgo(6))).toBe('#10B981')
  })

  it('returns amber when last contacted 7–21 days ago', () => {
    expect(contactNodeColour(daysAgo(7))).toBe('#F59E0B')
    expect(contactNodeColour(daysAgo(14))).toBe('#F59E0B')
    expect(contactNodeColour(daysAgo(21))).toBe('#F59E0B')
  })

  it('returns coral when last contacted > 21 days ago', () => {
    expect(contactNodeColour(daysAgo(22))).toBe('#FF6B6B')
    expect(contactNodeColour(daysAgo(60))).toBe('#FF6B6B')
  })

  it('returns coral when never contacted (null)', () => {
    expect(contactNodeColour(null)).toBe('#FF6B6B')
  })
})

describe('contactNodeRadius', () => {
  it('returns 20 (min) when engagement_count is 0', () => {
    expect(contactNodeRadius(0)).toBe(20)
  })

  it('clamps at 40 (max) when engagement_count is very high', () => {
    expect(contactNodeRadius(100)).toBe(40)
    expect(contactNodeRadius(999)).toBe(40)
  })

  it('scales linearly between 20 and 40', () => {
    // 20 + 5 * 2 = 30
    expect(contactNodeRadius(5)).toBe(30)
  })
})

describe('daysSinceContact', () => {
  it('returns null for null input', () => {
    expect(daysSinceContact(null)).toBeNull()
  })

  it('returns approximately correct days', () => {
    const result = daysSinceContact(daysAgo(10))
    expect(result).toBeGreaterThanOrEqual(9.9)
    expect(result).toBeLessThan(10.1)
  })
})
