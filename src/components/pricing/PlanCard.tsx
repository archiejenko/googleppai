import { useState } from 'react';
import { motion } from 'framer-motion';
import SeatCalculator from './SeatCalculator';
import FoundingBadge from './FoundingBadge';

export interface PlanConfig {
    id: string;
    badge: string;
    badgeVariant: 'coral' | 'muted';
    name: string;
    description: string;
    pricePerUser: number | null;
    deploymentFeeLabel: string;
    deploymentFee: string;
    deploymentFeeHighlight?: boolean;
    tier: 'core' | 'revenue_intelligence' | null;
    features: string[];
    /** Features shown locked (SVG lock icon + strikethrough) — available in a higher tier */
    lockedFeatures?: string[];
    cta: string;
    ctaVariant: 'coral' | 'ghost';
    founding?: boolean;
    foundingSpots?: number;
    featured?: boolean;
    enterprise?: boolean;
    includesDeploymentFee?: boolean;
    isFoundingMember?: boolean;
}

interface PlanCardProps {
    plan: PlanConfig;
    billingCycle: 'monthly' | 'annual';
    annualDiscount: number;
    onCTAClick: (
        tier: 'core' | 'revenue_intelligence',
        billingCycle: 'monthly' | 'annual',
        seats: number,
        includesDeploymentFee: boolean,
        isFoundingMember: boolean,
        setLoading: (v: boolean) => void,
        setError: (v: string | null) => void,
    ) => void;
    onEnquiry?: () => void;
}

