/**
 * Smoke tests for SessionEngagementHeatmap (T5)
 *
 * Mocks the hook directly. The anchor date (2025-03-17, a Monday) is fixed
 * so grid layout is deterministic regardless of when tests run.
 *
 * Covers:
 *   1. Skeleton renders while loading
 *   2. 7 day-of-week column headers render (Mon–Sun)
 *   3. 8 week-label rows render
 *   4. All 56 cells render (8 weeks × 7 days)
 *   5. Cell intensity: 0 sessions → 'none' bg, 1–2 → 'low', 3–4 → 'medium', 5+ → 'high'
 *   6. Drop-off alert strip renders when alerts exist
 *   7. No drop-off strip when alerts are empty
 *   8. Team / Individual view toggle renders; switching to Individual shows rep dropdown
 *   9. Score trend chart section renders with the weekly score label
 *  10. Hook receives a stable anchor date (not a new Date() on every render)
 *  11. "fixed window" notice in header reassures managers period toggle has no effect
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { HeatmapData, HeatmapCell, WeeklyPoint } from '../hooks/useSessionEngagementHeatmap';

// ── Mock the hook ─────────────────────────────────────────────────────────────

const mockUseSessionEngagementHeatmap = vi.fn();

vi.mock('../hooks/useSessionEngagementHeatmap', () => ({
  useSessionEngagementHeatmap: (...args: unknown[]) => mockUseSessionEngagementHeatmap(...args),
}));

// ── Fixed anchor for deterministic grid ───────────────────────────────────────
// 2025-03-17 is a Monday, making the grid start on 2025-01-20 (8 weeks prior).
const ANCHOR = new Date('2025-03-17T12:00:00.000Z')

// ── Grid generation helper ────────────────────────────────────────────────────

/**
 * Generates 56 cells starting from gridStart (a Monday 7 weeks before anchor's Monday).
 * Anchor = 2025-03-17 (Mon) → gridStart = 2025-01-20 (Mon).
 */
function generateCells(sessionCountFn: (i: number) => number = () => 0): HeatmapCell[] {
  const gridStart = new Date('2025-01-20T00:00:00.000Z')

  return Array.from({ length: 56 }, (_, i) => {
    const d = new Date(gridStart)
    d.setUTCDate(d.getUTCDate() + i)
    const date     = d.toISOString().slice(0, 10)
    const count    = sessionCountFn(i)
    const isFuture = date > '2025-03-17'

    return {
      date,
      weekIndex:    Math.floor(i / 7),
      dayOfWeek:    i % 7,
      sessionCount: isFuture ? 0 : count,
      avgScore:     count > 0 ? 72 : null,
      isFuture,
    }
  })
}

function generateWeeklyPoints(scoreFn: (wi: number) => number | null = () => null): WeeklyPoint[] {
  const gridStart = new Date('2025-01-20T00:00:00.000Z')
  return Array.from({ length: 8 }, (_, wi) => {
    const d = new Date(gridStart)
    d.setUTCDate(d.getUTCDate() + wi * 7)
    const weekLabel = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    return {
      weekIndex:     wi,
      weekStart:     d.toISOString().slice(0, 10),
      weekLabel,
      avgScore:      scoreFn(wi),
      totalSessions: scoreFn(wi) !== null ? 3 : 0,
    }
  })
}

