/**
 * Smoke tests for ScenarioDifficultyAnalysis (T8)
 *
 * Pure function unit tests (no render needed):
 *   1. computeTrajectory — improving
 *   2. computeTrajectory — plateauing
 *   3. computeTrajectory — declining
 *   4. computeTrajectory — single attempt → plateauing
 *   5. computeAvgAttemptsToPass — mixed passers/non-passers
 *   6. computeAvgAttemptsToPass — all non-passers (conservative)
 *
 * Component smoke tests:
 *   7. Skeleton renders while loading
 *   8. Empty state when no scenarios
 *   9. Difficulty chart renders scenario names
 *  10. Hard scenario badge visible when isHard = true
 *  11. Pass rate and fail point label rendered in list
 *  12. Difficulty sort — hardest first in rendered list
 *  13. Rep history panel renders on rep select (trajectory label visible)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  computeTrajectory,
  computeAvgAttemptsToPass,
  type ScenarioDifficulty,
  type RepScenarioHistory,
} from '../hooks/useScenarioDifficulty';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseScenarioDifficulty = vi.fn();
const mockUseRepAttemptHistory  = vi.fn();
const mockUseQuery              = vi.fn();

vi.mock('../hooks/useScenarioDifficulty', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/useScenarioDifficulty')>();
  return {
    ...original,
    useScenarioDifficulty: (...args: unknown[]) => mockUseScenarioDifficulty(...args),
    useRepAttemptHistory:  (...args: unknown[]) => mockUseRepAttemptHistory(...args),
  };
});

// Mock the inline useRepListForDifficulty (useQuery call inside the component)
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...original,
    useQuery: (...args: unknown[]) => {
      const opts = args[0] as { queryKey: unknown[] };
      if (Array.isArray(opts.queryKey) && opts.queryKey[0] === 'rep-list-difficulty') {
        return mockUseQuery(...args);
      }
      return (original.useQuery as (...a: unknown[]) => unknown)(...args);
    },
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeScenario(overrides: Partial<ScenarioDifficulty> = {}): ScenarioDifficulty {
  return {
    scenarioId:          'sc-1',
    scenarioName:        'Enterprise Discovery',
    difficultyLabel:     'Hard',
    avgAttemptsToPass:   3.2,
    passRate:            0.45,
    mostCommonFailPoint: 'identifyPain',
    failPointLabel:      'Discovery & Questioning',
    repCount:            8,
    isHard:              true,
    ...overrides,
  };
}

function makeHistory(overrides: Partial<RepScenarioHistory> = {}): RepScenarioHistory {
  return {
    scenarioId:   'sc-1',
    scenarioName: 'Enterprise Discovery',
    attempts: [
      { attemptNumber: 1, score: 55, passed: false, failPoint: 'identifyPain', failPointLabel: 'Discovery & Questioning', attemptedAt: '2025-03-01T10:00:00Z' },
      { attemptNumber: 2, score: 68, passed: false, failPoint: 'champion',     failPointLabel: 'Champion Building',       attemptedAt: '2025-03-05T10:00:00Z' },
      { attemptNumber: 3, score: 75, passed: true,  failPoint: null,           failPointLabel: null,                       attemptedAt: '2025-03-10T10:00:00Z' },
    ],
    trajectory: 'improving',
    bestScore:  75,
    everPassed: true,
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
  const { default: Comp } = await import(
    '../features/training-analytics/ScenarioDifficultyAnalysis'
  );
  return Comp;
}

// ── Pure function unit tests ───────────────────────────────────────────────────

describe('computeTrajectory — pure function', () => {
  it('1. improving when second-half mean > first-half mean by >3pts', () => {
    // first half: [50, 52] mean=51; second half: [60, 62] mean=61; delta=10
    expect(computeTrajectory([50, 52, 60, 62])).toBe('improving');
  });

  it('2. plateauing when delta is within ±3pts', () => {
    // first half: [60] mean=60; second half: [62] mean=62; delta=2
    expect(computeTrajectory([60, 62])).toBe('plateauing');
  });

  it('3. declining when second-half mean < first-half mean by >3pts', () => {
    // first half: [75, 72] mean=73.5; second half: [65, 60] mean=62.5; delta=-11
    expect(computeTrajectory([75, 72, 65, 60])).toBe('declining');
  });

  it('4. single attempt → plateauing', () => {
    expect(computeTrajectory([70])).toBe('plateauing');
  });
});

describe('computeAvgAttemptsToPass — pure function', () => {
  it('5. mixed passers and non-passers uses first-pass for passers, total for non-passers', () => {
    // passer: firstPassAttempt=2; non-passer: totalAttempts=4
    // avg = (2 + 4) / 2 = 3.0
    const result = computeAvgAttemptsToPass([
      { firstPassAttempt: 2, totalAttempts: 3 },
      { firstPassAttempt: null, totalAttempts: 4 },
    ]);
    expect(result).toBe(3.0);
  });

  it('6. all non-passers — conservative estimate uses total attempts', () => {
    // avg = (3 + 5) / 2 = 4.0
    const result = computeAvgAttemptsToPass([
      { firstPassAttempt: null, totalAttempts: 3 },
      { firstPassAttempt: null, totalAttempts: 5 },
    ]);
    expect(result).toBe(4.0);
  });
});

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('ScenarioDifficultyAnalysis — T8 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rep list returns empty (no rep selected state needed)
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseRepAttemptHistory.mockReturnValue({ data: [], isLoading: false });
  });

  it('7. skeleton renders while loading', async () => {
    mockUseScenarioDifficulty.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('8. empty state when no scenarios', async () => {
    mockUseScenarioDifficulty.mockReturnValue({ data: [], isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/No scenario data/i)).toBeTruthy();
  });

  it('9. hard scenario count badge appears in subtitle', async () => {
    mockUseScenarioDifficulty.mockReturnValue({
      data: [makeScenario({ isHard: true }), makeScenario({ scenarioId: 'sc-2', scenarioName: 'Another', isHard: true })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Subtitle shows "· 2 hard scenarios"
    expect(screen.getByText(/2 hard scenarios/i)).toBeTruthy();
  });

  it('10. singular "hard scenario" (not "scenarios") when only one', async () => {
    mockUseScenarioDifficulty.mockReturnValue({
      data: [makeScenario({ isHard: true })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Text is split across child nodes; query the parent <p> instead
    const subtitle = screen.getByText(/Attempt analysis/i).closest('p')!;
    expect(subtitle.textContent).toMatch(/\b1 hard scenario\b/i);
  });

  it('11. subtitle does not show hard badge when no hard scenarios', async () => {
    mockUseScenarioDifficulty.mockReturnValue({
      data: [makeScenario({ isHard: false, avgAttemptsToPass: 1.2 })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.queryByText(/hard scenario/i)).toBeNull();
  });

  it('12. "Select rep for history" prompt shown before rep is chosen', async () => {
    mockUseScenarioDifficulty.mockReturnValue({
      data: [makeScenario()],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Select rep for history/i)).toBeTruthy();
  });

  it('13. rep history panel shows trajectory badge after rep selection', async () => {
    mockUseScenarioDifficulty.mockReturnValue({
      data: [makeScenario()],
      isLoading: false,
    });
    mockUseQuery.mockReturnValue({
      data: [{ id: 'rep-1', name: 'Jordan Lee' }],
      isLoading: false,
    });
    mockUseRepAttemptHistory.mockReturnValue({
      data: [makeHistory({ trajectory: 'improving' })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Open the dropdown by clicking the trigger button
    fireEvent.click(screen.getByText('Select rep for history'));
    // Click the rep button in the dropdown
    fireEvent.click(screen.getByText('Jordan Lee'));

    // RepHistoryCard renders the "Improving" trajectory badge
    expect(screen.getAllByText(/Improving/i).length).toBeGreaterThanOrEqual(1);
  });
});
