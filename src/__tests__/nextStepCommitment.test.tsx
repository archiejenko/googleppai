/**
 * Smoke tests — L7 Next Step Commitment Rate
 *
 * Covers:
 *   1.  commitmentRate: 7/10 confirmed = 70%
 *   2.  commitmentRate: 0/0 → 0 (no divide-by-zero)
 *   3.  trendDirection: current > prev + 3pp → 'up'
 *   4.  trendDirection: current < prev - 3pp → 'down'
 *   5.  trendDirection: within ±3pp → 'stable'
 *   6.  coaching trigger threshold: rate < 60 → trigger fires
 *   7.  coaching trigger: rate ≥ 60 → trigger NOT fired
 *   8.  hasDateMention: UK dd/mm format matches
 *   9.  hasDateMention: ordinal UK date ("14th March") matches
 *  10.  hasDateMention: relative term ("next Tuesday") matches
 *  11.  hasDateMention: no date mention → false
 *  12.  NextStepCommitmentRate renders hero stat with rate
 *  13.  NextStepLeaderboard renders sorted leaderboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import {
  commitmentRate,
  trendDirection,
  hasDateMention,
  COACHING_TRIGGER_THRESHOLD,
} from '../config/nextStep'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseNextStepCommitmentRate   = vi.fn()
const mockUseTeamCommitmentLeaderboard = vi.fn()

vi.mock('../hooks/useNextStepCommitmentRate', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../hooks/useNextStepCommitmentRate')>()
  return {
    ...orig,
    useNextStepCommitmentRate:     (...args: unknown[]) => mockUseNextStepCommitmentRate(...args),
    useTeamCommitmentLeaderboard:  (...args: unknown[]) => mockUseTeamCommitmentLeaderboard(...args),
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'rep-1' } }),
}))

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

async function mountHero() {
  const { default: Comp } = await import('../features/calls-dashboard/NextStepCommitmentRate')
  return Comp
}

async function mountLeaderboard() {
  const { default: Comp } = await import('../features/training-analytics/NextStepLeaderboard')
  return Comp
}

// ── Unit tests — pure commitment rate logic ───────────────────────────────────

describe('commitmentRate', () => {
  it('1. 7/10 confirmed → 70%', () => {
    expect(commitmentRate(7, 10)).toBe(70)
  })

  it('2. 0/0 → 0 (no divide-by-zero)', () => {
    expect(commitmentRate(0, 0)).toBe(0)
  })
})

describe('trendDirection', () => {
  it('3. delta > 3pp → up', () => {
    expect(trendDirection(75, 70)).toBe('up')
  })

  it('4. delta < -3pp → down', () => {
    expect(trendDirection(65, 72)).toBe('down')
  })

  it('5. within ±3pp → stable', () => {
    expect(trendDirection(70, 68)).toBe('stable')
  })
})

describe('coaching trigger threshold', () => {
  it('6. rate < 60 → threshold breach (trigger should fire)', () => {
    expect(59 < COACHING_TRIGGER_THRESHOLD).toBe(true)
  })

  it('7. rate ≥ 60 → threshold not breached (trigger should NOT fire)', () => {
    expect(60 < COACHING_TRIGGER_THRESHOLD).toBe(false)
  })
})

describe('hasDateMention — UK-first date detection', () => {
  it('8. UK dd/mm format', () => {
    expect(hasDateMention("Let's speak on 14/03 to review the proposal.")).toBe(true)
  })

  it("9. ordinal UK date: '14th March'", () => {
    expect(hasDateMention("I'll send over the proposal by 14th March.")).toBe(true)
  })

  it("10. relative UK term: 'next Tuesday'", () => {
    expect(hasDateMention("Shall we book a call next Tuesday morning?")).toBe(true)
  })

  it('11. no date mention → false', () => {
    expect(hasDateMention("I'll follow up with you soon.")).toBe(false)
  })
})

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('NextStepCommitmentRate — L7 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('12. renders hero stat with rate percentage', async () => {
    mockUseNextStepCommitmentRate.mockReturnValue({
      data: {
        rate:        78,
        trend:       'up',
        trend_delta: 8,
        confirmed:   7,
        total:       9,
        recent_calls: [
          { call_id: 'c1', call_date: '2026-01-05T10:00:00Z', next_step_confirmed: true,  next_step_text: "I'll send the proposal by Thursday." },
          { call_id: 'c2', call_date: '2026-01-04T10:00:00Z', next_step_confirmed: false, next_step_text: null },
        ],
      },
      isLoading: false,
    })

    const Comp = await mountHero()
    render(<Comp />, { wrapper: wrap(makeClient()) })

    expect(screen.getByText('78%')).toBeTruthy()
    expect(screen.getByText('7/9 calls confirmed')).toBeTruthy()
    expect(screen.getByText(/I'll send the proposal by Thursday/)).toBeTruthy()
    expect(screen.getByText('No next step confirmed')).toBeTruthy()
  })
})

describe('NextStepLeaderboard — L7 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('13. renders sorted leaderboard', async () => {
    mockUseTeamCommitmentLeaderboard.mockReturnValue({
      data: [
        { rep_id: 'r1', rep_name: 'Alice',   rate: 90, trend: 'up',   call_count: 10 },
        { rep_id: 'r2', rep_name: 'Bob',     rate: 72, trend: 'stable', call_count: 8 },
        { rep_id: 'r3', rep_name: 'Charlie', rate: 45, trend: 'down', call_count: 11 },
      ],
      isLoading: false,
    })

    const Comp = await mountLeaderboard()
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) })

    // All reps present
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.getByText('Charlie')).toBeTruthy()
    // Rates
    expect(screen.getByText('90%')).toBeTruthy()
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('45%')).toBeTruthy()
    // Position numbers
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })
})
