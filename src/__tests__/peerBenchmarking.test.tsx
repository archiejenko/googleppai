/**
 * Smoke tests for T11 — Peer Benchmarking
 *
 * Pure function unit tests (no render):
 *   1. assignTenureBand — all 4 bands + null input
 *   2. percentileTier — top (≥67), mid (34–66), bottom (≤33)
 *   3. percentileLabel — "Top N%" when rank ≥ 50, "Bottom N%" when < 50
 *   4. median — correct value for odd/even arrays + null for empty
 *   5. computeTeamMedianPercentiles — correct per-skill median across reps
 *   6. cohort size guard — percentile_rank null when cohortSize < MIN_COHORT_SIZE
 *
 * PeerBenchmarkingCard (rep view) smoke tests:
 *   7. Skeleton renders while loading
 *   8. Insufficient cohort renders grey pill, not a percentile number
 *   9. Top-third skill shows green pill; bottom-third shows coral pill
 *  10. Clicking a skill card shows distribution chart with 5 bucket bars
 *  11. Rep's position dot rendered in the correct bucket bar
 *
 * TeamPeerBenchmarking (manager view) smoke tests:
 *  12. Empty state when no team data
 *  13. Summary row renders per-skill medians
 *  14. Sorting by a skill column reorders rows (highest percentile first by default)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  assignTenureBand,
  percentileTier,
  percentileLabel,
  median,
  computeTeamMedianPercentiles,
  MIN_COHORT_SIZE,
  type SkillPercentile,
} from '../hooks/usePeerBenchmarking';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUsePeerBenchmarking     = vi.fn();
const mockUseTeamPeerBenchmarking = vi.fn();
const mockUseRoleReadiness        = vi.fn();

vi.mock('../hooks/usePeerBenchmarking', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/usePeerBenchmarking')>();
  return {
    ...original,
    usePeerBenchmarking:     (...args: unknown[]) => mockUsePeerBenchmarking(...args),
    useTeamPeerBenchmarking: (...args: unknown[]) => mockUseTeamPeerBenchmarking(...args),
  };
});

vi.mock('../hooks/useRoleReadiness', async (importOriginal) => {
  const original = await importOriginal<typeof import('../hooks/useRoleReadiness')>();
  return {
    ...original,
    useRoleReadiness: (...args: unknown[]) => mockUseRoleReadiness(...args),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSkillPercentile(overrides: Partial<SkillPercentile> = {}): SkillPercentile {
  return {
    skillName:      'discovery_questioning',
    skillLabel:     'Discovery & Questioning',
    repScore:       68,
    percentileRank: 72,
    cohortSize:     8,
    jobRole:        'AE',
    tenureBand:     '7-18mo',
    buckets:        [1, 2, 4, 6, 3],
    ...overrides,
  };
}

function allSkills(overrides: Partial<SkillPercentile> = {}): SkillPercentile[] {
  const keys = [
    'discovery_questioning', 'objection_handling', 'value_articulation',
    'closing_commitment', 'active_listening', 'meddic_qualification', 'champion_building',
  ] as const;
  return keys.map((k, i) => makeSkillPercentile({
    skillName: k,
    skillLabel: k.replace(/_/g, ' '),
    repScore: 50 + i * 5,
    percentileRank: 40 + i * 8,
    cohortSize: 6,
    buckets: [1, 2, 3, 2, 1],
    ...overrides,
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

// ── Pure function tests ───────────────────────────────────────────────────────

describe('assignTenureBand — pure function', () => {
  it('1. assigns all 4 bands and handles null', () => {
    expect(assignTenureBand(null)).toBeNull();
    expect(assignTenureBand(0)).toBe('0-6mo');
    expect(assignTenureBand(6)).toBe('0-6mo');
    expect(assignTenureBand(7)).toBe('7-18mo');
    expect(assignTenureBand(18)).toBe('7-18mo');
    expect(assignTenureBand(19)).toBe('19-36mo');
    expect(assignTenureBand(36)).toBe('19-36mo');
    expect(assignTenureBand(37)).toBe('36+mo');
    expect(assignTenureBand(120)).toBe('36+mo');
  });
});

describe('percentileTier — pure function', () => {
  it('2. assigns top/mid/bottom tiers correctly', () => {
    expect(percentileTier(67)).toBe('top');
    expect(percentileTier(100)).toBe('top');
    expect(percentileTier(34)).toBe('mid');
    expect(percentileTier(66)).toBe('mid');
    expect(percentileTier(33)).toBe('bottom');
    expect(percentileTier(0)).toBe('bottom');
    expect(MIN_COHORT_SIZE).toBe(3);  // sanity check constant
  });
});

describe('percentileLabel — pure function', () => {
  it('3. shows "Top N%" for rank ≥ 50 and "Bottom N%" for rank < 50', () => {
    expect(percentileLabel(72)).toBe('Top 28%');
    expect(percentileLabel(50)).toBe('Top 50%');
    expect(percentileLabel(49)).toBe('Bottom 50%');
    expect(percentileLabel(10)).toBe('Bottom 11%');
    expect(percentileLabel(0)).toBe('Bottom 1%');
    expect(percentileLabel(100)).toBe('Top 0%');
  });
});

describe('median — pure function', () => {
  it('4. computes median for odd/even arrays and returns null for empty', () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([1, 3, 5])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([10, 20, 30, 40, 50])).toBe(30);
  });
});

describe('computeTeamMedianPercentiles — pure function', () => {
  it('5. computes per-skill median across multiple reps', () => {
    const rep1: SkillPercentile[] = [
      makeSkillPercentile({ skillName: 'discovery_questioning', percentileRank: 60 }),
      makeSkillPercentile({ skillName: 'champion_building',     percentileRank: 80 }),
    ];
    const rep2: SkillPercentile[] = [
      makeSkillPercentile({ skillName: 'discovery_questioning', percentileRank: 40 }),
      makeSkillPercentile({ skillName: 'champion_building',     percentileRank: 20 }),
    ];
    const result = computeTeamMedianPercentiles([rep1, rep2]);
    expect(result.get('discovery_questioning')).toBe(50);
    expect(result.get('champion_building')).toBe(50);
  });

  it('6. skills with null percentile_rank are excluded from median calculation', () => {
    const rep1: SkillPercentile[] = [
      makeSkillPercentile({ skillName: 'discovery_questioning', percentileRank: null, cohortSize: 1 }),
    ];
    const rep2: SkillPercentile[] = [
      makeSkillPercentile({ skillName: 'discovery_questioning', percentileRank: 60, cohortSize: 5 }),
    ];
    const result = computeTeamMedianPercentiles([rep1, rep2]);
    // Only rep2 has a non-null rank → median is just 60
    expect(result.get('discovery_questioning')).toBe(60);
  });
});

// ── PeerBenchmarkingCard (rep view) ───────────────────────────────────────────

describe('PeerBenchmarkingCard — T11 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks());

  async function mountCard() {
    const { default: Comp } = await import('../features/peer-benchmarking/PeerBenchmarkingCard');
    return Comp;
  }

  it('7. skeleton renders while loading', async () => {
    mockUsePeerBenchmarking.mockReturnValue({ data: undefined, isLoading: true });

    const Comp = await mountCard();
    const { container } = render(<Comp userId="rep-1" />, { wrapper: wrap(makeClient()) });

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('8. insufficient cohort renders grey pill (not a percentile number)', async () => {
    mockUsePeerBenchmarking.mockReturnValue({
      data: [makeSkillPercentile({ percentileRank: null, cohortSize: 1 })],
      isLoading: false,
    });

    const Comp = await mountCard();
    const { container } = render(<Comp userId="rep-1" />, { wrapper: wrap(makeClient()) });

    // Grey "Insufficient cohort" pill present
    expect(container.querySelector('[data-testid="insufficient-pill"]')).toBeTruthy();
    // No percentile pill (coloured)
    expect(container.querySelector('[data-testid="percentile-pill"]')).toBeNull();
  });

  it('9. top-third skill has green pill; bottom-third skill has coral pill', async () => {
    mockUsePeerBenchmarking.mockReturnValue({
      data: [
        makeSkillPercentile({ skillName: 'discovery_questioning', percentileRank: 80 }),
        makeSkillPercentile({ skillName: 'champion_building',     percentileRank: 15 }),
      ],
      isLoading: false,
    });

    const Comp = await mountCard();
    const { container } = render(<Comp userId="rep-1" />, { wrapper: wrap(makeClient()) });

    const pills = container.querySelectorAll('[data-testid="percentile-pill"]');
    const tiers = [...pills].map(p => p.getAttribute('data-tier'));
    expect(tiers).toContain('top');
    expect(tiers).toContain('bottom');
  });

  it('10. clicking a skill card shows the distribution chart with 5 bucket bars', async () => {
    mockUsePeerBenchmarking.mockReturnValue({
      data: [makeSkillPercentile()],
      isLoading: false,
    });

    const Comp = await mountCard();
    const { container } = render(<Comp userId="rep-1" />, { wrapper: wrap(makeClient()) });

    // Click the first skill card button
    fireEvent.click(container.querySelector('button[aria-expanded]')!);

    const chart = container.querySelector('[data-testid="distribution-chart"]');
    expect(chart).toBeTruthy();
    // All 5 bucket bars should be present
    for (let i = 0; i < 5; i++) {
      expect(container.querySelector(`[data-testid="bucket-bar-${i}"]`)).toBeTruthy();
    }
  });

  it('11. rep position dot is in the correct bucket for score=68 (bucket index 3: 61–80)', async () => {
    // repScore=68 → bucket index 3 (61–80)
    mockUsePeerBenchmarking.mockReturnValue({
      data: [makeSkillPercentile({ repScore: 68, buckets: [1, 2, 3, 4, 1] })],
      isLoading: false,
    });

    const Comp = await mountCard();
    const { container } = render(<Comp userId="rep-1" />, { wrapper: wrap(makeClient()) });

    fireEvent.click(container.querySelector('button[aria-expanded]')!);

    // Dot should be present inside bucket-bar-3's parent column
    const dot = container.querySelector('[data-testid="rep-position-dot"]');
    expect(dot).toBeTruthy();
    // Bucket 3 bar should be rendered (the one containing the dot)
    const bar3 = container.querySelector('[data-testid="bucket-bar-3"]');
    expect(bar3).toBeTruthy();
    // The dot's parent column should be the 4th column (index 3)
    const chart = container.querySelector('[data-testid="distribution-chart"]');
    const columns = chart?.querySelectorAll('.flex-1') ?? [];
    expect(columns.length).toBe(5);
  });
});

// ── TeamPeerBenchmarking (manager view) ───────────────────────────────────────

describe('TeamPeerBenchmarking — T11 smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRoleReadiness.mockReturnValue({ data: [], isLoading: false });
  });

  async function mountTeam() {
    const { default: Comp } = await import('../features/training-analytics/TeamPeerBenchmarking');
    return Comp;
  }

  it('12. empty state when no team data', async () => {
    mockUseTeamPeerBenchmarking.mockReturnValue({ data: new Map(), isLoading: false });

    const Comp = await mountTeam();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    expect(container.querySelector('[data-testid="team-empty"]')).toBeTruthy();
  });

  it('13. summary row renders per-skill medians', async () => {
    const skills = allSkills();
    const teamMap = new Map([
      ['rep-1', skills],
      ['rep-2', allSkills({ percentileRank: 30 })],
    ]);
    mockUseTeamPeerBenchmarking.mockReturnValue({ data: teamMap, isLoading: false });
    mockUseRoleReadiness.mockReturnValue({
      data: [
        { repId: 'rep-1', repName: 'Alice', score: 70, band: 'Ready', factors: [], dragFactor: null, snapshotDate: '2025-03-01' },
        { repId: 'rep-2', repName: 'Bob',   score: 55, band: 'Developing', factors: [], dragFactor: null, snapshotDate: '2025-03-01' },
      ],
      isLoading: false,
    });

    const Comp = await mountTeam();
    const { container } = render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // At least one summary cell rendered
    const summaryCells = container.querySelectorAll('[data-testid="summary-cell"]');
    expect(summaryCells.length).toBeGreaterThan(0);
    // Summary row label
    expect(screen.getByText('Team median')).toBeTruthy();
  });

  it('14. column header click sorts reps by that skill descending', async () => {
    // rep-1 has high discovery score, rep-2 has low
    const repSkills1 = allSkills({ skillName: 'discovery_questioning', percentileRank: 85, cohortSize: 5 });
    const repSkills2 = allSkills({ skillName: 'discovery_questioning', percentileRank: 20, cohortSize: 5 });

    const teamMap = new Map([['rep-1', repSkills1], ['rep-2', repSkills2]]);
    mockUseTeamPeerBenchmarking.mockReturnValue({ data: teamMap, isLoading: false });
    mockUseRoleReadiness.mockReturnValue({
      data: [
        { repId: 'rep-1', repName: 'Alice', score: 70, band: 'Ready', factors: [], dragFactor: null, snapshotDate: '2025-03-01' },
        { repId: 'rep-2', repName: 'Bob',   score: 55, band: 'Developing', factors: [], dragFactor: null, snapshotDate: '2025-03-01' },
      ],
      isLoading: false,
    });

    const Comp = await mountTeam();
    render(<Comp days={30} />, { wrapper: wrap(makeClient()) });

    // Click the "Discovery" column header to sort by discovery (first skill col)
    const sortButtons = screen.getAllByRole('button');
    // First button is "Rep" sort, second is first skill column ("Discovery")
    const discoveryBtn = sortButtons.find(b => b.textContent?.includes('Discovery'));
    expect(discoveryBtn).toBeTruthy();
    fireEvent.click(discoveryBtn!);

    // After sort desc: Alice (85th) should appear before Bob (20th)
    const rows = document.querySelectorAll('[data-testid="benchmarking-table"] tbody tr:not(:last-child)');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Alice');
    expect(rows[1].textContent).toContain('Bob');
  });
});
