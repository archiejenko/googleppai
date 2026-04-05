/**
 * Smoke tests — L5 Objection Detection & AER Response Scoring
 *
 * Covers:
 *   1. computeAerScore: all three components → correct total
 *   2. computeAerScore: zero components → 0
 *   3. deriveResponsePattern: all components present → aer_complete
 *   4. deriveResponsePattern: ack only → acknowledge_only
 *   5. deriveResponsePattern: respond only → immediate_counter
 *   6. deriveResponsePattern: nothing → no_response
 *   7. heatmap cell: score < 50 renders as coral/weak
 *   8. heatmap cell: score ≥ 70 renders as green
 *   9. ObjectionAnalysisPanel empty state (no objections)
 *  10. ObjectionAnalysisPanel renders objection list with type + score
 *  11. TierGate renders paywall for non-RevIntel tier users
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { computeAerScore, deriveResponsePattern, aerScoreColor } from '../hooks/useCallObjections'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseCallObjections = vi.fn()
const mockUseTier = vi.fn()

vi.mock('../hooks/useCallObjections', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../hooks/useCallObjections')>()
  return {
    ...orig,
    useCallObjections:        (...args: unknown[]) => mockUseCallObjections(...args),
    useObjectionPatterns:     vi.fn(() => ({ data: [], isLoading: false })),
    useTeamObjectionHeatmap:  vi.fn(() => ({ data: [], isLoading: false })),
  }
})

vi.mock('../context/TierContext', () => ({
  useTier: () => mockUseTier(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'rep-1' } }),
}))

vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>()
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrap(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

function makeObjection(overrides = {}) {
  return {
    id:                          'obj-1',
    call_id:                     'call-abc',
    rep_id:                      'rep-1',
    objection_type:              'price' as const,
    objection_text:              "It's too expensive",
    objection_timestamp_seconds: 180,
    rep_response_text:           "I understand the concern — let me walk you through ROI...",
    rep_response_score:          72,
    response_pattern:            'aer_complete' as const,
    created_at:                  '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

async function mountPanel() {
  const { default: Comp } = await import('../features/call-review/ObjectionAnalysisPanel')
  return Comp
}

// ── Unit tests — pure AER logic ───────────────────────────────────────────────

describe('AER scoring — pure logic', () => {
  it('1. computeAerScore: all components → correct total', () => {
    expect(computeAerScore(30, 28, 32)).toBe(90)
  })

  it('2. computeAerScore: all zeros → 0', () => {
    expect(computeAerScore(0, 0, 0)).toBe(0)
  })

  it('3. deriveResponsePattern: all present → aer_complete', () => {
    expect(deriveResponsePattern(25, 25, 30)).toBe('aer_complete')
  })

  it('4. deriveResponsePattern: ack only → acknowledge_only', () => {
    expect(deriveResponsePattern(20, 0, 0)).toBe('acknowledge_only')
  })

  it('5. deriveResponsePattern: respond only → immediate_counter', () => {
    expect(deriveResponsePattern(0, 0, 30)).toBe('immediate_counter')
  })

  it('6. deriveResponsePattern: nothing → no_response', () => {
    expect(deriveResponsePattern(0, 0, 0)).toBe('no_response')
  })
})

describe('aerScoreColor — threshold colours', () => {
  it('7. score < 50 → coral (#FF6B6B)', () => {
    expect(aerScoreColor(35)).toBe('#FF6B6B')
  })

  it('8. score ≥ 70 → green (#10B981)', () => {
    expect(aerScoreColor(75)).toBe('#10B981')
  })
})

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('ObjectionAnalysisPanel — L5 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTier.mockReturnValue({ isRevIntel: true, isLoading: false })
  })

  it('9. empty state when no objections detected', async () => {
    mockUseCallObjections.mockReturnValue({ data: [], isLoading: false })

    const Comp = await mountPanel()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })

    expect(screen.getByText(/No objections detected/i)).toBeTruthy()
  })

  it('10. renders objection list with type pill and score', async () => {
    mockUseCallObjections.mockReturnValue({
      data: [
        makeObjection({ objection_type: 'price', rep_response_score: 72, response_pattern: 'aer_complete' }),
        makeObjection({
          id:                          'obj-2',
          objection_type:              'timing',
          rep_response_score:          30,
          response_pattern:            'no_response',
          objection_timestamp_seconds: 300,
        }),
      ],
      isLoading: false,
    })

    const Comp = await mountPanel()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })

    expect(screen.getByText('Price')).toBeTruthy()
    expect(screen.getByText('Timing')).toBeTruthy()
    expect(screen.getAllByText('AER Complete').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No Response').length).toBeGreaterThan(0)
    // Scores
    expect(screen.getByText('72')).toBeTruthy()
    expect(screen.getByText('30')).toBeTruthy()
  })

  it('11. TierGate shows paywall for non-RevIntel users', async () => {
    mockUseTier.mockReturnValue({ isRevIntel: false, isLoading: false })
    mockUseCallObjections.mockReturnValue({ data: [], isLoading: false })

    const Comp = await mountPanel()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })

    expect(screen.getByText(/Upgrade to unlock/i)).toBeTruthy()
    expect(screen.getAllByText(/Revenue Intelligence/i).length).toBeGreaterThan(0)
  })
})
