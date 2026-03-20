/**
 * Test 7: AnalyticsPage renders without crashing with mock React Query data
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../utils/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn().mockReturnValue({
                data: { subscription: { unsubscribe: vi.fn() } },
            }),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
    },
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn().mockReturnValue({
        user: { id: 'user-1', email: 'test@oast.io', role: 'user', name: 'Test' },
        session: { access_token: 'test-token' },
        isAuthenticated: true,
        isLoading: false,
        isAdmin: false,
        isManager: false,
    }),
}));

vi.mock('../context/TierContext', () => ({
    useTier: vi.fn().mockReturnValue({ isRevIntel: true, isLoading: false, org: null }),
}));

vi.mock('../lib/posthog', () => ({
    posthog: { capture: vi.fn(), identify: vi.fn() },
    isPostHogEnabled: false,
}));

// ── Test ──────────────────────────────────────────────────────────────────────

describe('AnalyticsPage', () => {
    it('test 7: renders without crashing with mock React Query data', async () => {
        // Import lazily to allow mocks to be in place first
        const { default: AnalyticsPage } = await import('../features/analytics/AnalyticsPage');

        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <AnalyticsPage />
                </MemoryRouter>
            </QueryClientProvider>,
        );

        // Page should mount without throwing — any rendered content suffices
        expect(document.body).toBeTruthy();
        // Should not show an uncaught error boundary fallback
        expect(screen.queryByText(/something went wrong/i)).toBeNull();
    });
});
