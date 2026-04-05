/**
 * R5: Engagement Velocity Tracker — smoke tests
 * 1. computeVelocity: accelerating when responses getting faster (score < 1)
 * 2. computeVelocity: decelerating when responses getting slower (score > 1)
 * 3. computeVelocity: severe magnitude when score > 2.0
 * 4. computeVelocity: moderate magnitude when score 1.5–2.0
 * 5. computeVelocity: mild magnitude when score 1.0–1.5
 * 6. computeVelocity: null score when fewer than 3 touchpoints
 */

import { describe, it, expect } from 'vitest'
import { computeVelocity } from '../hooks/useEngagementVelocity'

describe('computeVelocity', () => {
  it('returns accelerating when avg last 3 < avg first 3', () => {
    // first 3 avg: 48h, last 3 avg: 12h → velocity = 0.25 (accelerating)
    const result = computeVelocity([48, 48, 48, 12, 12, 12])
    expect(result.direction).toBe('accelerating')
    expect(result.score).toBeCloseTo(0.25, 2)
    expect(result.magnitude).toBeNull()
  })

  it('returns decelerating when avg last 3 > avg first 3', () => {
    // first 3 avg: 12h, last 3 avg: 48h → velocity = 4.0 (severe)
    const result = computeVelocity([12, 12, 12, 48, 48, 48])
    expect(result.direction).toBe('decelerating')
    expect(result.score).toBeCloseTo(4.0, 2)
  })

  it('returns severe magnitude when score > 2.0', () => {
    const result = computeVelocity([10, 10, 10, 30, 30, 30])
    expect(result.direction).toBe('decelerating')
    expect(result.score).toBeCloseTo(3.0, 2)
    expect(result.magnitude).toBe('severe')
  })

  it('returns moderate magnitude when score is 1.5–2.0', () => {
    const result = computeVelocity([10, 10, 10, 17, 17, 17])
    expect(result.direction).toBe('decelerating')
    expect(result.magnitude).toBe('moderate')
  })

  it('returns mild magnitude when score is 1.0–1.5', () => {
    const result = computeVelocity([10, 10, 10, 12, 12, 12])
    expect(result.direction).toBe('decelerating')
    expect(result.magnitude).toBe('mild')
  })

  it('returns null score when fewer than 3 touchpoints', () => {
    expect(computeVelocity([]).score).toBeNull()
    expect(computeVelocity([10]).score).toBeNull()
    expect(computeVelocity([10, 20]).score).toBeNull()
  })
})
