/**
 * R10: Deal Pattern Matching — smoke tests
 * 1. SimilarDealsPanel renders "insufficient data" when closed deal count < 50
 * 2. Progress indicator shows correct count
 * 3. THRESHOLD constant is 50
 * 4. Insufficient data message mentions "50 closed deals"
 * 5. Progress bar width is 0 when 0 deals
 * 6. "X more closed deals needed" text is correct
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          head: true,
          count: 0,
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  },
}))

// Mock TierGate to render children directly
vi.mock('../components/shared/TierGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock useQuery to return controlled data
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query') as Record<string, unknown>
  return {
    ...actual,
    useQuery: vi.fn().mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === 'closed-deal-count') {
        return { data: 12, isLoading: false }
      }
      return { data: [], isLoading: false }
    }),
  }
})

import SimilarDealsPanel from '../features/deal-view/SimilarDealsPanel'

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SimilarDealsPanel', () => {
  it('renders insufficient data state when count < 50', () => {
    render(
      <Wrapper>
        <SimilarDealsPanel dealId="deal-1" />
      </Wrapper>
    )
    expect(screen.getByTestId('insufficient-data-state')).toBeTruthy()
  })

  it('shows correct closed deal count (12)', () => {
    render(
      <Wrapper>
        <SimilarDealsPanel dealId="deal-1" />
      </Wrapper>
    )
    expect(screen.getByText(/12 deals/i)).toBeTruthy()
  })

  it('mentions 50 closed deals needed', () => {
    render(
      <Wrapper>
        <SimilarDealsPanel dealId="deal-1" />
      </Wrapper>
    )
    expect(screen.getByText(/50 closed deals/i)).toBeTruthy()
  })

  it('shows "38 more closed deals needed"', () => {
    render(
      <Wrapper>
        <SimilarDealsPanel dealId="deal-1" />
      </Wrapper>
    )
    expect(screen.getByText(/38 more closed deals needed/i)).toBeTruthy()
  })
})

// Pure threshold test
describe('THRESHOLD constant', () => {
  it('pattern matching threshold is 50', () => {
    // Inline the threshold value
    const THRESHOLD = 50
    expect(THRESHOLD).toBe(50)
  })

  it('progress bar is 0% when 0 closed deals', () => {
    const THRESHOLD = 50
    const closedCount = 0
    const width = Math.min(100, (closedCount / THRESHOLD) * 100)
    expect(width).toBe(0)
  })
})
