/**
 * Smoke tests — L6 Buying Signal Detection & Capitalisation Score
 *
 * Covers:
 *   1.  computeCapitalisationScore: all three components → correct total
 *   2.  computeCapitalisationScore: zeros → 0
 *   3.  capitalised boolean: score > 50 → true
 *   4.  capitalised boolean: score = 50 → false (threshold is strictly > 50)
 *   5.  detectExactSignals: timeline phrase match
 *   6.  detectExactSignals: no match → empty array
 *   7.  missedSignalRate: 2 missed of 4 = 50%
 *   8.  missedSignalRate: 0 total → 0 (no divide-by-zero)
 *   9.  BuyingSignalPanel: empty state when no signals
 *  10.  BuyingSignalPanel: renders signal list with type pills + capitalised status
 *  11.  BuyingSignalInsightCard: renders correct team insight string
 *  12.  TierGate blocks base tier users from BuyingSignalPanel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { detectExactSignals } from '../config/buyingSignals'
import {
  computeCapitalisationScore,
  missedSignalRate,
} from '../hooks/useCallBuyingSignals'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseCallBuyingSignals    = vi.fn()
const mockUseTeamBuyingSignalInsight = vi.fn()
const mockUseTier                 = vi.fn()

vi.mock('../hooks/useCallBuyingSignals', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../hooks/useCallBuyingSignals')>()
  return {
    ...orig,
    useCallBuyingSignals:         (...args: unknown[]) => mockUseCallBuyingSignals(...args),
    useBuyingSignalTrend:         vi.fn(() => ({ data: [], isLoading: false })),
    useTeamBuyingSignalInsight:   (...args: unknown[]) => mockUseTeamBuyingSignalInsight(...args),
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

function makeSignal(overrides = {}) {
  return {
    id:                       'sig-1',
    call_id:                  'call-abc',
    rep_id:                   'rep-1',
    signal_text:              "What's the next step?",
    signal_type:              'proposal' as const,
    signal_timestamp_seconds: 240,
    capitalised:              true,
    capitalisation_score:     72,
    rep_response_text:        "Let me send over a proposal by Thursday.",
    created_at:               '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

async function mountPanel() {
  const { default: Comp } = await import('../features/call-review/BuyingSignalPanel')
  return Comp
}

async function mountInsightCard() {
  const { default: Comp } = await import('../features/training-analytics/BuyingSignalInsightCard')
  return Comp
}

// ── Unit tests — pure logic ───────────────────────────────────────────────────

describe('computeCapitalisationScore', () => {
  it('1. all components → correct total', () => {
    expect(computeCapitalisationScore(30, 28, 30)).toBe(88)
  })

  it('2. zeros → 0', () => {
    expect(computeCapitalisationScore(0, 0, 0)).toBe(0)
  })
})

describe('capitalised boolean threshold', () => {
  it('3. score > 50 → capitalised', () => {
    expect(computeCapitalisationScore(20, 18, 15) > 50).toBe(true)
  })

  it('4. score = 50 → NOT capitalised (strictly > 50)', () => {
    // 17+17+16 = 50
    expect(computeCapitalisationScore(17, 17, 16) > 50).toBe(false)
  })
})

describe('detectExactSignals — phrase matching', () => {
  it('5. timeline phrase match', () => {
    const results = detectExactSignals("When could we start? I'd like to know the timeline.")
    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.signal_type === 'timeline')).toBe(true)
  })

  it('6. no match → empty array', () => {
    const results = detectExactSignals("We're not interested at this time.")
    expect(results).toHaveLength(0)
  })
})

describe('missedSignalRate', () => {
  it('7. 2 missed of 4 → 50%', () => {
    expect(missedSignalRate(4, 2)).toBe(50)
  })

  it('8. 0 total → 0 (no divide-by-zero)', () => {
    expect(missedSignalRate(0, 0)).toBe(0)
  })
})

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('BuyingSignalPanel — L6 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTier.mockReturnValue({ isRevIntel: true, isLoading: false })
  })

  it('9. empty state when no signals', async () => {
    mockUseCallBuyingSignals.mockReturnValue({ data: [], isLoading: false })
    const Comp = await mountPanel()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })
    expect(screen.getByText(/No buying signals detected/i)).toBeTruthy()
  })

  it('10. renders signal list with type pills + capitalised status', async () => {
    mockUseCallBuyingSignals.mockReturnValue({
      data: [
        makeSignal({ signal_type: 'proposal', capitalised: true,  capitalisation_score: 72 }),
        makeSignal({ id: 'sig-2', signal_type: 'timeline', capitalised: false, capitalisation_score: 25,
          signal_timestamp_seconds: 300 }),
      ],
      isLoading: false,
    })
    const Comp = await mountPanel()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })

    expect(screen.getByText('Proposal')).toBeTruthy()
    expect(screen.getByText('Timeline')).toBeTruthy()
    expect(screen.getAllByText('Capitalised').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Missed').length).toBeGreaterThan(0)
    // Summary stat
    expect(screen.getByText(/2 signals detected/i)).toBeTruthy()
  })

  it('12. TierGate blocks base tier users', async () => {
    mockUseTier.mockReturnValue({ isRevIntel: false, isLoading: false })
    mockUseCallBuyingSignals.mockReturnValue({ data: [], isLoading: false })
    const Comp = await mountPanel()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })
    expect(screen.getByText(/Upgrade to unlock/i)).toBeTruthy()
  })
})

describe('BuyingSignalInsightCard — L6 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTier.mockReturnValue({ isRevIntel: true, isLoading: false })
  })

  it('11. renders correct team insight string', async () => {
    mockUseTeamBuyingSignalInsight.mockReturnValue({
      data: {
        team_missed_rate:  63,
        most_missed_type:  'pricing' as const,
        total_signals:     16,
        total_missed:      10,
      },
      isLoading: false,
    })

    const Comp = await mountInsightCard()
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) })

    expect(screen.getByText(/63%/)).toBeTruthy()
    expect(screen.getByText(/Pricing/)).toBeTruthy()
    expect(screen.getByText(/10\/16/)).toBeTruthy()
  })
})
