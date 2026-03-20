/**
 * OAST — GBP Pricing Constants
 * Single source of truth for all subscription and onboarding prices.
 * Import this everywhere; never use magic numbers.
 */

export const PRICING = {
    /** Annual billing discount multiplier (15% off) */
    ANNUAL_DISCOUNT: 0.85,

    /** Core Platform tier */
    CORE: {
        tier: 'core' as const,
        label: 'Core Platform',
        pricePerUserMonthly: 65.00,
        currency: 'GBP',
        symbol: '£',
    },

    /** Revenue Intelligence tier (includes Live Scoring) */
    REVENUE_INTELLIGENCE: {
        tier: 'revenue_intelligence' as const,
        label: 'Revenue Intelligence',
        pricePerUserMonthly: 185.00,
        currency: 'GBP',
        symbol: '£',
    },

    /** One-time onboarding fee — charged once per organisation, not per user */
    ONBOARDING_FEE: 2000.00,

    /** Trial duration in days (Tier 2 features unlocked, no charge) */
    TRIAL_DAYS: 14,

    /** Helper: format a GBP amount as a readable string */
    format: (amount: number): string =>
        `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

    /** Monthly cost for a given tier and seat count */
    monthlyTotal: (tier: 'core' | 'revenue_intelligence', seats: number): number => {
        const rate = tier === 'revenue_intelligence'
            ? PRICING.REVENUE_INTELLIGENCE.pricePerUserMonthly
            : PRICING.CORE.pricePerUserMonthly;
        return rate * seats;
    },
} as const;

export type OrgTier = 'core' | 'revenue_intelligence';
