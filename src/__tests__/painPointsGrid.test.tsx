/**
 * Smoke tests for PainPointsGrid (T6)
 *
 * Mocks usePainPoints directly. Tests are purely about component rendering
 * behaviour — Edge Function logic is tested separately in isolation.
 *
 * Covers:
 *   1. Skeleton renders while loading (4 skeleton cards)
 *   2. All 4 pain point card titles render
 *   3. Silence Aversion is greyed (opacity-50) and shows "Coming Soon" pill
 *   4. Critical card has coral left border
 *   5. Warning card has amber left border
 *   6. Positive/healthy card shows "All clear" rather than an impact %
 *   7. Impact % renders in coral for affected pain points
 *   8. "Awaiting first Engine run" notice when hasData = false
 *   9. Critical count in subtitle updates correctly
 *  10. Component renders cleanly with all-null data (Edge Function not run yet)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { PainPoint, InsightType } from '../hooks/usePainPoints';

// ── Mock the hook ─────────────────────────────────────────────────────────────

const mockUsePainPoints = vi.fn();

vi.mock('../hooks/usePainPoints', () => ({
  usePainPoints: (...args: unknown[]) => mockUsePainPoints(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePainPoint(type: InsightType, overrides: Partial<PainPoint> = {}): PainPoint {
  const isUnavailable = type === 'silence_aversion'
  return {
    insightType:       type,
    severity:          isUnavailable ? null : 'warning',
    impactPct:         isUnavailable ? null : 22,
    affectedRepIds:    isUnavailable ? [] : ['rep-1', 'rep-2'],
    insightData:       isUnavailable ? { data_unavailable: true } : { affected_count: 2, team_size: 9 },
    generatedAt:       isUnavailable ? null : '2025-03-17T02:00:00.000Z',
    hasData:           !isUnavailable,
    isDataUnavailable: isUnavailable,
    ...overrides,
  }
}

function makeAllPainPoints(overrides: Partial<Record<InsightType, Partial<PainPoint>>> = {}): PainPoint[] {
  const types: InsightType[] = [
    'objection_loop_failure',
    'low_discovery_depth',
    'silence_aversion',
    'training_drop_off',
  ]
  return types.map(t => makePainPoint(t, overrides[t] ?? {}))
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
    '../features/training-analytics/PainPointsGrid'
  );
  return Comp;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PainPointsGrid — T6 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. skeleton renders while loading', async () => {
    mockUsePainPoints.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText('Objection Loop Failure')).toBeNull();
  });

  it('2. all 4 pain point card titles render', async () => {
    mockUsePainPoints.mockReturnValue({ data: makeAllPainPoints(), isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('Objection Loop Failure')).toBeTruthy();
    expect(screen.getByText('Low Discovery Depth')).toBeTruthy();
    expect(screen.getByText('Silence Aversion')).toBeTruthy();
    expect(screen.getByText('Training Drop-Off')).toBeTruthy();
  });

  it('3. Silence Aversion card is greyed (opacity-50) and shows "Coming Soon" pill', async () => {
    mockUsePainPoints.mockReturnValue({ data: makeAllPainPoints(), isLoading: false });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // The card containing "Silence Aversion" should have opacity-50
    const silenceCard = container.querySelector('.opacity-50');
    expect(silenceCard).not.toBeNull();
    expect(screen.getByText('Coming Soon')).toBeTruthy();

    // The "Requires call audio analysis" text should appear
    expect(screen.getByText(/Requires call audio analysis/i)).toBeTruthy();
  });

  it('4. critical card has coral (#FF6B6B) left border', async () => {
    mockUsePainPoints.mockReturnValue({
      data: makeAllPainPoints({ objection_loop_failure: { severity: 'critical' } }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Find cards with coral left border
    const cards = container.querySelectorAll('[style*="border-left-color"]');
    const coralCards = [...cards].filter(c =>
      (c as HTMLElement).style.borderLeftColor === 'rgb(255, 107, 107)'
      || (c as HTMLElement).getAttribute('style')?.includes('#FF6B6B')
    );
    expect(coralCards.length).toBeGreaterThan(0);
  });

  it('5. warning card has amber (#F59E0B) left border color in style', async () => {
    mockUsePainPoints.mockReturnValue({
      data: makeAllPainPoints({ low_discovery_depth: { severity: 'warning' } }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // jsdom converts hex colors to rgb: #F59E0B → rgb(245, 158, 11)
    const cards = container.querySelectorAll('[style*="border-left"]');
    const amberCards = [...cards].filter(c => {
      const style = (c as HTMLElement).getAttribute('style') ?? ''
      return style.includes('rgb(245, 158, 11)') || style.includes('#F59E0B')
    });
    expect(amberCards.length).toBeGreaterThan(0);
  });

  it('6. positive severity shows "All clear" instead of an impact %', async () => {
    mockUsePainPoints.mockReturnValue({
      data: makeAllPainPoints({
        objection_loop_failure: { severity: 'positive', impactPct: 0, affectedRepIds: [], insightData: {} },
      }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('All clear')).toBeTruthy();
  });

  it('7. impact % renders for affected pain points', async () => {
    mockUsePainPoints.mockReturnValue({
      data: makeAllPainPoints({
        training_drop_off: { severity: 'critical', impactPct: 33, insightData: { affected_count: 3, team_size: 9 } },
      }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // 33% renders as "33" with a "%" suffix — both in the same Oswald element
    expect(screen.getByText('33')).toBeTruthy();
    // "% of team" text may appear on multiple cards — just confirm at least one
    expect(screen.getAllByText('of team').length).toBeGreaterThan(0);
  });

  it('8. "Awaiting first Engine run" notice when hasData = false', async () => {
    mockUsePainPoints.mockReturnValue({
      data: makeAllPainPoints({
        low_discovery_depth: {
          hasData:    false,
          severity:   null,
          impactPct:  null,
          generatedAt: null,
          insightData: {},
          isDataUnavailable: false,
        },
      }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Awaiting first Engine run/i)).toBeTruthy();
  });

  it('9. critical count in subtitle reflects actual critical pain points', async () => {
    mockUsePainPoints.mockReturnValue({
      data: makeAllPainPoints({
        objection_loop_failure: { severity: 'critical' },
        training_drop_off:      { severity: 'critical' },
      }),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/2 critical/i)).toBeTruthy();
  });

  it('10. renders without error when all pain points have null data (pre-Engine-run state)', async () => {
    const noData: PainPoint[] = [
      'objection_loop_failure', 'low_discovery_depth', 'silence_aversion', 'training_drop_off',
    ].map(type => ({
      insightType:       type as InsightType,
      severity:          null,
      impactPct:         null,
      affectedRepIds:    [],
      insightData:       type === 'silence_aversion' ? { data_unavailable: true } : {},
      generatedAt:       null,
      hasData:           false,
      isDataUnavailable: type === 'silence_aversion',
    }))

    mockUsePainPoints.mockReturnValue({ data: noData, isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // All 4 titles still render
    expect(screen.getByText('Objection Loop Failure')).toBeTruthy();
    expect(screen.getByText('Silence Aversion')).toBeTruthy();

    // "Awaiting" notice appears for non-unavailable types (not silence_aversion)
    const awaitingEls = screen.getAllByText(/Awaiting first Engine run/i);
    expect(awaitingEls.length).toBe(3);  // 3 types (not silence_aversion)
  });
});
