/**
 * Smoke tests for CoachingROITracker (T9)
 *
 * Pure function unit tests (no render needed):
 *   1. windowAvg — returns avg when >= MIN_WINDOW_POINTS observations in window
 *   2. windowAvg — returns null when < MIN_WINDOW_POINTS observations
 *   3. windowAvg — observations exactly on windowStart are included; on windowEnd are excluded
 *   4. computeSessionDeltas — positive delta when post > pre
 *   5. computeSessionDeltas — negative delta when post < pre
 *   6. computeSessionDeltas — null delta when insufficient data in either window
 *   7. computeSummary — correct totals, avgDelta, bestSkill
 *   8. computeSummary — empty sessions → all nulls/zeros
 *
 * Component smoke tests:
 *   9.  Skeleton renders while loading
 *  10.  "Log Session" button is visible; form is hidden by default
 *  11.  Form expands when "Log Session" is clicked
 *  12.  Empty timeline state renders when no sessions
 *  13.  Summary stats tiles show session count and avg delta
 *  14.  Form submit calls logMutate with correct payload
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  windowAvg,
  computeSessionDeltas,
  computeSummary,
  MIN_WINDOW_POINTS,
  ROI_WINDOW_DAYS,
  type CoachingSessionWithROI,
} from '../hooks/useCoachingROI';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseCoachingROI   = vi.fn();
const logMutate            = vi.fn();
const mockUseRepListQuery  = vi.fn();

vi.mock('../hooks/useCoachingROI', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/useCoachingROI')>();
  return {
    ...original,
    useCoachingROI:        (...args: unknown[]) => mockUseCoachingROI(...args),
    useLogCoachingSession: () => ({ mutate: logMutate, isPending: false, isSuccess: false, isError: false }),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...original,
    useQuery: (...args: unknown[]) => {
      const opts = args[0] as { queryKey: unknown[] };
      if (Array.isArray(opts.queryKey) && opts.queryKey[0] === 'rep-list-coaching-roi') {
        return mockUseRepListQuery(...args);
      }
      return (original.useQuery as (...a: unknown[]) => unknown)(...args);
    },
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<CoachingSessionWithROI> = {}): CoachingSessionWithROI {
  return {
    id:          'sess-1',
    orgId:       'org-1',
    managerId:   'mgr-1',
    repId:       'rep-1',
    repName:     'Alice Chen',
    skillFocus:  ['discovery_questioning', 'champion_building'],
    sessionDate: '2025-02-15',
    notes:       null,
    createdAt:   '2025-02-15T09:00:00Z',
    deltas: [
      { skill: 'discovery_questioning', skillLabel: 'Discovery & Questioning', delta: 8.5,  preAvg: 60, postAvg: 68.5 },
      { skill: 'champion_building',     skillLabel: 'Champion Building',       delta: -3.0, preAvg: 65, postAvg: 62 },
    ],
    ...overrides,
  };
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
  const { default: Comp } = await import('../features/training-analytics/CoachingROITracker');
  return Comp;
}

// ── Pure function unit tests ──────────────────────────────────────────────────

describe('windowAvg — pure function', () => {
  const obs = [
    { score: 60, recordedAt: '2025-02-01T00:00:00Z' },
    { score: 70, recordedAt: '2025-02-05T00:00:00Z' },
    { score: 80, recordedAt: '2025-02-10T00:00:00Z' },
  ];

  it('1. returns avg when >= MIN_WINDOW_POINTS observations in window', () => {
    // All three are in the window
    const result = windowAvg(obs, '2025-01-31T00:00:00Z', '2025-02-11T00:00:00Z');
    expect(result).toBeCloseTo((60 + 70 + 80) / 3);
  });

  it('2. returns null when fewer than MIN_WINDOW_POINTS observations', () => {
    // Only one obs in narrow window
    const result = windowAvg(obs, '2025-02-04T00:00:00Z', '2025-02-06T00:00:00Z');
    expect(result).toBeNull();
    expect(MIN_WINDOW_POINTS).toBe(2); // sanity check
  });

  it('3. windowStart included, windowEnd excluded (half-open interval)', () => {
    // obs at '2025-02-01' should be included; obs at '2025-02-10' (= windowEnd) excluded
    const result = windowAvg(obs, '2025-02-01T00:00:00Z', '2025-02-10T00:00:00Z');
    // Only scores at 2025-02-01 and 2025-02-05 are in [start, end)
    expect(result).toBeCloseTo((60 + 70) / 2);
  });
});

describe('computeSessionDeltas — pure function', () => {
  // Session on 2025-03-15; pre-window = [2025-03-01, 2025-03-15); post = [2025-03-15, 2025-03-29)
  const sessionDate = '2025-03-15';

  const obs = [
    // Pre-window: 2 data points for discovery_questioning
    { skill: 'discovery_questioning' as const, score: 55, recordedAt: '2025-03-05T00:00:00Z' },
    { skill: 'discovery_questioning' as const, score: 60, recordedAt: '2025-03-10T00:00:00Z' },
    // Post-window: 2 data points for discovery_questioning
    { skill: 'discovery_questioning' as const, score: 70, recordedAt: '2025-03-18T00:00:00Z' },
    { skill: 'discovery_questioning' as const, score: 75, recordedAt: '2025-03-22T00:00:00Z' },
    // champion_building has only 1 pre-window point → null delta
    { skill: 'champion_building' as const,     score: 50, recordedAt: '2025-03-08T00:00:00Z' },
    { skill: 'champion_building' as const,     score: 60, recordedAt: '2025-03-20T00:00:00Z' },
  ];

  const deltas = computeSessionDeltas(
    ['discovery_questioning', 'champion_building'],
    sessionDate,
    obs,
  );

  it('4. positive delta when post avg > pre avg', () => {
    const dq = deltas.find(d => d.skill === 'discovery_questioning')!;
    // pre avg = (55+60)/2 = 57.5; post avg = (70+75)/2 = 72.5; delta = +15
    expect(dq.delta).toBeCloseTo(15);
  });

  it('5. null delta when insufficient pre-window data for champion_building', () => {
    const cb = deltas.find(d => d.skill === 'champion_building')!;
    // Only 1 pre-window point → delta = null
    expect(cb.delta).toBeNull();
  });

  it('6. negative delta when post avg < pre avg', () => {
    // Construct a case with 2 pre, 2 post where post < pre
    const negObs = [
      { skill: 'closing_commitment' as const, score: 80, recordedAt: '2025-03-05T00:00:00Z' },
      { skill: 'closing_commitment' as const, score: 75, recordedAt: '2025-03-10T00:00:00Z' },
      { skill: 'closing_commitment' as const, score: 65, recordedAt: '2025-03-18T00:00:00Z' },
      { skill: 'closing_commitment' as const, score: 60, recordedAt: '2025-03-22T00:00:00Z' },
    ];
    const negDeltas = computeSessionDeltas(['closing_commitment'], sessionDate, negObs);
    // pre avg = 77.5; post avg = 62.5; delta = -15
    expect(negDeltas[0].delta).toBeCloseTo(-15);
  });
});

describe('computeSummary — pure function', () => {
  it('7. correct totalSessions, avgDelta, bestSkill', () => {
    const sessions = [
      makeSession({ deltas: [
        { skill: 'discovery_questioning', skillLabel: 'Discovery & Questioning', delta: 10, preAvg: 60, postAvg: 70 },
        { skill: 'champion_building',     skillLabel: 'Champion Building',       delta: -2, preAvg: 65, postAvg: 63 },
      ]}),
      makeSession({ id: 'sess-2', repId: 'rep-2', repName: 'Bob', deltas: [
        { skill: 'discovery_questioning', skillLabel: 'Discovery & Questioning', delta: 6,  preAvg: 55, postAvg: 61 },
        { skill: 'champion_building',     skillLabel: 'Champion Building',       delta: 4,  preAvg: 58, postAvg: 62 },
      ]}),
    ];

    const summary = computeSummary(sessions);

    expect(summary.totalSessions).toBe(2);
    // allDeltas = [10, -2, 6, 4]; avg = 18/4 = 4.5
    expect(summary.avgDelta).toBeCloseTo(4.5);
    // discovery mean = (10+6)/2 = 8; champion mean = (-2+4)/2 = 1 → both positive
    expect(summary.skillsWithPositiveROI).toBe(2);
    // bestSkill = discovery_questioning (mean 8 > champion mean 1)
    expect(summary.bestSkill).toBe('discovery_questioning');
  });

  it('8. empty sessions → zeros and nulls', () => {
    const summary = computeSummary([]);
    expect(summary.totalSessions).toBe(0);
    expect(summary.avgDelta).toBeNull();
    expect(summary.skillsWithPositiveROI).toBe(0);
    expect(summary.bestSkill).toBeNull();
  });
});

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('CoachingROITracker — T9 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRepListQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it('9. skeleton renders while loading', async () => {
    mockUseCoachingROI.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('10. Log Session button visible; form hidden by default', async () => {
    mockUseCoachingROI.mockReturnValue({ data: { sessions: [], summary: computeSummary([]) }, isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByLabelText('Log coaching session')).toBeTruthy();
    // Form not yet open — rep selector should not be visible
    expect(screen.queryByLabelText(/Select rep…/i)).toBeNull();
  });

  it('11. form expands when Log Session is clicked', async () => {
    mockUseCoachingROI.mockReturnValue({ data: { sessions: [], summary: computeSummary([]) }, isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    fireEvent.click(screen.getByLabelText('Log coaching session'));

    // Rep label should now be visible inside the expanded form
    expect(screen.getByText(/Rep \*/i)).toBeTruthy();
  });

  it('12. empty timeline state renders when no sessions', async () => {
    mockUseCoachingROI.mockReturnValue({ data: { sessions: [], summary: computeSummary([]) }, isLoading: false });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(container.querySelector('[data-testid="timeline-empty"]')).toBeTruthy();
  });

  it('13. summary tiles show session count and avg delta', async () => {
    const sessions = [makeSession()];
    mockUseCoachingROI.mockReturnValue({
      data: {
        sessions,
        summary: {
          totalSessions: 1,
          avgDelta: 2.75,
          skillsWithPositiveROI: 1,
          bestSkill: 'discovery_questioning',
          bestSkillLabel: 'Discovery & Questioning',
          bestSkillDelta: 8.5,
        },
      },
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+2.8')).toBeTruthy(); // toFixed(1)
  });

  it('14. form submit calls logMutate with repId, skillFocus, sessionDate', async () => {
    mockUseCoachingROI.mockReturnValue({ data: { sessions: [], summary: computeSummary([]) }, isLoading: false });
    mockUseRepListQuery.mockReturnValue({
      data: [{ id: 'rep-abc', name: 'Jordan Lee' }],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Open form
    fireEvent.click(screen.getByLabelText('Log coaching session'));

    // Select rep
    const repSelect = screen.getByRole('combobox');
    fireEvent.change(repSelect, { target: { value: 'rep-abc' } });

    // Toggle one skill
    const skillCheckbox = screen.getByRole('checkbox', { name: 'Discovery & Questioning' });
    fireEvent.click(skillCheckbox);

    // Submit — use the button inside the form (not the header toggle button)
    const submitBtn = screen.getAllByText('Log Session').find(
      el => el.closest('button')?.getAttribute('aria-label') === null
    );
    fireEvent.click(submitBtn!);

    expect(logMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        repId:      'rep-abc',
        skillFocus: ['discovery_questioning'],
      }),
      expect.any(Object),
    );
  });
});
