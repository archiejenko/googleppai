/**
 * Smoke tests for CoachingQueue (T7 — manager surface)
 *
 * Mocks useCoachingTriggers, useResolveTrigger, useSnoozeTrigger directly.
 *
 * Covers:
 *   1. Skeleton renders while loading
 *   2. Empty state renders when queue is clear
 *   3. Trigger cards render with rep name, trigger type label, and description
 *   4. Critical triggers have coral left border
 *   5. Warning triggers have amber left border
 *   6. Critical count badge renders in the header when criticals exist
 *   7. Resolve button calls resolveMutate with the trigger id
 *   8. Snooze button calls snoozeMutate with the trigger id
 *   9. "Assign Module" button is disabled (stub until T9/T10)
 *  10. skill_decay trigger description includes the skill name and drop pts
 *  11. live_score_drop trigger description includes drop pts
 *  12. gap_widening trigger description includes widening pts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { CoachingTrigger, TriggerType, TriggerSeverity } from '../hooks/useCoachingTriggers';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseCoachingTriggers = vi.fn();
const resolveMutate = vi.fn();
const snoozeMutate  = vi.fn();

vi.mock('../hooks/useCoachingTriggers', () => ({
  useCoachingTriggers:  (...args: unknown[]) => mockUseCoachingTriggers(...args),
  useResolveTrigger:    () => ({ mutate: resolveMutate, isPending: false }),
  useSnoozeTrigger:     () => ({ mutate: snoozeMutate,  isPending: false }),
  TRIGGER_TYPE_LABELS: {
    skill_decay:         'Skill Decay',
    live_score_drop:     'Live Score Drop',
    gap_widening:        'Gap Widening',
    low_commitment_rate: 'Low Commitment Rate',
    deal_risk:           'Deal Risk',
  },
  SKILL_LABELS: {
    meddic_qualification:  'MEDDIC Qualification',
    champion_building:     'Champion Building',
    discovery_questioning: 'Discovery & Questioning',
    value_articulation:    'Value Articulation',
    active_listening:      'Active Listening',
    closing_commitment:    'Closing & Commitment',
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTrigger(overrides: Partial<CoachingTrigger> = {}): CoachingTrigger {
  return {
    id:                  'trig-1',
    orgId:               'org-1',
    repId:               'rep-1',
    repName:             'Alice Chen',
    managerId:           'mgr-1',
    triggerType:         'skill_decay' as TriggerType,
    skillName:           'meddic_qualification',
    severity:            'critical' as TriggerSeverity,
    triggerData:         { drop_pts: 22, day0_score: 78, day30_score: 56 },
    recommendedModuleId: null,
    createdAt:           new Date(Date.now() - 2 * 3_600_000).toISOString(),
    resolvedAt:          null,
    snoozedUntil:        null,
    isSnoozed:           false,
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
    '../features/training-analytics/CoachingQueue'
  );
  return Comp;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CoachingQueue — T7 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. skeleton renders while loading', async () => {
    mockUseCoachingTriggers.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Chen')).toBeNull();
  });

  it('2. empty state renders when queue is clear', async () => {
    mockUseCoachingTriggers.mockReturnValue({ data: [], isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Queue is clear/i)).toBeTruthy();
  });

  it('3. trigger card renders rep name and trigger type label', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger()],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('Alice Chen')).toBeTruthy();
    // "Skill Decay" appears in both the card badge and the footer legend
    expect(screen.getAllByText('Skill Decay').length).toBeGreaterThanOrEqual(1);
  });

  it('4. critical trigger card has coral (#FF6B6B) left border', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger({ severity: 'critical' })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Cards with coral border
    const cards = container.querySelectorAll('[style*="border-left"]');
    const coralCards = [...cards].filter(c =>
      (c as HTMLElement).getAttribute('style')?.includes('rgb(255, 107, 107)')
      || (c as HTMLElement).getAttribute('style')?.includes('#FF6B6B')
    );
    expect(coralCards.length).toBeGreaterThan(0);
  });

  it('5. warning trigger card has amber (#F59E0B) left border', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger({ severity: 'warning', triggerType: 'gap_widening', skillName: null })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const cards = container.querySelectorAll('[style*="border-left"]');
    const amberCards = [...cards].filter(c => {
      const s = (c as HTMLElement).getAttribute('style') ?? ''
      return s.includes('rgb(245, 158, 11)') || s.includes('#F59E0B')
    });
    expect(amberCards.length).toBeGreaterThan(0);
  });

  it('6. critical count badge renders in header', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [
        makeTrigger({ id: 't1', severity: 'critical' }),
        makeTrigger({ id: 't2', severity: 'critical', repName: 'Marcus Webb' }),
        makeTrigger({ id: 't3', severity: 'warning',  repName: 'Dan K' }),
      ],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('2 critical')).toBeTruthy();
    expect(screen.getByText('3 total')).toBeTruthy();
  });

  it('7. Resolve button calls resolveMutate with trigger id', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger({ id: 'trigger-abc' })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    fireEvent.click(screen.getByText('Resolve'));
    expect(resolveMutate).toHaveBeenCalledWith('trigger-abc');
  });

  it('8. Snooze button calls snoozeMutate with trigger id', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger({ id: 'trigger-xyz' })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    fireEvent.click(screen.getByText('Snooze 7d'));
    expect(snoozeMutate).toHaveBeenCalledWith('trigger-xyz');
  });

  it('9. Assign Module button is disabled', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger()],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const assignBtn = screen.getByText('Assign Module').closest('button');
    expect(assignBtn).not.toBeNull();
    expect((assignBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('10. skill_decay description includes skill label and drop pts', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger({
        triggerType: 'skill_decay',
        skillName:   'meddic_qualification',
        triggerData: { drop_pts: 22, day0_score: 78, day30_score: 56 },
      })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // "MEDDIC Qualification" appears in both the description and the skill tag line
    expect(screen.getAllByText(/MEDDIC Qualification/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/22pts/)).toBeTruthy();
  });

  it('11. live_score_drop description includes drop pts', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger({
        id:          't-live',
        triggerType: 'live_score_drop',
        skillName:   null,
        severity:    'warning',
        triggerData: { drop_pts: 12, latest_score: 48, rolling_avg_30d: 60 },
      })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/12pts/)).toBeTruthy();
  });

  it('12. gap_widening description includes widening pts', async () => {
    mockUseCoachingTriggers.mockReturnValue({
      data: [makeTrigger({
        id:          't-gap',
        triggerType: 'gap_widening',
        skillName:   null,
        severity:    'critical',
        triggerData: { widening_pts: 8, prior_gap: 20, current_gap: 28 },
      })],
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/8pts/)).toBeTruthy();
  });
});

// ── RepNudgeBanner tests ──────────────────────────────────────────────────────

const mockUseRepNudge = vi.fn();

vi.mock('../hooks/useCoachingTriggers', async (importOriginal) => {
  // Re-export everything from original + override what we need
  const original = await importOriginal<typeof import('../hooks/useCoachingTriggers')>();
  return {
    ...original,
    useCoachingTriggers: (...args: unknown[]) => mockUseCoachingTriggers(...args),
    useResolveTrigger:   () => ({ mutate: resolveMutate, isPending: false }),
    useSnoozeTrigger:    () => ({ mutate: snoozeMutate,  isPending: false }),
    useRepNudge:         (...args: unknown[]) => mockUseRepNudge(...args),
  };
});

describe('RepNudgeBanner — T7 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function mountBanner() {
    const { default: Banner } = await import('../features/rep-coaching/RepNudgeBanner');
    return Banner;
  }

  it('13. renders nothing when no trigger', async () => {
    mockUseRepNudge.mockReturnValue({ data: null, isLoading: false });

    const Banner = await mountBanner();
    const { container } = render(<Banner />, { wrapper: wrap(makeClient()) });

    expect(container.firstChild).toBeNull();
  });

  it('14. renders nothing while loading', async () => {
    mockUseRepNudge.mockReturnValue({ data: undefined, isLoading: true });

    const Banner = await mountBanner();
    const { container } = render(<Banner />, { wrapper: wrap(makeClient()) });

    expect(container.firstChild).toBeNull();
  });

  it('15. renders nudge message for skill_decay trigger', async () => {
    mockUseRepNudge.mockReturnValue({
      data: makeTrigger({
        triggerType: 'skill_decay',
        skillName:   'champion_building',
        triggerData: { drop_pts: 18 },
      }),
      isLoading: false,
    });

    const Banner = await mountBanner();
    render(<Banner />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Champion Building/)).toBeTruthy();
    expect(screen.getByText(/18pts/)).toBeTruthy();
    // Trigger type label in the banner header
    expect(screen.getByText('Skill Decay')).toBeTruthy();
  });

  it('16. dismiss button hides the banner (local state only, no mutation called)', async () => {
    mockUseRepNudge.mockReturnValue({
      data: makeTrigger({ triggerType: 'live_score_drop', skillName: null, severity: 'warning', triggerData: { drop_pts: 11 } }),
      isLoading: false,
    });

    const Banner = await mountBanner();
    render(<Banner />, { wrapper: wrap(makeClient()) });

    expect(screen.getByRole('alert')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/Dismiss coaching nudge/i));

    // Banner gone after dismiss
    expect(screen.queryByRole('alert')).toBeNull();

    // No DB mutation should have been called
    expect(resolveMutate).not.toHaveBeenCalled();
    expect(snoozeMutate).not.toHaveBeenCalled();
  });
});
