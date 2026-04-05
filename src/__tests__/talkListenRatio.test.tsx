/**
 * Smoke tests — L2 Talk-to-Listen Ratio (Stage-Aware)
 *
 * Covers:
 *   1. isWithinTalkBenchmark: pass/fail for each stage
 *   2. null call_stage defaults to discovery benchmark
 *   3. Donut renders green fill when within benchmark
 *   4. Donut renders coral fill when above benchmark
 *   5. Trend chart renders with correct benchmark reference value
 *   6. Stage override mutation fires with selected stage
 *   7. Empty trend state renders correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  isWithinTalkBenchmark,
  TALK_RATIO_BENCHMARKS,
  ALL_CALL_STAGES,
} from '../config/benchmarks';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

const mockUseTalkListenRatio  = vi.fn();
const mockUseUpdateCallStage  = vi.fn(() => ({
  mutate:    mockMutate,
  isPending: false,
}));
const mockUseTalkListenTrend  = vi.fn();

vi.mock('../hooks/useTalkListen', () => ({
  useTalkListenRatio:  (...args: unknown[]) => mockUseTalkListenRatio(...args),
  useUpdateCallStage:  (...args: unknown[]) => mockUseUpdateCallStage(...args),
  useTalkListenTrend:  (...args: unknown[]) => mockUseTalkListenTrend(...args),
}));

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

async function mountDonut() {
  const { default: Comp } = await import('../features/call-review/TalkListenRatioDonut');
  return Comp;
}

async function mountTrend() {
  const { default: Comp } = await import('../features/calls-dashboard/TalkListenTrend');
  return Comp;
}

// ── Unit tests — pure benchmark logic ────────────────────────────────────────

describe('TALK_RATIO_BENCHMARKS — benchmark pass/fail logic', () => {
  it('1a. discovery: ≤45% = pass, >45% = fail', () => {
    expect(isWithinTalkBenchmark(45, 'discovery')).toBe(true);
    expect(isWithinTalkBenchmark(46, 'discovery')).toBe(false);
    expect(isWithinTalkBenchmark(30, 'discovery')).toBe(true);
  });

  it('1b. demo: ≤65% = pass, >65% = fail', () => {
    expect(isWithinTalkBenchmark(65, 'demo')).toBe(true);
    expect(isWithinTalkBenchmark(66, 'demo')).toBe(false);
  });

  it('1c. proposal: ≤55% = pass', () => {
    expect(isWithinTalkBenchmark(55, 'proposal')).toBe(true);
    expect(isWithinTalkBenchmark(56, 'proposal')).toBe(false);
  });

  it('1d. negotiation: ≤50% = pass', () => {
    expect(isWithinTalkBenchmark(50, 'negotiation')).toBe(true);
    expect(isWithinTalkBenchmark(51, 'negotiation')).toBe(false);
  });

  it('1e. close: ≤40% = pass', () => {
    expect(isWithinTalkBenchmark(40, 'close')).toBe(true);
    expect(isWithinTalkBenchmark(41, 'close')).toBe(false);
  });

  it('1f. all stages covered in TALK_RATIO_BENCHMARKS', () => {
    for (const stage of ALL_CALL_STAGES) {
      expect(TALK_RATIO_BENCHMARKS[stage]).toBeDefined();
      expect(typeof TALK_RATIO_BENCHMARKS[stage].rep_max).toBe('number');
    }
  });
});

describe('TalkListenRatioDonut — L2 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateCallStage.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it('2. null call_stage defaults to discovery (effective_stage = discovery)', async () => {
    mockUseTalkListenRatio.mockReturnValue({
      data: {
        call_id:           'call-1',
        rep_talk_pct:      42,
        prospect_talk_pct: 58,
        call_stage:        null,
        effective_stage:   'discovery',
        benchmark_rep_max: 45,
        within_benchmark:  true,
      },
      isLoading: false,
    });

    const Comp = await mountDonut();
    render(<Comp callId="call-1" />, { wrapper: wrap(makeClient()) });

    // effective_stage = discovery → "Within benchmark for Discovery" text present
    expect(screen.getByText(/Within benchmark/i)).toBeTruthy();
    // Stage button shows "Discovery"
    expect(screen.getByRole('button', { name: /Select call stage/i })).toBeTruthy();
  });

  it('3. donut renders green state when within benchmark', async () => {
    mockUseTalkListenRatio.mockReturnValue({
      data: {
        call_id: 'c1', rep_talk_pct: 40, prospect_talk_pct: 60,
        call_stage: 'discovery', effective_stage: 'discovery',
        benchmark_rep_max: 45, within_benchmark: true,
      },
      isLoading: false,
    });

    const Comp = await mountDonut();
    render(<Comp callId="c1" />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Within benchmark/i)).toBeTruthy();
  });

  it('4. donut renders coral/above state when outside benchmark', async () => {
    mockUseTalkListenRatio.mockReturnValue({
      data: {
        call_id: 'c2', rep_talk_pct: 62, prospect_talk_pct: 38,
        call_stage: 'discovery', effective_stage: 'discovery',
        benchmark_rep_max: 45, within_benchmark: false,
      },
      isLoading: false,
    });

    const Comp = await mountDonut();
    render(<Comp callId="c2" />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Above benchmark/i)).toBeTruthy();
  });

  it('6. stage override mutation fires with selected stage', async () => {
    mockUseTalkListenRatio.mockReturnValue({
      data: {
        call_id: 'c3', rep_talk_pct: 50, prospect_talk_pct: 50,
        call_stage: 'discovery', effective_stage: 'discovery',
        benchmark_rep_max: 45, within_benchmark: false,
      },
      isLoading: false,
    });

    const Comp = await mountDonut();
    render(<Comp callId="c3" />, { wrapper: wrap(makeClient()) });

    // Open dropdown
    const stageButton = screen.getByRole('button', { name: /Select call stage/i });
    fireEvent.click(stageButton);

    // Click "Demo" option
    const demoOption = screen.getByText('Demo');
    fireEvent.click(demoOption);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith('demo');
    });
  });
});

describe('TalkListenTrend — L2 smoke tests', () => {
  it('5. trend renders with correct benchmark reference value', async () => {
    const trendData = {
      points: [
        { call_id: 'c1', call_date: '2026-01-01T10:00:00Z', rep_talk_pct: 42, call_stage: 'discovery' as const },
        { call_id: 'c2', call_date: '2026-01-03T10:00:00Z', rep_talk_pct: 38, call_stage: 'discovery' as const },
        { call_id: 'c3', call_date: '2026-01-05T10:00:00Z', rep_talk_pct: 50, call_stage: 'discovery' as const },
      ],
      dominant_stage:    'discovery' as const,
      benchmark_rep_max: 45,
    };

    const Comp = await mountTrend();
    render(
      <MemoryRouter>
        <Comp data={trendData} />
      </MemoryRouter>
    );

    // Header shows dominant stage + benchmark value
    expect(screen.getByText(/Discovery/i)).toBeTruthy();   // stage label in header
    expect(screen.getByText(/≤45%/)).toBeTruthy();         // benchmark max in header
    // Within/above count summary
    expect(screen.getByText(/3 calls/i)).toBeTruthy();
  });

  it('7. empty trend state renders correctly', async () => {
    const emptyData = {
      points:            [],
      dominant_stage:    'discovery' as const,
      benchmark_rep_max: 45,
    };

    const Comp = await mountTrend();
    render(
      <MemoryRouter>
        <Comp data={emptyData} />
      </MemoryRouter>
    );

    expect(screen.getByText(/No talk ratio data yet/i)).toBeTruthy();
  });
});
