import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { PRICING } from '../constants/pricing';
import BillingToggle from '../components/pricing/BillingToggle';
import PlanCard, { type PlanConfig } from '../components/pricing/PlanCard';


const ANNUAL_DISCOUNT = PRICING.ANNUAL_DISCOUNT;

const STANDARD_FEATURES: string[] = [
    'Real-Time Coaching',
    'Performance Analytics',
    'Goal Tracking',
    'Leaderboards',
    'Post-Call Session Review',
    'Deal Outcomes',
    'HubSpot Integration',
    'Salesforce Integration',
    'Automated CRM Updates',
    'AI Coaching Digests',
    'Manager Coaching Insights',
    'Session Review and Scoring',
];

const STANDARD_LOCKED_FEATURES: string[] = [
    'Meeting Intelligence',
];

const REV_INTEL_FEATURES: string[] = [
    'Everything in Performance Infrastructure',
    'Meeting Intelligence',
    'Transfer Gap Analysis (NEW)',
    'Deal Correlation (NEW)',
    'AI Revenue Coaching (NEW)',
    'Outcome Correlation',
    'Competitive Intel',
    'Business Synergies',
    'CRM Automation',
];



const REVENUE_READINESS_FEATURES: string[] = [
    'Custom simulation library built to your methodology',
    'Multi-team Transfer Gap benchmarking',
    'Dedicated AI agent fleet',
    'Enterprise SSO + audit logs',
    'SLA + dedicated success team',
];

const PLANS: PlanConfig[] = [
    {
        id: 'standard',
        badge: 'PERFORMANCE INFRASTRUCTURE',
        badgeVariant: 'muted',
        name: 'Performance Infrastructure',
        description: 'The performance engine for high-growth B2B teams scaling revenue productivity.',
        pricePerUser: PRICING.CORE.pricePerUserMonthly,
        deploymentFeeLabel: 'STRATEGIC DEPLOYMENT FEE',
        deploymentFee: '£2,000 one-time',
        deploymentFeeHighlight: false,
        tier: 'core',
        features: STANDARD_FEATURES,
        lockedFeatures: STANDARD_LOCKED_FEATURES,
        cta: 'GET STARTED',
        ctaVariant: 'ghost',
        includesDeploymentFee: true,
        isFoundingMember: false,
    },
    {
        id: 'revenue_intel',
        badge: 'PREMIUM UPGRADE',
        badgeVariant: 'muted',
        name: 'Revenue Intelligence Layer',
        description: 'Live call scoring, missed revenue detection, and prospect intelligence for revenue-critical teams.',
        pricePerUser: PRICING.REVENUE_INTELLIGENCE.pricePerUserMonthly,
        deploymentFeeLabel: 'STRATEGIC DEPLOYMENT FEE',
        deploymentFee: '£2,000 one-time',
        deploymentFeeHighlight: false,
        tier: 'revenue_intelligence',
        featured: true,
        features: REV_INTEL_FEATURES,
        cta: 'GET STARTED',
        ctaVariant: 'coral',
        includesDeploymentFee: true,
        isFoundingMember: false,
    },
    {
        id: 'revenue_readiness',
        badge: 'REVENUE READINESS',
        badgeVariant: 'muted',
        name: 'Revenue Readiness',
        description: 'For enterprise teams building a readiness culture across the full revenue organisation.',
        pricePerUser: null,
        deploymentFeeLabel: 'STRATEGIC DEPLOYMENT FEE',
        deploymentFee: 'Custom',
        deploymentFeeHighlight: false,
        tier: null,
        founding: false,
        features: REVENUE_READINESS_FEATURES,
        cta: 'TALK TO US',
        ctaVariant: 'ghost',
        enterprise: true,
        includesDeploymentFee: false,
        isFoundingMember: false,
    },
];

export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleCheckout = async (
        tier: 'core' | 'revenue_intelligence',
        cycle: 'monthly' | 'annual',
        seats: number,
        includesDeploymentFee: boolean,
        isFoundingMember: boolean,
        setLoading: (v: boolean) => void,
        setError: (v: string | null) => void,
    ) => {
        if (!isAuthenticated) {
            navigate(`/register?plan=${tier}&billing=${cycle}`);
            return;
        }

        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
            body: {
                tier,
                billing_cycle: cycle,
                seat_count: seats,
                include_deployment_fee: includesDeploymentFee,
                is_founding_member: isFoundingMember,
                triggered_from: 'pricing_page',
            },
        });

        if (data?.checkoutUrl) {
            window.location.href = data.checkoutUrl;
        } else {
            setLoading(false);
            setError(
                data?.error === 'STRIPE_NOT_CONFIGURED'
                    ? 'Checkout is not yet configured. Please contact us directly.'
                    : (error?.message ?? 'Checkout unavailable. Please try again.'),
            );
        }
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--bg-canvas))]">
            {/* Page header */}
            <section className="pt-32 pb-16 px-6 text-center">
                <h1 className="text-5xl md:text-6xl tracking-tight text-[rgb(var(--text-primary))] mb-4">
                    Infrastructure Pricing. No Surprises.
                </h1>
                <p className="text-lg text-[rgb(var(--text-muted))] mb-12 max-w-lg mx-auto">
                    Two tiers and a founding member offer designed for teams at different stages of revenue maturity.
                </p>
                <BillingToggle value={billingCycle} onChange={setBillingCycle} />
            </section>

            {/* Pricing grid */}
            <section className="px-4 md:px-8 max-w-screen-xl mx-auto pb-8 pt-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                    {PLANS.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            billingCycle={billingCycle}
                            annualDiscount={ANNUAL_DISCOUNT}
                            onCTAClick={handleCheckout}
                        />
                    ))}
                </div>
            </section>

            {/* Footer disclaimer */}
            <section className="pb-24 px-6 text-center">
                <p className="text-xs tracking-widest text-[rgb(var(--text-muted))]">
                    ALL PLANS REQUIRE A ONE-TIME £2,000 STRATEGIC DEPLOYMENT FEE · ALL PRICES EXCLUDE VAT · ANNUAL PLANS BILLED AS A SINGLE PAYMENT
                </p>
            </section>

        </div>
    );
}
