/**
 * Smoke tests for RoleReadinessScores (T10)
 *
 * Pure function unit tests (no render):
 *   1.  assignBand — all four band thresholds
 *   2.  buildFactorBreakdowns — null factor defaults to 50 neutral (not 0)
 *   3.  buildFactorBreakdowns — contributions = inputScore * weight
 *   4.  findDragFactor — lowest inputScore factor identified
 *   5.  findDragFactor — returns null when all factors are 100
 *   6.  buildRepReadiness — score + sorted factors populated correctly
 *
 * Component smoke tests:
 *   7.  Skeleton renders while loading
 *   8.  Empty leaderboard state when no reps
 *   9.  Team leaderboard renders reps sorted highest score first
 *  10.  Drag factor label visible on leaderboard row
 *  11.  SVG arc strokeDashoffset computed correctly for a given percentage
 *  12.  Clicking a rep row switches to Individual Detail view
 *  13.  Individual Detail shows factor breakdown with drag factor highlighted
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  assignBand,
  buildFactorBreakdowns,
  findDragFactor,
  buildRepReadiness,
  READINESS_WEIGHTS,
  type RepReadiness,
} from '../hooks/useRoleReadiness';
import { CircularArc } from '../features/training-analytics/RoleReadinessScores';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseRoleReadiness    = vi.fn();
const mockUseRepRoleReadiness = vi.fn();

vi.mock('../hooks/useRoleReadiness', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/useRoleReadiness')>();
  return {
    ...original,
    useRoleReadiness:    (...args: unknown[]) => mockUseRoleReadiness(...args),
    useRepRoleReadiness: (...args: unknown[]) => mockUseRepRoleReadiness(...args),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRep(overrides: Partial<RepReadiness> = {}): RepReadiness {
  const factors = buildFactorBreakdowns({
    skill_avg:         75,
    gap_inverted:      60,
    call_score_trend:  50,
    session_frequency: 80,
    retention_rate:    70,
  });
  return {
    repId:        'rep-1',
    repName:      'Alice Chen',
    score:        68.5,
    band:         'Ready',
    factors,
    dragFactor:   factors.find(f => f.key === 'call_score_trend') ?? null,
    snapshotDate: '2025-03-20',
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
  const { default: Comp } = await import('../features/training-analytics/RoleReadinessScores');
  return Comp;
}

// ── Pure function unit tests ──────────────────────────────────────────────────

describe('assignBand — pure function', () => {
  it('1. assigns all four bands at correct thresholds', () => {
    expect(assignBand(39)).toBe('Not Ready');
    expect(assignBand(40)).toBe('Developing');
    expect(assignBand(59)).toBe('Developing');
    expect(assignBand(60)).toBe('Ready');
    expect(assignBand(79)).toBe('Ready');
    expect(assignBand(80)).toBe('Exceptional');
    expect(assignBand(100)).toBe('Exceptional');
  });
});

describe('buildFactorBreakdowns — pure function', () => {
  it('2. null factor value defaults to 50 neutral (not 0)', () => {
    const breakdowns = buildFactorBreakdowns({
      skill_avg:         80,
      gap_inverted:      null as unknown as number,  // null input
      call_score_trend:  50,
      session_frequency: 70,
      // retention_rate missing entirely
    });
    const gap       = breakdowns.find(f => f.key === 'gap_inverted')!;
    const retention = breakdowns.find(f => f.key === 'retention_rate')!;
    expect(gap.inputScore).toBe(50);
    expect(retention.inputScore).toBe(50);
  });

  it('3. each factor contribution equals inputScore × weight', () => {
    const breakdowns = buildFactorBreakdowns({
      skill_avg: 80, gap_inverted: 60, call_score_trend: 100,
      session_frequency: 50, retention_rate: 70,
    });
    for (const f of breakdowns) {
      expect(f.contribution).toBeCloseTo(f.inputScore * f.weight);
    }
    // Weights must sum to 1.0
    const totalWeight = Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });
});

describe('findDragFactor — pure function', () => {
  it('4. identifies the factor with the lowest inputScore', () => {
    const breakdowns = buildFactorBreakdowns({
      skill_avg: 80, gap_inverted: 70, call_score_trend: 40,
      session_frequency: 90, retention_rate: 75,
    });
    const drag = findDragFactor(breakdowns);
    expect(drag?.key).toBe('call_score_trend');
    expect(drag?.inputScore).toBe(40);
  });

  it('5. returns null when all factors are at 100', () => {
    const perfect = buildFactorBreakdowns({
      skill_avg: 100, gap_inverted: 100, call_score_trend: 100,
      session_frequency: 100, retention_rate: 100,
    });
    expect(findDragFactor(perfect)).toBeNull();
  });
});

describe('buildRepReadiness — pure function', () => {
  it('6. populates score, band, factors and dragFactor correctly', () => {
    const rep = buildRepReadiness(
      'rep-x', 'Jordan Lee',
      68.0, 'Ready',
      // gap_inverted=30 is the clear minimum
      { skill_avg: 80, gap_inverted: 30, call_score_trend: 50, session_frequency: 90, retention_rate: 70 },
      '2025-03-15',
    );
    expect(rep.repName).toBe('Jordan Lee');
    expect(rep.score).toBe(68.0);
    expect(rep.band).toBe('Ready');
    expect(rep.factors).toHaveLength(5);
    // gap_inverted (30) is the clear lowest → drag factor
    expect(rep.dragFactor?.key).toBe('gap_inverted');
  });
});

// ── SVG arc unit test ─────────────────────────────────────────────────────────

describe('CircularArc — SVG arc computation', () => {
  it('11. strokeDashoffset is circ * (1 - pct/100)', () => {
    const { container } = render(<CircularArc pct={75} color="#10B981" />);
    const arc = container.querySelector('[data-testid="arc-foreground"]') as SVGCircleElement;
    expect(arc).not.toBeNull();

    const circ   = parseFloat(arc.getAttribute('data-circ')!);
    const offset = parseFloat(arc.getAttribute('data-offset')!);
    expect(offset).toBeCloseTo(circ * (1 - 75 / 100), 3);
  });
});

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('RoleReadinessScores — T10 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRepRoleReadiness.mockReturnValue({ data: null, isLoading: false });
  });

  it('7. skeleton renders while loading', async () => {
    mockUseRoleReadiness.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('8. empty leaderboard state when no reps', async () => {
    mockUseRoleReadiness.mockReturnValue({ data: [], isLoading: false });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(container.querySelector('[data-testid="leaderboard-empty"]')).toBeTruthy();
  });

  it('9. team leaderboard renders reps sorted highest score first', async () => {
    // Hook returns pre-sorted (highest first); component must preserve order
    const reps = [
      makeRep({ repId: 'r1', repName: 'Alice Chen',  score: 82, band: 'Exceptional' }),
      makeRep({ repId: 'r2', repName: 'Marcus Webb',  score: 65, band: 'Ready' }),
      makeRep({ repId: 'r3', repName: 'Jordan Lee',   score: 38, band: 'Not Ready' }),
    ];
    mockUseRoleReadiness.mockReturnValue({ data: reps, isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const list = screen.getAllByText(/Alice Chen|Marcus Webb|Jordan Lee/);
    expect(list[0].textContent).toContain('Alice Chen');
    expect(list[1].textContent).toContain('Marcus Webb');
    expect(list[2].textContent).toContain('Jordan Lee');
  });

  it('10. drag factor label visible on leaderboard row for non-Exceptional reps', async () => {
    const factors = buildFactorBreakdowns({
      skill_avg: 80, gap_inverted: 40, call_score_trend: 50,
      session_frequency: 70, retention_rate: 60,
    });
    const drag = findDragFactor(factors);
    const reps = [makeRep({
      repId: 'r1', repName: 'Alice Chen', score: 65, band: 'Ready',
      factors, dragFactor: drag,
    })];
    mockUseRoleReadiness.mockReturnValue({ data: reps, isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Drag factor label appears in the row
    expect(screen.getByText(/Transfer Gap/i)).toBeTruthy();
  });

  it('12. clicking a rep row switches to Individual Detail view', async () => {
    const reps = [makeRep({ repId: 'rep-detail-1', repName: 'Alice Chen', score: 72, band: 'Ready' })];
    mockUseRoleReadiness.mockReturnValue({ data: reps, isLoading: false });
    mockUseRepRoleReadiness.mockReturnValue({
      data: makeRep({ repId: 'rep-detail-1', repName: 'Alice Chen' }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    fireEvent.click(screen.getByText('Alice Chen'));

    // Individual detail view should show "Factor Breakdown" heading
    expect(screen.getByText('Factor Breakdown')).toBeTruthy();
  });

  it('13. individual detail shows drag factor highlighted', async () => {
    const factors = buildFactorBreakdowns({
      skill_avg: 80, gap_inverted: 35, call_score_trend: 50,
      session_frequency: 70, retention_rate: 60,
    });
    const drag = findDragFactor(factors)!;
    const rep  = makeRep({
      repId: 'rep-z', repName: 'Alice Chen',
      score: 63, band: 'Ready',
      factors, dragFactor: drag,
    });

    mockUseRoleReadiness.mockReturnValue({ data: [rep], isLoading: false });
    mockUseRepRoleReadiness.mockReturnValue({ data: rep, isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Open detail
    fireEvent.click(screen.getByText('Alice Chen'));

    // Drag factor label in the detail header
    const dragEl = document.querySelector('[data-testid="detail-drag-factor"]');
    expect(dragEl).not.toBeNull();
    expect(dragEl!.textContent).toMatch(/Transfer Gap/i);
  });
});
