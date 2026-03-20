/**
 * Tests 5–6: TierGate
 * 5. Renders the upgrade lock overlay when org tier is insufficient (core)
 * 6. Renders children when tier is sufficient (revenue_intelligence)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TierGate from '../components/shared/TierGate';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUseTier = vi.hoisted(() => vi.fn());

vi.mock('../context/TierContext', () => ({
    useTier: mockUseTier,
}));

// TierGate uses useNavigate internally for the upgrade CTA button
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: vi.fn().mockReturnValue(vi.fn()) };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TierGate', () => {
    it('test 5: renders the upgrade lock overlay when org tier is insufficient', () => {
        mockUseTier.mockReturnValue({ isRevIntel: false, isLoading: false });

        render(
            <MemoryRouter>
                <TierGate>
                    <span data-testid="protected-content">Revenue Intel Data</span>
                </TierGate>
            </MemoryRouter>,
        );

        // Lock overlay — these strings are unique within the overlay
        expect(screen.getByText('Upgrade to unlock')).toBeInTheDocument();
        expect(screen.getByText('View upgrade options')).toBeInTheDocument();

        // Protected children should NOT be rendered
        expect(screen.queryByTestId('protected-content')).toBeNull();
    });

    it('test 6: renders children directly when tier is sufficient', () => {
        mockUseTier.mockReturnValue({ isRevIntel: true, isLoading: false });

        render(
            <MemoryRouter>
                <TierGate>
                    <span data-testid="protected-content">Revenue Intel Data</span>
                </TierGate>
            </MemoryRouter>,
        );

        // Children should be rendered
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();

        // Lock overlay must NOT be present
        expect(screen.queryByText('Upgrade to unlock')).toBeNull();
    });
});
