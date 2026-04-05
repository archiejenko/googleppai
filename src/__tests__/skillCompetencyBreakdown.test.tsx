/**
 * Smoke tests for SkillCompetencyBreakdown (T2)
 *
 * Mocks the hook directly rather than Supabase — avoids fighting the
 * thenable mock contract and tests the component in isolation.
 *
 * Covers:
 *   1. Renders all 7 skill labels when data is present
 *   2. Benchmark constants match the canonical values (no divergence)
 *   3. Null teamAvg renders "—" not "0" (no null→zero coercion)
 *   4. "est." pill renders for estimated-quality skills
 *   5. "no data" pill renders for skills with DataQuality='none'
 *   6. Period toggle buttons render (30d / 60d / 90d)
 *   7. Skeleton renders while loading
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SKILL_BENCHMARKS } from '../config/benchmarks';
import type { SkillCompetencyResult } from '../hooks/useTeamSkillCompetency';

// ── Mock the hook, not Supabase ───────────────────────────────────────────────

const mockUseTeamSkillCompetency = vi.fn();

vi.mock('../hooks/useTeamSkillCompetency', () => ({
  useTeamSkillCompetency: (...args: unknown[]) => mockUseTeamSkillCompetency(...args),
}));

// ── Fixture: full data result (all 7 skills) ──────────────────────────────────

function makeSkillResults(overrides: Partial<SkillCompetencyResult>[] = []): SkillCompetencyResult[] {
  return SKILL_BENCHMARKS.map((skill, i) => ({
    key:          skill.key,
    label:        skill.label,
    benchmark:    skill.benchmark,
    teamAvg:      skill.dataQuality === 'none' ? null : 60 + i,
    prevTeamAvg:  skill.dataQuality === 'none' ? null : 55 + i,
    delta:        skill.dataQuality === 'none' ? null : 5,
    dataQuality:  skill.dataQuality,
    repsWithData: skill.dataQuality === 'none' ? 0 : 3,
    ...overrides[i],
  }));
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
    '../features/training-analytics/SkillCompetencyBreakdown'
  );
  return Comp;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SkillCompetencyBreakdown — T2 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renders all 7 skill labels when data is present', async () => {
    mockUseTeamSkillCompetency.mockReturnValue({
      data: makeSkillResults(),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    for (const skill of SKILL_BENCHMARKS) {
      expect(screen.getByText(skill.label)).toBeTruthy();
    }
  });

  it('2. benchmark constants are correct (guards against hardcoded divergence)', () => {
    const byKey = Object.fromEntries(SKILL_BENCHMARKS.map(s => [s.key, s]));
    expect(byKey['discovery_questioning'].benchmark).toBe(70);
    expect(byKey['objection_handling'].benchmark).toBe(68);
    expect(byKey['value_articulation'].benchmark).toBe(72);
    expect(byKey['closing_commitment'].benchmark).toBe(65);
    expect(byKey['active_listening'].benchmark).toBe(70);
    expect(byKey['meddic_qualification'].benchmark).toBe(75);
    expect(byKey['champion_building'].benchmark).toBe(62);
  });

  it('3. null teamAvg renders "—" not "0"', async () => {
    // All skills have null teamAvg (no data scenario)
    const allNull: SkillCompetencyResult[] = SKILL_BENCHMARKS.map(skill => ({
      key:          skill.key,
      label:        skill.label,
      benchmark:    skill.benchmark,
      teamAvg:      null,
      prevTeamAvg:  null,
      delta:        null,
      dataQuality:  skill.dataQuality,
      repsWithData: 0,
    }));

    mockUseTeamSkillCompetency.mockReturnValue({ data: allNull, isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // All 7 skills should show "—"
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(7);

    // No Oswald-styled score element should contain "0" as its sole text
    const scoreSpans = document.querySelectorAll('[style*="Oswald"]');
    for (const span of scoreSpans) {
      expect(span.textContent?.trim()).not.toBe('0');
    }
  });

  it('4. "est." pill renders for estimated-quality skills', async () => {
    mockUseTeamSkillCompetency.mockReturnValue({
      data: makeSkillResults(),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const estimatedCount = SKILL_BENCHMARKS.filter(s => s.dataQuality === 'estimated').length;
    const pills = screen.getAllByText('est.');
    // Footer legend also renders "est." once as an explanatory span, so total = estimatedCount + 1
    expect(pills.length).toBe(estimatedCount + 1);
  });

  it('5. "no data" pill renders for objection_handling (DataQuality = none)', async () => {
    mockUseTeamSkillCompetency.mockReturnValue({
      data: makeSkillResults(),
      isLoading: false,
    });

    const Comp = await mountComponent();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    const noneCount = SKILL_BENCHMARKS.filter(s => s.dataQuality === 'none').length;
    const noDataPills = screen.getAllByText('no data');
    // Footer legend also renders "no data" once as an explanatory span, so total = noneCount + 1
    expect(noDataPills.length).toBe(noneCount + 1);
  });

  it('6. component is controlled — no internal period toggle (toggle lives in TrainingDashboard)', async () => {
    // The toggle was lifted to TrainingDashboard for shared state with RepPerformanceMatrix.
    // Verify the component renders without a period toggle and passes the days prop to the hook.
    mockUseTeamSkillCompetency.mockReturnValue({ data: [], isLoading: false });

    const Comp = await mountComponent();
    render(<Comp days={60} />, { wrapper: wrap(makeClient()) });

    // Hook should have been called with the controlled days value
    expect(mockUseTeamSkillCompetency).toHaveBeenCalledWith(60);

    // No toggle buttons inside this component
    expect(screen.queryByText('30d')).toBeNull();
    expect(screen.queryByText('60d')).toBeNull();
    expect(screen.queryByText('90d')).toBeNull();
  });

  it('7. skeleton renders while loading', async () => {
    mockUseTeamSkillCompetency.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountComponent();
    const { container } = render(<Comp />, { wrapper: wrap(makeClient()) });

    // Skeleton elements have the animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Skill labels should NOT be present during loading
    expect(screen.queryByText('Discovery & Questioning')).toBeNull();
  });
});