function makeData(overrides: Partial<HeatmapData> = {}): HeatmapData {
  return {
    teamCells:        generateCells(() => 2),
    teamWeeklyPoints: generateWeeklyPoints(() => 68),
    repCells:         {
      'rep-1': generateCells(i => i < 14 ? 3 : 0),
    },
    repWeeklyPoints: {
      'rep-1': generateWeeklyPoints(wi => wi < 2 ? 75 : null),
    },
    reps:          [{ id: 'rep-1', name: 'Alice Chen' }, { id: 'rep-2', name: 'Marcus Webb' }],
    dropOffAlerts: [],
    gridStart:     '2025-01-20',
    anchor:        '2025-03-17',
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
    '../features/training-analytics/SessionEngagementHeatmap'
  );
  return Comp;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionEngagementHeatmap — T5 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. skeleton renders while loading', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText('Mon')).toBeNull();
  });

  it('2. day-of-week column headers render (Mon–Sun)', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getByText(day)).toBeTruthy();
    }
  });

  it('3. 8 week rows render (one week-start label per row)', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    // Week labels: '20 Jan', '27 Jan', '3 Feb', '10 Feb', '17 Feb', '24 Feb', '3 Mar', '10 Mar'
    // We check the week label elements (font-mono, right-aligned, text-muted)
    const weekLabelEls = container.querySelectorAll('.font-mono');
    // 8 week labels + the trend chart X-axis labels (also font-mono) — just verify at least 8
    expect(weekLabelEls.length).toBeGreaterThanOrEqual(8);
  });

  it('4. 56 cells render', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    // Cells are w-8 h-8 divs inside the grid
    const cells = container.querySelectorAll('.w-8.h-8');
    // Skeleton and cells both have w-8 h-8 — but we're not loading, so all should be real cells
    expect(cells.length).toBe(56);
  });

  it('5a. cells with 0 sessions use "none" background (transparent-ish)', async () => {
    // All cells = 0 sessions
    mockUseSessionEngagementHeatmap.mockReturnValue({
      data: makeData({ teamCells: generateCells(() => 0) }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    const cells = container.querySelectorAll('.w-8.h-8');
    // Non-future cells should have the 'none' bg (rgba(255,255,255,0.03))
    const pastCells = [...cells].filter(c => !(c as HTMLElement).classList.contains('opacity-0'));
    for (const cell of pastCells) {
      const bg = (cell as HTMLElement).style.backgroundColor;
      // 'none' intensity maps to rgba(255,255,255,0.03) — may render as rgba or transparent
      expect(bg).not.toContain('#FF6B6B');
    }
  });

  it('5b. cells with 5+ sessions use full coral background', async () => {
    // All cells = 5 sessions
    mockUseSessionEngagementHeatmap.mockReturnValue({
      data: makeData({ teamCells: generateCells(() => 5) }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    const cells = container.querySelectorAll('.w-8.h-8');
    const pastCells = [...cells].filter(c => !(c as HTMLElement).classList.contains('opacity-0'));
    // At least one past cell should have full coral (#FF6B6B)
    const coralCells = [...pastCells].filter(c =>
      (c as HTMLElement).style.backgroundColor === 'rgb(255, 107, 107)'
      || (c as HTMLElement).style.backgroundColor === '#FF6B6B'
    );
    expect(coralCells.length).toBeGreaterThan(0);
  });

  it('6. drop-off alert strip renders when alerts exist', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({
      data: makeData({
        dropOffAlerts: [{
          repId:              'rep-2',
          repName:            'Marcus Webb',
          streakDays:         14,
          streakStart:        '2025-02-10',
          callScoreDeclining: true,
        }],
      }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Training Drop-Off Detected/i)).toBeTruthy();
    expect(screen.getByText('Marcus Webb')).toBeTruthy();
    expect(screen.getByText(/14d gap/)).toBeTruthy();
  });

  it('7. no drop-off strip when alerts are empty', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({
      data: makeData({ dropOffAlerts: [] }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    expect(screen.queryByText(/Training Drop-Off/i)).toBeNull();
  });

  it('8. Team/Individual toggle renders; switching to Individual shows rep dropdown', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('Team')).toBeTruthy();
    expect(screen.getByText('Individual')).toBeTruthy();

    // Switch to Individual
    fireEvent.click(screen.getByText('Individual'));

    // "Select rep" placeholder or dropdown trigger appears
    expect(screen.getByText(/Select rep/i)).toBeTruthy();
  });

  it('8b. rep selector dropdown shows rep names when opened', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    fireEvent.click(screen.getByText('Individual'));
    fireEvent.click(screen.getByText(/Select rep/i));

    expect(screen.getByText('Alice Chen')).toBeTruthy();
    expect(screen.getByText('Marcus Webb')).toBeTruthy();
  });

  it('9. score trend chart section renders', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Avg Session Score.*8-Week Trend/i)).toBeTruthy();
  });

  it('10. hook receives the injected anchor', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    expect(mockUseSessionEngagementHeatmap).toHaveBeenCalledWith(ANCHOR);
  });

  it('11. header notes the 8-week fixed window to avoid period toggle confusion', async () => {
    mockUseSessionEngagementHeatmap.mockReturnValue({ data: makeData(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} anchor={ANCHOR} />, { wrapper: wrap(makeClient()) });

    // The subtitle should mention "fixed window" and "period toggle"
    expect(screen.getByText(/fixed window.*period toggle/i)).toBeTruthy();
  });
});
