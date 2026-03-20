import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { PRICING } from '../constants/pricing';
import BillingToggle from '../components/pricing/BillingToggle';
import PlanCard, { type PlanConfig } from '../components/pricing/PlanCard';
import RevenueReadinessModal from '../components/pricing/RevenueReadinessModal';

const ANNUAL_DISCOUNT = PRICING.ANNUAL_DISCOUNT;

const STANDARD_FEATURES: string[] = [
    'Real-Time Coaching',
    'Performance Analytics',
    'Goal Tracking',
    'Leaderboards',
];

const STANDARD_LOCKED_FEATURES: string[] = [
    'Meeting Intelligence',
];

const REV_INTEL_FEATURES: string[] = [
    'Everything in Performance Infrastructure',
    'Meeting Intelligence',
    'Transfer Gap Analysis',
    'Deal Correlation',
    'Pipeline Health Scoring',
    'AI Revenue Coaching',
];

const ENTERPRISE_FEATURES: string[] = [
    'Full platform',
    'Dedicated success manager',
    'Custom integrations',
];

const FOUNDING_FEATURES: string[] = [
    '£2,000 Strategic Deployment Fee waived',
    'Applicable on any tier',
    'Priority onboarding & dedicated success contact',
    'First 3 seats only',
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
        badge: 'MOST POPULAR',
        badgeVariant: 'coral',
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
        id: 'enterprise',
        badge: 'ENTERPRISE',
        badgeVariant: 'muted',
        name: 'Revenue Readiness',
        description: 'End-to-end revenue readiness infrastructure for global sales organisations.',
        pricePerUser: null,
        deploymentFeeLabel: 'DEPLOYMENT',
        deploymentFee: 'Included in contract',
        deploymentFeeHighlight: false,
        tier: null,
        enterprise: true,
        features: ENTERPRISE_FEATURES,
        cta: 'REQUEST EXECUTIVE BRIEFING',
        ctaVariant: 'ghost',
        includesDeploymentFee: false,
        isFoundingMember: false,
    },
    {
        id: 'founding',
        badge: 'FOUNDING MEMBER',
        badgeVariant: 'coral',
        name: 'Founding Member',
        description: 'Qualifying founding members receive a waived £2,000 Strategic Deployment Fee on any tier.',
        pricePerUser: null,
        deploymentFeeLabel: 'STRATEGIC DEPLOYMENT FEE',
        deploymentFee: 'WAIVED — £2,000 saving',
        deploymentFeeHighlight: true,
        tier: null,
        founding: true,
        foundingSpots: 3,
        features: FOUNDING_FEATURES,
        cta: 'CLAIM FOUNDING SEAT',
        ctaVariant: 'ghost',
        enterprise: false,
        includesDeploymentFee: false,
        isFoundingMember: true,
    },
];

export default function Pricing() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [enquiryOpen, setEnquiryOpen] = useState(false);
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
                    Three tiers and a founding member offer designed for teams at different stages of revenue maturity.
                </p>
                <BillingToggle value={billingCycle} onChange={setBillingCycle} />
            </section>

            {/* Pricing grid */}
            <section className="px-4 md:px-8 max-w-screen-xl mx-auto pb-8 pt-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
                    {PLANS.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            billingCycle={billingCycle}
                            annualDiscount={ANNUAL_DISCOUNT}
                            onCTAClick={handleCheckout}
                            onEnquiry={() => setEnquiryOpen(true)}
                        />
                    ))}
                </div>
            </section>

            {/* Footer disclaimer */}
            <section className="pb-24 px-6 text-center">
                <p className="text-xs tracking-widest text-[rgb(var(--text-muted))]">
                    ALL PLANS REQUIRE A ONE-TIME £2,000 STRATEGIC DEPLOYMENT FEE · TOKEN USAGE CHARGES APPLY ON REVENUE INTELLIGENCE LAYER · ALL PRICES EXCLUDE VAT · ANNUAL PLANS BILLED AS A SINGLE PAYMENT
                </p>
            </section>

            <RevenueReadinessModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
        </div>
    );
}
