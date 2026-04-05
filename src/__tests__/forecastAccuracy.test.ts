/**
 * R9: Forecast Accuracy Tracking — smoke tests
 * 1. forecastAccuracy: correct ratio (actual/committed)
 * 2. forecastAccuracy: null when committed is 0
 * 3. forecastBias: null when fewer than 2 periods with actuals
 * 4. forecastBias: correct average ratio
 * 5. aiAdjustedForecast: committed / bias
 * 6. currentPeriod: returns correct YYYY-QN format
 */

import { describe, it, expect } from 'vitest'
import { forecastAccuracy, forecastBias, aiAdjustedForecast, currentPeriod } from '../hooks/useForecasting'

describe('forecastAccuracy', () => {
  it('returns actual/committed ratio', () => {
    expect(forecastAccuracy(100000, 80000)).toBeCloseTo(0.8, 3)
    expect(forecastAccuracy(50000, 60000)).toBeCloseTo(1.2, 3)
  })

  it('returns null when committed is 0', () => {
    expect(forecastAccuracy(0, 50000)).toBeNull()
    expect(forecastAccuracy(null, 50000)).toBeNull()
    expect(forecastAccuracy(100000, null)).toBeNull()
  })
})

describe('forecastBias', () => {
  it('returns null when fewer than 2 periods with actuals', () => {
    expect(forecastBias([])).toBeNull()
    expect(forecastBias([{ committed_amount: 100000, actual_amount: 80000 }])).toBeNull()
    expect(forecastBias([{ committed_amount: 100000, actual_amount: null }])).toBeNull()
  })

  it('returns avg(committed/actual) over valid submissions', () => {
    const subs = [
      { committed_amount: 100000, actual_amount: 80000 },  // 1.25
      { committed_amount: 80000,  actual_amount: 80000 },  // 1.0
    ]
    // avg = (1.25 + 1.0) / 2 = 1.125
    expect(forecastBias(subs)).toBeCloseTo(1.125, 3)
  })
})

describe('aiAdjustedForecast', () => {
  it('returns committed / bias', () => {
    expect(aiAdjustedForecast(100000, 1.25)).toBeCloseTo(80000, 0)
  })

  it('returns null when bias is null or zero', () => {
    expect(aiAdjustedForecast(100000, null)).toBeNull()
    expect(aiAdjustedForecast(100000, 0)).toBeNull()
  })
})

describe('currentPeriod', () => {
  it('returns a string matching YYYY-QN format', () => {
    const period = currentPeriod()
    expect(period).toMatch(/^[0-9]{4}-Q[1-4]$/)
  })
})
