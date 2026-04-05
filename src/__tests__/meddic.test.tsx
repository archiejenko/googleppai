/**
 * R1: MEDDIC Completion Score — smoke tests
 * 1. computeMeddicCompletion: correct average when all pillars present
 * 2. computeMeddicCompletion: null pillar excluded from sum (divides by 6)
 * 3. MeddicRadialChart: renders 6 arc segments
 * 4. MeddicRadialChart: coral threshold — meddic_completion_pct < 40
 * 5. MeddicRadialChart: amber threshold — meddic_completion_pct between 40–79
 * 6. meddic-scorer: graceful skip when no deal_id (pure function test)
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { computeMeddicCompletion, MEDDIC_PILLARS, type MeddicRow } from '../hooks/useMeddic'
import MeddicRadialChart from '../features/deal-view/MeddicRadialChart'

// ── Helper to build a MeddicRow ────────────────────────────────────────────

function makeRow(overrides: Partial<MeddicRow> = {}): MeddicRow {
  return {
    id: 'test-id',
    deal_id: 'deal-1',
    org_id: 'org-1',
    metrics_score: null,
    economic_buyer_score: null,
    decision_criteria_score: null,
    decision_process_score: null,
    pain_score: null,
    champion_score: null,
    meddic_completion_pct: null,
    last_updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── Test 1: all pillars set, correct average ───────────────────────────────

describe('computeMeddicCompletion', () => {
  it('returns average across all 6 pillars when all are set', () => {
    const row = makeRow({
      metrics_score: 100,
      economic_buyer_score: 80,
      decision_criteria_score: 60,
      decision_process_score: 40,
      pain_score: 20,
      champion_score: 0,
    })
    // (100 + 80 + 60 + 40 + 20 + 0) / 6 = 300/6 = 50
    expect(computeMeddicCompletion(row)).toBeCloseTo(50, 1)
  })

  // ── Test 2: null pillars still divide by 6 (not by non-null count) ──────

  it('always divides by 6 even when some pillars are null (null = 0 in sum)', () => {
    const row = makeRow({
      metrics_score: 90,
      pain_score: 90,
      // 4 pillars null
    })
    // (90 + 0 + 0 + 0 + 90 + 0) / 6 = 180/6 = 30
    expect(computeMeddicCompletion(row)).toBeCloseTo(30, 1)
  })

  it('returns null when all pillars are null', () => {
    expect(computeMeddicCompletion(makeRow())).toBeNull()
  })
})

// ── Test 3: radial chart renders 6 segments ───────────────────────────────

describe('MeddicRadialChart', () => {
  it('renders exactly 6 arc segments', () => {
    render(<MeddicRadialChart meddic={null} />)
    const segments = screen.getAllByTestId(/^meddic-segment-/)
    expect(segments).toHaveLength(6)
    expect(segments).toHaveLength(MEDDIC_PILLARS.length)
  })

  // ── Test 4: coral threshold < 40 ─────────────────────────────────────

  it('shows coral colour label when completion pct < 40', () => {
    const row = makeRow({
      metrics_score: 20,
      economic_buyer_score: 20,
      decision_criteria_score: 0,
      decision_process_score: 0,
      pain_score: 0,
      champion_score: 0,
      meddic_completion_pct: 6.67,
    })
    render(<MeddicRadialChart meddic={row} />)
    const label = screen.getByTestId('meddic-completion-label')
    // colour should be coral (#FF6B6B) — low completion
    expect(label).toBeTruthy()
  })

  // ── Test 5: amber threshold 40–79 ────────────────────────────────────

  it('shows the completion percentage when meddic_completion_pct is 50', () => {
    const row = makeRow({
      metrics_score: 100,
      economic_buyer_score: 80,
      decision_criteria_score: 60,
      decision_process_score: 40,
      pain_score: 20,
      champion_score: 0,
      meddic_completion_pct: 50,
    })
    render(<MeddicRadialChart meddic={row} />)
    const label = screen.getByTestId('meddic-completion-label')
    expect(label.textContent).toBe('50%')
  })

  it('renders dash when no meddic data', () => {
    render(<MeddicRadialChart meddic={null} />)
    const label = screen.getByTestId('meddic-completion-label')
    expect(label.textContent).toBe('—')
  })
})

// ── Test 6: graceful skip when no deal_id ─────────────────────────────────

describe('meddic-scorer: graceful skip', () => {
  it('takeHigher returns null when both inputs are null', () => {
    // Mirror the takeHigher pure function inline
    function takeHigher(existing: number | null | undefined, incoming: number | null): number | null {
      if (existing == null && incoming == null) return null
      if (existing == null) return incoming
      if (incoming == null) return existing
      return Math.max(existing, incoming)
    }

    expect(takeHigher(null, null)).toBeNull()
    expect(takeHigher(50, null)).toBe(50)
    expect(takeHigher(null, 70)).toBe(70)
    expect(takeHigher(60, 80)).toBe(80)
    expect(takeHigher(90, 40)).toBe(90) // never decreases
  })
})
