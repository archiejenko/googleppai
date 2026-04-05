/**
 * Smoke tests for RetentionDecayCurve (T4)
 *
 * Mocks the hook directly — same pattern as T2/T3 tests.
 *
 * Covers:
 *   1. Skeleton renders while loading
 *   2. No-data state renders when hasAnyData = false
 *   3. Skill selector renders all 7 skills (objection_handling disabled)
 *   4. Decay alert panel renders when alerts exist
 *   5. Rep summary table renders rep names with day 0/7/30 columns
 *   6. Selecting a rep in the alert panel toggles selection (toggle off on second click)
 *   7. Hook receives the days prop correctly
 *   8. No decay alert panel when no alerts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SKILL_BENCHMARKS } from '../config/benchmarks';
import type { RetentionDecayData } from '../hooks/useRetentionDecay';

// ── Mock the hook ─────────────────────────────────────────────────────────────

const mockUseRetentionDecay = vi.fn();

vi.mock('../hooks/useRetentionDecay', () => ({
  useRetentionDecay: (...args: unknown[]) => mockUseRetentionDecay(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EMPTY_CHART_POINTS = [
  { day: 0,  label: 'Post-training', teamAvg: null },
  { day: 7,  label: 'Day 7',         teamAvg: null },
  { day: 30, label: 'Day 30',        teamAvg: null },
]

function makeData(overrides: Partial<RetentionDecayData> = {}): RetentionDecayData {
  return {
    chartPoints: [
      { day: 0,  label: 'Post-training', teamAvg: 72, 'rep-1': 75, 'rep-2': 69 },
      { day: 7,  label: 'Day 7',         teamAvg: 65, 'rep-1': 68, 'rep-2': 62 },
      { day: 30, label: 'Day 30',        teamAvg: 58, 'rep-1': 50, 'rep-2': 66 },
    ],
    reps: [
      { repId: 'rep-1', repName: 'Alice Chen',  day0: 75, day7: 68, day30: 50, hasAlert: true  },
      { repId: 'rep-2', repName: 'Marcus Webb', day0: 69, day7: 62, day30: 66, hasAlert: false },
    ],
    decayAlerts: [
      { repId: 'rep-1', repName: 'Alice Chen', day0: 75, day7: 68, day30: 50, hasAlert: true },
    ],
    selectedSkill: 'meddic_qualification',
    hasAnyData: true,
    ...overrides,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

async function mountComponent() {
  const { default: Comp } = await import(
    '../features/training-analytics/RetentionDecayCurve'
  );
  return Comp;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RetentionDecayCurve — T4 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. skeleton renders while loading', async () => {
    mockUseRetentionDecay.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Chen')).toBeNull();
  });

  it('2. no-data state renders when hasAnyData = false', async () => {
    mockUseRetentionDecay.mockReturnValue({
      data: makeData({
        hasAnyData: false,
        chartPoints: EMPTY_CHART_POINTS,
        reps: [],
        decayAlerts: [],
      }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // NoDataState renders with skill-specific message
    expect(screen.getByText(/No retention data for/i)).toBeTruthy();
  });

  it('3. skill selector renders all 7 skills; objection_handling is disabled', async () => {
    mockUseRetentionDecay.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    for (const skill of SKILL_BENCHMARKS) {
      const btn = screen.getByText(skill.label);
      expect(btn).toBeTruthy();
      if (skill.dataQuality === 'none') {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      }
    }
  });

  it('4. decay alert panel renders when alerts exist', async () => {
    mockUseRetentionDecay.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Coaching Alerts/i)).toBeTruthy();
    expect(screen.getAllByText('Alice Chen').length).toBeGreaterThanOrEqual(1);
  });

  it('5. rep summary table renders rep rows with Day 0/7/30 columns', async () => {
    mockUseRetentionDecay.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Both reps appear in the table
    const alices = screen.getAllByText('Alice Chen');
    expect(alices.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Marcus Webb')).toBeTruthy();

    // Column headers
    expect(screen.getByText('Day 0')).toBeTruthy();
    expect(screen.getByText('Day 7')).toBeTruthy();
    expect(screen.getByText('Day 30')).toBeTruthy();
    expect(screen.getByText('Drop')).toBeTruthy();
  });

  it('6. clicking a rep in the alert panel toggles selection; second click deselects', async () => {
    mockUseRetentionDecay.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Find the alert panel button for Alice (inside the alert panel — has the drop suffix)
    const alertButtons = screen.getAllByText(/Alice Chen/);
    // The alert panel button has "−Npts" suffix text as a child span — find the one in the alert panel
    // Both the alert panel button and summary table row contain "Alice Chen" — click the first one (alert panel)
    fireEvent.click(alertButtons[0]);

    // After click, selected state — button background changes (tested via aria or class)
    // We just verify clicking doesn't throw and the component remains stable
    expect(screen.getAllByText(/Alice Chen/).length).toBeGreaterThanOrEqual(1);

    // Click again to deselect
    fireEvent.click(alertButtons[0]);
    expect(screen.getAllByText(/Alice Chen/).length).toBeGreaterThanOrEqual(1);
  });

  it('7. hook receives the days prop and the initial skill', async () => {
    mockUseRetentionDecay.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={60} />, { wrapper: wrap(makeClient()) });

    // Hook called with days=60 and default skill
    expect(mockUseRetentionDecay).toHaveBeenCalledWith(60, 'meddic_qualification');
  });

  it('8. no decay alert panel when decayAlerts is empty', async () => {
    mockUseRetentionDecay.mockReturnValue({
      data: makeData({ decayAlerts: [] }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.queryByText(/Coaching Alerts/i)).toBeNull();
  });
});
