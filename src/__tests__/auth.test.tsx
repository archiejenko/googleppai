/**
 * Tests 1–2: AuthContext
 * 1. Hydrates user state when a valid session exists
 * 2. Sets user to null when no session exists (expired / not logged in)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// ── Hoisted mocks (accessible inside vi.mock factories) ──────────────────────

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
    }),
    signOut: vi.fn().mockResolvedValue({}),
    profileSingle: vi.fn(),
}));

vi.mock('../utils/supabase', () => ({
    supabase: {
        auth: {
            getSession: mocks.getSession,
            onAuthStateChange: mocks.onAuthStateChange,
            signOut: mocks.signOut,
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mocks.profileSingle,
        }),
    },
}));

vi.mock('../lib/posthog', () => ({
    posthog: { identify: vi.fn(), capture: vi.fn(), reset: vi.fn() },
    isPostHogEnabled: false,
}));

// ── Consumer helper ───────────────────────────────────────────────────────────

function AuthConsumer() {
    const { user, isAuthenticated, isLoading } = useAuth();
    if (isLoading) return <div data-testid="loading">loading</div>;
    return (
        <div>
            <span data-testid="authenticated">{String(isAuthenticated)}</span>
            <span data-testid="user-email">{user?.email ?? 'none'}</span>
            <span data-testid="user-role">{user?.role ?? 'none'}</span>
        </div>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.onAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
        });
    });

    it('test 1: hydrates user state when a valid session exists', async () => {
        // Provide a mock token whose middle segment is not valid base64 — the
        // JWT integrity check catches the parse error silently and continues.
        mocks.getSession.mockResolvedValue({
            data: {
                session: {
                    access_token: 'mock.invalid_b64.sig',
                    user: {
                        id: 'user-abc',
                        email: 'demo@oast.io',
                        email_confirmed_at: '2024-01-01T00:00:00Z',
                        user_metadata: { name: 'Demo User' },
                    },
                },
            },
        });

        mocks.profileSingle.mockResolvedValue({
            data: {
                name: 'Demo User',
                role: 'user',
                onboarding_completed: true,
                avatar_url: null,
            },
            error: null,
        });

        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>,
        );

        // Wait for loading to complete
        await waitFor(() => {
            expect(screen.queryByTestId('loading')).toBeNull();
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('demo@oast.io');
        expect(screen.getByTestId('user-role')).toHaveTextContent('user');
    });

    it('test 2: sets user to null when no session exists (expired/invalid)', async () => {
        mocks.getSession.mockResolvedValue({ data: { session: null } });

        render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>,
        );

        await waitFor(() => {
            expect(screen.queryByTestId('loading')).toBeNull();
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    });
});