export default function PlanCard({
    plan,
    billingCycle,
    annualDiscount,
    onCTAClick,
    onEnquiry,
}: PlanCardProps) {
    const [seats, setSeats] = useState(5);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    const monthlyPrice = plan.pricePerUser ?? 0;
    const annualPrice = Math.round(monthlyPrice * annualDiscount);
    const displayPrice = billingCycle === 'annual' ? annualPrice : monthlyPrice;
    const annualSaving = billingCycle === 'annual' ? (monthlyPrice - annualPrice) * seats : 0;

    // Border styles per card variant (founding uses framer-motion animated border)
    const borderClass = plan.founding
        ? ''
        : plan.featured
        ? 'border border-[rgb(var(--accent-primary))]'
        : 'border border-white/10';

    const handleCTA = () => {
        setCheckoutError(null);
        if (plan.founding) {
            window.location.href = 'mailto:hello@oast.app?subject=Founding%20Member%20Seat';
            return;
        }
        if (plan.enterprise) {
            onEnquiry?.();
            return;
        }
        if (!plan.tier) return;
        setCheckoutLoading(true);
        onCTAClick(
            plan.tier,
            billingCycle,
            seats,
            plan.includesDeploymentFee ?? false,
            plan.isFoundingMember ?? false,
            setCheckoutLoading,
            setCheckoutError,
        );
    };

    if (plan.founding) {
        return (
            <motion.div
                className="relative bg-[rgb(var(--bg-surface))] flex flex-col p-10 transition-transform duration-200 ease-out hover:scale-[1.02] hover:z-10"
                style={{
                    borderRadius: 0,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#f59e0b',
                    boxShadow: '4px 4px 0px rgba(0,0,0,0.55)',
                }}
                animate={{
                    borderColor: ['#f59e0b', '#fbbf24', '#f59e0b'],
                    boxShadow: [
                        '4px 4px 0px rgba(0,0,0,0.55), 0 0 0 0 rgba(245,158,11,0)',
                        '4px 4px 0px rgba(0,0,0,0.55), 0 0 18px 4px rgba(245,158,11,0.3)',
                        '4px 4px 0px rgba(0,0,0,0.55), 0 0 0 0 rgba(245,158,11,0)',
                    ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
                {/* Badge / Founding Badge */}
                <FoundingBadge spotsRemaining={plan.foundingSpots ?? 0} />

                {/* Plan name */}
                <h3 className="text-xl tracking-wide text-[rgb(var(--text-primary))] mb-2">
                    {plan.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-[rgb(var(--text-muted))] mb-8 leading-relaxed">
                    {plan.description}
                </p>

                {/* Deployment fee block */}
                <div
                    className="border border-white/10 px-4 py-3 mb-6"
                    style={{ borderRadius: 0 }}
                >
                    <p className="text-xs tracking-widest text-[rgb(var(--text-muted))] mb-1">
                        {plan.deploymentFeeLabel}
                    </p>
                    <p className="text-sm text-[rgb(var(--accent-primary))]">
                        {plan.deploymentFee}
                    </p>
                </div>

                {/* Feature list */}
                <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span
                                className="w-[5px] h-[5px] flex-shrink-0 mt-[7px]"
                                style={{ background: '#f59e0b', borderRadius: 0 }}
                            />
                            <span className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                                {feature}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* CTA button */}
                <button
                    onClick={handleCTA}
                    className="w-full py-3 text-xs tracking-widest transition-colors border text-[rgb(var(--text-primary))] bg-transparent hover:bg-white/5"
                    style={{ borderRadius: 0, borderColor: '#f59e0b' }}
                >
                    {plan.cta}
                </button>
            </motion.div>
        );
    }

    return (
        <div
            className={`relative bg-[rgb(var(--bg-surface))] flex flex-col p-10 ${borderClass} transition-transform duration-200 ease-out hover:scale-[1.02] hover:z-10`}
            style={{ borderRadius: 0, boxShadow: '4px 4px 0px rgba(0,0,0,0.55)' }}
        >
            {/* Badge / Founding Badge */}
            {plan.founding ? (
                <FoundingBadge spotsRemaining={plan.foundingSpots ?? 0} />
            ) : (
                <div className="mb-6">
                    <span
                        className={`inline-block text-xs tracking-widest px-3 py-1 ${
                            plan.badgeVariant === 'coral'
                                ? 'bg-[rgb(var(--accent-primary))] text-[rgb(var(--bg-canvas))]'
                                : 'bg-white/10 text-[rgb(var(--text-muted))]'
                        }`}
                        style={{ borderRadius: 0 }}
                    >
                        {plan.badge}
                    </span>
                </div>
            )}

            {/* Plan name */}
            <h3 className="text-xl tracking-wide text-[rgb(var(--text-primary))] mb-2">
                {plan.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-[rgb(var(--text-muted))] mb-8 leading-relaxed">
                {plan.description}
            </p>

            {/* Price block */}
            {plan.pricePerUser !== null ? (
                <div className="mb-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                        {billingCycle === 'annual' && (
                            <span className="text-xl text-[rgb(var(--text-muted))] line-through">
                                £{monthlyPrice}
                            </span>
                        )}
                        <span className="text-5xl text-[rgb(var(--text-primary))]">
                            £{displayPrice}
                        </span>
                        <span className="text-sm text-[rgb(var(--text-muted))]">/user/mo</span>
                    </div>
                    {annualSaving > 0 && (
                        <p className="text-sm text-[rgb(var(--accent-primary))] mt-1">
                            Save £{annualSaving.toLocaleString('en-GB')}/mo with annual
                        </p>
                    )}
                </div>
            ) : (
                <div className="mb-2">
                    <span className="text-4xl font-black text-[rgb(var(--text-primary))] tracking-wider uppercase">
                        CUSTOM
                    </span>
                </div>
            )}

            {/* Deployment fee block */}
            <div
                className="border border-white/10 px-4 py-3 mb-6 mt-4"
                style={{ borderRadius: 0 }}
            >
                <p className="text-xs tracking-widest text-[rgb(var(--text-muted))] mb-1">
                    {plan.deploymentFeeLabel}
                </p>
                <p
                    className={`text-sm ${
                        plan.deploymentFeeHighlight
                            ? 'text-[rgb(var(--accent-primary))]'
                            : 'text-[rgb(var(--text-primary))]'
                    }`}
                >
                    {plan.deploymentFee}
                </p>
            </div>

            {/* Seat calculator (not for enterprise) */}
            {!plan.enterprise && plan.pricePerUser !== null && (
                <div className="mb-6">
                    <SeatCalculator
                        seats={seats}
                        onChange={setSeats}
                        displayPrice={displayPrice}
                        billingCycle={billingCycle}
                        includesDeploymentFee={plan.includesDeploymentFee ?? false}
                    />
                </div>
            )}

            {/* Feature list */}
            <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <span
                            className="w-[5px] h-[5px] bg-[rgb(var(--accent-primary))] flex-shrink-0 mt-[7px]"
                            style={{ borderRadius: 0 }}
                        />
                        <span className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                            {feature}
                        </span>
                    </li>
                ))}
                {plan.lockedFeatures?.map((feature, i) => (
                    <li key={`locked-${i}`} className="flex items-start gap-3" style={{ opacity: 0.45 }}>
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-[rgb(var(--text-muted))] flex-shrink-0 mt-0.5"
                        >
                            <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span className="text-sm text-[rgb(var(--text-muted))] leading-relaxed line-through">
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>

            {/* Inline checkout error */}
            {checkoutError && (
                <p className="text-xs text-[rgb(var(--accent-primary))] mb-3 tracking-wide">
                    {checkoutError}
                </p>
            )}

            {/* CTA button */}
            <button
                onClick={handleCTA}
                disabled={checkoutLoading}
                className={`w-full py-3 text-xs tracking-widest transition-colors ${
                    plan.ctaVariant === 'coral'
                        ? 'bg-[rgb(var(--accent-primary))] text-[rgb(var(--bg-canvas))] hover:opacity-90'
                        : 'border border-white/20 text-[rgb(var(--text-primary))] bg-transparent hover:bg-white/5'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                style={{ borderRadius: 0 }}
            >
                {checkoutLoading ? 'LOADING...' : plan.cta}
            </button>
        </div>
    );
}
