/**
 * Test 8: ProtectedRoute redirects unauthenticated users to /login
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// ── Mock ──────────────────────────────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock('../context/AuthContext', () => ({
    useAuth: mockUseAuth,
}));

// ── Test ──────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
    it('test 8: redirects unauthenticated users to /login', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            user: null,
            isLoading: false,
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    {/* The protected route */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <div data-testid="dashboard">Dashboard</div>
                            </ProtectedRoute>
                        }
                    />
                    {/* Login page — Navigate should land here */}
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                </Routes>
            </MemoryRouter>,
        );

        // Should have navigated to /login
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        // Dashboard must not be rendered
        expect(screen.queryByTestId('dashboard')).toBeNull();
    });
});
