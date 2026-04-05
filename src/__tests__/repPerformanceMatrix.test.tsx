/**
 * Smoke tests for RepPerformanceMatrix (T3) and computeStatus
 *
 * Covers:
 *   1. computeStatus — all threshold boundaries
 *   2. computeStatus — Critical via low call score
 *   3. computeStatus — null gap = No Data; null callAvg alone ≠ Critical
 *   4. Component renders rep names and status pills from mock data
 *   5. Critical rows appear before Watch rows (sort order)
 *   6. Skeleton renders while loading
 *   7. Empty state renders when rep list is empty
 *   8. "N critical" badge appears when criticalCount > 0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { computeStatus } from '../hooks/useRepPerformanceMatrix';
import type { RepMatrixRow } from '../hooks/useRepPerformanceMatrix';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseRepPerformanceMatrix = vi.fn();
const mockUseTeamSkillCompetency  = vi.fn();

vi.mock('../hooks/useRepPerformanceMatrix', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/useRepPerformanceMatrix')>();
  return {
    ...original,   // keeps computeStatus (pure function, not mocked)
    useRepPerformanceMatrix: (...args: unknown[]) => mockUseRepPerformanceMatrix(...args),
  };
});

vi.mock('../hooks/useTeamSkillCompetency', () => ({
  useTeamSkillCompetency: (...args: unknown[]) => mockUseTeamSkillCompetency(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRep(overrides: Partial<RepMatrixRow>): RepMatrixRow {
  return {
    repId:              'rep-1',
    repName:            'Test Rep',
    trainingAvg:        75,
    callAvg:            55,
    transferGap:        20,
    status:             'Watch',
    knowledgeDecay:     false,
    pressureRegression: false,
    snapshotDate:       '2025-12-01',
    liveCalls:          5,
    trainingSessions:   8,
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
    '../features/training-analytics/RepPerformanceMatrix'
  );
  return Comp;
}

// ── Unit tests for computeStatus (pure, no render needed) ─────────────────────

describe('computeStatus — threshold logic', () => {
  it('1a. gap < 10 → Strong', () => {
    expect(computeStatus(9, 60)).toBe('Strong');
    expect(computeStatus(0, 80)).toBe('Strong');
  });

  it('1b. gap 10–17.9 → Watch', () => {
    expect(computeStatus(10, 60)).toBe('Watch');
    expect(computeStatus(17, 60)).toBe('Watch');
  });

  it('1c. gap 18–25 → At Risk', () => {
    expect(computeStatus(18, 60)).toBe('At Risk');
    expect(computeStatus(25, 60)).toBe('At Risk');
  });

  it('1d. gap > 25 → Critical', () => {
    expect(computeStatus(26, 60)).toBe('Critical');
    expect(computeStatus(50, 80)).toBe('Critical');
  });

  it('2. callAvg < 40 → Critical regardless of gap', () => {
    expect(computeStatus(5, 39)).toBe('Critical');   // Strong gap but low call score
    expect(computeStatus(15, 35)).toBe('Critical');  // Watch gap but low call score
  });

  it('3a. gap = null → No Data', () => {
    expect(computeStatus(null, 60)).toBe('No Data');
  });

  it('3b. null callAvg alone does NOT trigger Critical', () => {
    // gap = 5 (Strong), callAvg = null (no live calls) → still Strong, not Critical
    expect(computeStatus(5, null)).toBe('Strong');
    expect(computeStatus(15, null)).toBe('Watch');
  });

  it('3c. both null → No Data', () => {
    expect(computeStatus(null, null)).toBe('No Data');
  });
});

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('RepPerformanceMatrix — T3 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamSkillCompetency.mockReturnValue({ data: [], isLoading: false });
  });

  it('4. renders rep names and status pills', async () => {
    mockUseRepPerformanceMatrix.mockReturnValue({
      data: [
        makeRep({ repId: 'r1', repName: 'Alice Chen',  status: 'Strong',  transferGap: 5  }),
        makeRep({ repId: 'r2', repName: 'Marcus Webb', status: 'Watch',   transferGap: 14 }),
        makeRep({ repId: 'r3', repName: 'Dan Kowalski', status: 'Critical', transferGap: 28 }),
      ],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('Alice Chen')).toBeTruthy();
    expect(screen.getByText('Marcus Webb')).toBeTruthy();
    expect(screen.getByText('Dan Kowalski')).toBeTruthy();
    expect(screen.getByText('Strong')).toBeTruthy();
    expect(screen.getByText('Watch')).toBeTruthy();
    expect(screen.getByText('Critical')).toBeTruthy();
  });

  it('5. Critical rep appears before Watch rep in rendered order', async () => {
    // Data already pre-sorted by the hook (by STATUS_ORDER) — component renders in array order.
    // We verify the hook-sorted order is reflected in DOM position.
    mockUseRepPerformanceMatrix.mockReturnValue({
      data: [
        makeRep({ repId: 'r1', repName: 'Dan Kowalski', status: 'Critical', transferGap: 28 }),
        makeRep({ repId: 'r2', repName: 'Alice Chen',   status: 'Watch',    transferGap: 14 }),
      ],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const names = screen.getAllByText(/Dan Kowalski|Alice Chen/);
    expect(names[0].textContent).toBe('Dan Kowalski');
    expect(names[1].textContent).toBe('Alice Chen');
  });

  it('6. skeleton renders while loading', async () => {
    mockUseRepPerformanceMatrix.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Chen')).toBeNull();
  });

  it('7. empty state renders when rep list is empty', async () => {
    mockUseRepPerformanceMatrix.mockReturnValue({ data: [], isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/No rep data yet/i)).toBeTruthy();
  });

  it('8. "N critical" badge appears when criticalCount > 0', async () => {
    mockUseRepPerformanceMatrix.mockReturnValue({
      data: [
        makeRep({ repId: 'r1', repName: 'Dan K', status: 'Critical', transferGap: 30 }),
        makeRep({ repId: 'r2', repName: 'Sara L', status: 'Critical', transferGap: 27 }),
      ],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('2 critical')).toBeTruthy();
  });
});
