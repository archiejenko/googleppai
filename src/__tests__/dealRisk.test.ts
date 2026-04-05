/**
 * R2: Revenue at Risk Score — smoke tests
 * 1. computeAtRiskArr: correctly counts deals above threshold 70
 * 2. computeAtRiskArr: sums value_gbp for at-risk deals only
 * 3. riskColour: green < 30
 * 4. riskColour: amber 30–70
 * 5. riskColour: coral > 70
 * 6. computeAtRiskArr: returns 0 count and 0 totalGbp when no deals exceed threshold
 */

import { describe, it, expect } from 'vitest'
import { computeAtRiskArr, riskColour } from '../hooks/useDealRisk'
import type { DealRiskScore } from '../hooks/useDealRisk'

type RiskWithDeal = DealRiskScore & { deals: { value_gbp: number } | null }

function makeRisk(dealId: string, score: number, valueGbp: number): RiskWithDeal {
  return {
    id: `risk-${dealId}`,
    deal_id: dealId,
    org_id: 'org-1',
    risk_score: score,
    risk_factors: {},
    computed_at: new Date().toISOString(),
    deals: { value_gbp: valueGbp },
  }
}

describe('computeAtRiskArr', () => {
  it('counts only deals with risk_score > 70', () => {
    const risks = [
      makeRisk('d1', 80, 50000),
      makeRisk('d2', 70, 30000), // exactly 70 — NOT at risk (must be >70)
      makeRisk('d3', 71, 20000),
      makeRisk('d4', 20, 10000),
    ]
    const result = computeAtRiskArr(risks)
    expect(result.count).toBe(2)
  })

  it('sums value_gbp for at-risk deals only', () => {
    const risks = [
      makeRisk('d1', 85, 100000),
      makeRisk('d2', 90, 50000),
      makeRisk('d3', 30, 200000), // not at risk
    ]
    const result = computeAtRiskArr(risks)
    expect(result.totalGbp).toBe(150000)
  })

  it('returns 0 count and 0 totalGbp when no deals exceed 70', () => {
    const risks = [
      makeRisk('d1', 40, 50000),
      makeRisk('d2', 70, 30000),
    ]
    const result = computeAtRiskArr(risks)
    expect(result.count).toBe(0)
    expect(result.totalGbp).toBe(0)
  })
})

describe('riskColour', () => {
  it('returns green (#10B981) when score < 30', () => {
    expect(riskColour(0)).toBe('#10B981')
    expect(riskColour(29)).toBe('#10B981')
  })

  it('returns amber (#F59E0B) when score is 30–70', () => {
    expect(riskColour(30)).toBe('#F59E0B')
    expect(riskColour(50)).toBe('#F59E0B')
    expect(riskColour(70)).toBe('#F59E0B')
  })

  it('returns coral (#FF6B6B) when score > 70', () => {
    expect(riskColour(71)).toBe('#FF6B6B')
    expect(riskColour(100)).toBe('#FF6B6B')
  })
})
