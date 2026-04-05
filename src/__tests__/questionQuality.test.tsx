/**
 * Smoke tests — L3 Question Quality Index
 *
 * Covers:
 *   1. computeQuestionSummary: weighted score (all implication = 100)
 *   2. computeQuestionSummary: weighted score (all closed = low)
 *   3. computeQuestionSummary: implication_rate calculation
 *   4. computeQuestionSummary: empty array → nulls
 *   5. QuestionQualityPanel shows coaching nudge when implication_rate < 20%
 *   6. QuestionQualityPanel does NOT show nudge when implication_rate ≥ 20%
 *   7. QuestionQualityPanel renders question list with timestamps + type pills
 *   8. QuestionQualityTrend empty state renders correctly
 *   9. QuestionQualityTrend renders point count in header
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { computeQuestionSummary } from '../hooks/useCallQuestions';
import type { CallQuestion } from '../hooks/useCallQuestions';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseCallQuestions = vi.fn();

vi.mock('../hooks/useCallQuestions', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../hooks/useCallQuestions')>();
  return {
    ...orig,
    useCallQuestions:       (...args: unknown[]) => mockUseCallQuestions(...args),
    useQuestionQualityTrend: vi.fn(() => ({ data: [], isLoading: false })),
  };
});

vi.mock('recharts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('recharts')>();
  return {
    ...orig,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<CallQuestion> = {}): CallQuestion {
  return {
    id:                'q-1',
    call_id:           'call-abc',
    rep_id:            'rep-1',
    question_text:     'What are your biggest challenges?',
    question_type:     'surface_open',
    timestamp_seconds: 120,
    created_at:        '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

async function mountPanel() {
  const { default: Comp } = await import('../features/call-review/QuestionQualityPanel');
  return Comp;
}

async function mountTrend() {
  const { default: Comp } = await import('../features/calls-dashboard/QuestionQualityTrend');
  return Comp;
}

// ── Unit tests — computeQuestionSummary ───────────────────────────────────────

describe('computeQuestionSummary — scoring logic', () => {
  it('1. all implication → quality_score = 100', () => {
    const questions = [
      makeQuestion({ question_type: 'implication' }),
      makeQuestion({ id: 'q-2', question_type: 'implication' }),
    ];
    const result = computeQuestionSummary(questions);
    expect(result.quality_score).toBe(100);
    expect(result.implication_rate).toBe(100);
    expect(result.implication).toBe(2);
  });

  it('2. all closed → quality_score = 20 (0.2/1.0 * 100)', () => {
    const questions = [
      makeQuestion({ question_type: 'closed' }),
      makeQuestion({ id: 'q-2', question_type: 'closed' }),
    ];
    const result = computeQuestionSummary(questions);
    expect(result.quality_score).toBe(20);
    expect(result.implication_rate).toBe(0);
  });

  it('3. implication_rate: 1 implication out of 4 = 25%', () => {
    const questions = [
      makeQuestion({ question_type: 'closed' }),
      makeQuestion({ id: 'q-2', question_type: 'surface_open' }),
      makeQuestion({ id: 'q-3', question_type: 'surface_open' }),
      makeQuestion({ id: 'q-4', question_type: 'implication' }),
    ];
    const result = computeQuestionSummary(questions);
    expect(result.implication_rate).toBe(25);
    expect(result.total).toBe(4);
  });

  it('4. empty array → all nulls', () => {
    const result = computeQuestionSummary([]);
    expect(result.quality_score).toBeNull();
    expect(result.implication_rate).toBeNull();
    expect(result.total).toBe(0);
  });
});

// ── Component smoke tests ─────────────────────────────────────────────────────

describe('QuestionQualityPanel — L3 smoke tests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('5. coaching nudge shown when implication_rate < 20%', async () => {
    mockUseCallQuestions.mockReturnValue({
      data: [
        makeQuestion({ question_type: 'closed' }),
        makeQuestion({ id: 'q-2', question_type: 'surface_open' }),
        makeQuestion({ id: 'q-3', question_type: 'surface_open' }),
        makeQuestion({ id: 'q-4', question_type: 'closed' }),
        makeQuestion({ id: 'q-5', question_type: 'closed' }),
        // 0 implication → 0% rate → nudge shown
      ],
      isLoading: false,
    });

    const Comp = await mountPanel();
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText(/Less than 20% of your questions/i)).toBeTruthy();
    expect(screen.getByText(/Discovery coaching module/i)).toBeTruthy();
  });

  it('6. coaching nudge NOT shown when implication_rate ≥ 20%', async () => {
    mockUseCallQuestions.mockReturnValue({
      data: [
        makeQuestion({ question_type: 'closed' }),
        makeQuestion({ id: 'q-2', question_type: 'implication' }),
        makeQuestion({ id: 'q-3', question_type: 'implication' }),
        makeQuestion({ id: 'q-4', question_type: 'surface_open' }),
        // 2/4 = 50% implication → no nudge
      ],
      isLoading: false,
    });

    const Comp = await mountPanel();
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) });

    expect(screen.queryByText(/Less than 20%/i)).toBeNull();
  });

  it('7. question list renders with timestamps and type labels', async () => {
    mockUseCallQuestions.mockReturnValue({
      data: [
        makeQuestion({
          id: 'q-1',
          question_text:     'What keeps you up at night about this problem?',
          question_type:     'implication',
          timestamp_seconds: 185,  // 3:05
        }),
        makeQuestion({
          id: 'q-2',
          question_text:     'Can you do it by Friday?',
          question_type:     'closed',
          timestamp_seconds: 300,  // 5:00
        }),
      ],
      isLoading: false,
    });

    const Comp = await mountPanel();
    render(<Comp callId="call-abc" />, { wrapper: wrap(makeClient()) });

    expect(screen.getByText('What keeps you up at night about this problem?')).toBeTruthy();
    expect(screen.getByText('Can you do it by Friday?')).toBeTruthy();
    expect(screen.getByText('3:05')).toBeTruthy();
    expect(screen.getByText('5:00')).toBeTruthy();
    // Type pills + stacked bar legend both render label text
    expect(screen.getAllByText('Implication').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);
  });
});

describe('QuestionQualityTrend — L3 smoke tests', () => {
  it('8. empty state renders correctly', async () => {
    const Comp = await mountTrend();
    render(
      <MemoryRouter>
        <Comp points={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText(/No question data yet/i)).toBeTruthy();
  });

  it('9. renders correct call count in header', async () => {
    const points = [
      { call_id: 'c1', call_date: '2026-01-01T10:00:00Z', implication_rate: 15, quality_score: 45 },
      { call_id: 'c2', call_date: '2026-01-03T10:00:00Z', implication_rate: 25, quality_score: 65 },
      { call_id: 'c3', call_date: '2026-01-05T10:00:00Z', implication_rate: 30, quality_score: 70 },
    ];

    const Comp = await mountTrend();
    render(
      <MemoryRouter>
        <Comp points={points} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Last 3 calls/i)).toBeTruthy();
    // 2 at target (25%, 30% ≥ 20%), 1 below (15%)
    expect(screen.getByText(/2 at target/i)).toBeTruthy();
    expect(screen.getByText(/1 below/i)).toBeTruthy();
  });
});
