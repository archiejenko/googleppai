/**
 * Smoke tests — L8 Energy & Pacing Analysis
 *
 * Covers:
 *   1.  computePacingScore: all optimal windows → 100
 *   2.  computePacingScore: all too_fast → deductions applied
 *   3.  computePacingScore: avg < 110 → extra -5 deduction
 *   4.  computePacingScore: std dev > 20 → +5 bonus applied
 *   5.  computePacingScore: empty windows → null
 *   6.  pacingFlag: wpm > 200 → too_fast
 *   7.  pacingFlag: wpm < 100 → too_slow
 *   8.  pacingFlag: wpm 150 → optimal
 *   9.  varianceLabel: std dev > 20 → 'Natural variation'
 *  10.  varianceLabel: std dev < 10 → 'Monotone delivery'
 *  11.  PacingAnalysisChart: empty state when no windows
 *  12.  PacingAnalysisChart: TierGate blocks base tier users
 *  13.  PacingStatCard: TierGate blocks base tier users
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import {
  computePacingScore,
  pacingFlag,
  varianceLabel,
} from '../config/pacing'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseCallPacingWindows = vi.fn()
const mockUsePacingScore       = vi.fn()
const mockUsePacingTrend       = vi.fn()
const mockUseTier              = vi.fn()

vi.mock('../hooks/useCallPacing', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../hooks/useCallPacing')>()
  return {
    ...orig,
    useCallPacingWindows: (...args: unknown[]) => mockUseCallPacingWindows(...args),
    usePacingScore:       (...args: unknown[]) => mockUsePacingScore(...args),
    usePacingTrend:       (...args: unknown[]) => mockUsePacingTrend(...args),
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

async function mountChart() {
  const { default: Comp } = await import('../features/call-review/PacingAnalysisChart')
  return Comp
}

async function mountStatCard() {
  const { default: Comp } = await import('../features/calls-dashboard/PacingStatCard')
  return Comp
}

// ── Unit tests — computePacingScore ──────────────────────────────────────────

describe('computePacingScore — pure formula', () => {
  it('1. all optimal windows → 100', () => {
    const windows = [
      { wpm: 150, flag: 'optimal' as const },
      { wpm: 155, flag: 'optimal' as const },
      { wpm: 160, flag: 'optimal' as const },
    ]
    // All within 120-190, avg ~155 (within 110-200), std dev small → no bonus
    expect(computePacingScore(windows)).toBe(100)
  })

  it('2. all too_fast windows → deductions applied', () => {
    const windows = [
      { wpm: 210, flag: 'too_fast' as const },
      { wpm: 220, flag: 'too_fast' as const },
      { wpm: 215, flag: 'too_fast' as const },
    ]
    // 3 windows × -2 = -6, avg ~215 > 200 → -5 more = 89, std dev ~4 < 20 → no bonus
    const score = computePacingScore(windows)
    expect(score).not.toBeNull()
    expect(score!).toBeLessThan(100)
    expect(score!).toBe(89)
  })

  it('3. avg < 110 → extra -5 deduction', () => {
    const windows = [
      { wpm: 85,  flag: 'too_slow' as const },
      { wpm: 90,  flag: 'too_slow' as const },
      { wpm: 95,  flag: 'too_slow' as const },
    ]
    // 3 × -2 = -6, avg ~90 < 110 → -5 = 89, std dev ~4 → no bonus
    const score = computePacingScore(windows)
    expect(score!).toBe(89)
  })

  it('4. std dev > 20 → +5 bonus applied', () => {
    // Mix of very slow and very fast to create large std dev
    const windows = [
      { wpm: 150, flag: 'optimal'  as const },
      { wpm: 150, flag: 'optimal'  as const },
      { wpm: 210, flag: 'too_fast' as const },
      { wpm: 210, flag: 'too_fast' as const },
    ]
    // avg = 180 (in range, no avg penalty), 2 out of range × -2 = -4
    // std dev = sqrt(((150-180)^2*2 + (210-180)^2*2)/4) = sqrt((900*2+900*2)/4) = sqrt(900) = 30 > 20 → +5
    // Score = 100 - 4 + 5 = 101 → clamped to 100
    const score = computePacingScore(windows)
    expect(score!).toBe(100)
  })

  it('5. empty windows → null', () => {
    expect(computePacingScore([])).toBeNull()
  })
})

describe('pacingFlag — WPM thresholds', () => {
  it('6. wpm > 200 → too_fast', () => {
    expect(pacingFlag(210)).toBe('too_fast')
  })

  it('7. wpm < 100 → too_slow', () => {
    expect(pacingFlag(85)).toBe('too_slow')
  })

  it('8. wpm 150 → optimal', () => {
    expect(pacingFlag(150)).toBe('optimal')
  })
})

describe('varianceLabel', () => {
  it('9. std dev > 20 → Natural variation', () => {
    expect(varianceLabel(25)).toBe('Natural variation')
  })

  it('10. std dev < 10 → Monotone delivery', () => {
    expect(varianceLabel(7)).toBe('Monotone delivery')
  })
})

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('PacingAnalysisChart — L8 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('11. empty state when no windows', async () => {
    mockUseTier.mockReturnValue({ isRevIntel: true, isLoading: false })
    mockUseCallPacingWindows.mockReturnValue({ data: [], isLoading: false })
    mockUsePacingScore.mockReturnValue({ data: null, isLoading: false })

    const Comp = await mountChart()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })
    expect(screen.getByText(/No pacing data available/i)).toBeTruthy()
  })

  it('12. TierGate blocks base tier users', async () => {
    mockUseTier.mockReturnValue({ isRevIntel: false, isLoading: false })
    mockUseCallPacingWindows.mockReturnValue({ data: [], isLoading: false })
    mockUsePacingScore.mockReturnValue({ data: null, isLoading: false })

    const Comp = await mountChart()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })
    expect(screen.getByText(/Upgrade to unlock/i)).toBeTruthy()
  })
})

describe('PacingStatCard — L8 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('13. TierGate blocks base tier users', async () => {
    mockUseTier.mockReturnValue({ isRevIntel: false, isLoading: false })
    mockUsePacingTrend.mockReturnValue({ data: [], isLoading: false })

    const Comp = await mountStatCard()
    render(<Comp />, { wrapper: wrap(makeClient()) })
    expect(screen.getByText(/Upgrade to unlock/i)).toBeTruthy()
  })
})
