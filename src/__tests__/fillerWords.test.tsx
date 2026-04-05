/**
 * Smoke tests — L4 Filler Word Detection
 *
 * Covers:
 *   1. countFillers: detects 'um' and 'uh' in transcript
 *   2. fillerRatePerMin: correct calculation
 *   3. fillerSeverity: warning threshold at 4/min
 *   4. fillerSeverity: critical threshold at 6/min
 *   5. fillerSeverity: below warning → 'good'
 *   6. fillerTrendInsight: returns string when trending up over 5 calls
 *   7. fillerTrendInsight: returns null when trend is flat/declining
 *   8. FillerWordCard renders rate with colour coding
 *   9. FillerWordCard shows top 3 filler words
 *  10. FillerWordTrend shows coaching insight when trending up
 *  11. FillerWordTrend empty state renders correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { countFillers, fillerRatePerMin } from '../config/fillerWords';
import { fillerSeverity, fillerTrendInsight } from '../hooks/useFillerWords';
import type { FillerWordTrendPoint } from '../hooks/useFillerWords';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseFillerWords = vi.fn();
const mockUseFillerWordTrend = vi.fn();

vi.mock('../hooks/useFillerWords', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../hooks/useFillerWords')>();
  return {
    ...orig,
    useFillerWords:      (...args: unknown[]) => mockUseFillerWords(...args),
    useFillerWordTrend:  (...args: unknown[]) => mockUseFillerWordTrend(...args),
  };
});

vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function makePoint(overrides: Partial<FillerWordTrendPoint> = {}): FillerWordTrendPoint {
  return {
    call_id:      'c-1',
    call_date:    '2026-01-01T10:00:00Z',
    filler_rate:  2.0,
    filler_count: 10,
    ...overrides,
  };
}

async function mountCard() {
  const { default: Comp } = await import('../features/call-review/FillerWordCard');
  return Comp;
}

async function mountTrend() {
  const { default: Comp } = await import('../features/calls-dashboard/FillerWordTrend');
  return Comp;
}

// ── Unit tests — pure logic ───────────────────────────────────────────────────

describe('countFillers — detection logic', () => {
  it('1. detects um and uh in transcript', () => {
    const text = 'I was um thinking uh about this um yeah'
    const { breakdown, total } = countFillers(text)
    expect(breakdown['um']).toBe(2)
    expect(breakdown['uh']).toBe(1)
    expect(total).toBe(3)
  })

  it('2. fillerRatePerMin: 12 fillers in 120 secs = 6/min', () => {
    expect(fillerRatePerMin(12, 120)).toBe(6)
  })
})

describe('fillerSeverity — threshold logic', () => {
  it('3. rate = 4 → warning', () => {
    expect(fillerSeverity(4)).toBe('warning')
  })

  it('4. rate = 6 → critical', () => {
    expect(fillerSeverity(6)).toBe('critical')
  })

  it('5. rate = 1.5 → good', () => {
    expect(fillerSeverity(1.5)).toBe('good')
  })
})

describe('fillerTrendInsight — trend logic', () => {
  it('6. trending up → returns coaching string', () => {
    const points = [
      makePoint({ call_id: 'c1', filler_rate: 2.0 }),
      makePoint({ call_id: 'c2', filler_rate: 2.5 }),
      makePoint({ call_id: 'c3', filler_rate: 3.0 }),
      makePoint({ call_id: 'c4', filler_rate: 3.5 }),
      makePoint({ call_id: 'c5', filler_rate: 4.5 }),
    ]
    const result = fillerTrendInsight(points)
    expect(result).not.toBeNull()
    expect(result).toMatch(/up/i)
    expect(result).toMatch(/last 5 calls/i)
  })

  it('7. declining trend → returns null', () => {
    const points = [
      makePoint({ call_id: 'c1', filler_rate: 5.0 }),
      makePoint({ call_id: 'c2', filler_rate: 4.0 }),
      makePoint({ call_id: 'c3', filler_rate: 3.5 }),
      makePoint({ call_id: 'c4', filler_rate: 3.0 }),
      makePoint({ call_id: 'c5', filler_rate: 2.5 }),
    ]
    expect(fillerTrendInsight(points)).toBeNull()
  })
})

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('FillerWordCard — L4 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('8. renders filler rate with colour coding', async () => {
    mockUseFillerWords.mockReturnValue({
      data: {
        filler_word_count:      20,
        filler_rate_per_min:    5.2,
        filler_words_breakdown: { um: 8, uh: 6, like: 6 },
      },
      isLoading: false,
    })

    const Comp = await mountCard()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })

    // Rate displayed
    expect(screen.getByText('5.2')).toBeTruthy()
    // Severity label
    expect(screen.getByText(/Elevated/i)).toBeTruthy()
  })

  it('9. shows top 3 filler words in breakdown', async () => {
    mockUseFillerWords.mockReturnValue({
      data: {
        filler_word_count:      30,
        filler_rate_per_min:    3.5,
        filler_words_breakdown: { um: 15, uh: 10, like: 5 },
      },
      isLoading: false,
    })

    const Comp = await mountCard()
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) })

    expect(screen.getByText('Um')).toBeTruthy()
    expect(screen.getByText('Uh')).toBeTruthy()
    expect(screen.getByText('Like')).toBeTruthy()
    expect(screen.getByText('30 total fillers detected')).toBeTruthy()
  })
})

describe('FillerWordTrend — L4 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('10. shows coaching insight when trending up', async () => {
    const points = [
      makePoint({ call_id: 'c1', call_date: '2026-01-01T10:00:00Z', filler_rate: 2.0 }),
      makePoint({ call_id: 'c2', call_date: '2026-01-02T10:00:00Z', filler_rate: 2.8 }),
      makePoint({ call_id: 'c3', call_date: '2026-01-03T10:00:00Z', filler_rate: 3.5 }),
      makePoint({ call_id: 'c4', call_date: '2026-01-04T10:00:00Z', filler_rate: 4.1 }),
      makePoint({ call_id: 'c5', call_date: '2026-01-05T10:00:00Z', filler_rate: 5.0 }),
    ]

    const Comp = await mountTrend()
    render(
      <MemoryRouter>
        <Comp points={points} />
      </MemoryRouter>
    )

    expect(screen.getByText(/Filler rate up/i)).toBeTruthy()
    expect(screen.getAllByText(/last 5 calls/i).length).toBeGreaterThan(0)
  })

  it('11. empty state renders correctly', async () => {
    const Comp = await mountTrend()
    render(
      <MemoryRouter>
        <Comp points={[]} />
      </MemoryRouter>
    )

    expect(screen.getByText(/No filler data yet/i)).toBeTruthy()
  })
})
