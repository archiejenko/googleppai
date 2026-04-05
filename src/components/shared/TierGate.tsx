import type { ReactNode } from 'react';
import { Lock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTier } from '../../context/TierContext';
import { PRICING } from '../../constants/pricing';

interface TierGateProps {
    children: ReactNode;
    /** Optional preview content shown blurred behind the lock overlay */
    preview?: ReactNode;
}

/**
 * Wraps any Revenue Intelligence UI.
 * Core-tier users see a locked overlay with upgrade CTA.
 * Revenue Intelligence tier users see the children as-is.
 */
export default function TierGate({ children, preview }: TierGateProps) {
    const { isRevIntel, isLoading } = useTier();
    const navigate = useNavigate();

    if (isLoading) return null;

    if (isRevIntel) return <>{children}</>;

    return (
        <div className="relative w-full h-full min-h-[400px]">
            {/* Blurred preview layer */}
            {preview && (
                <div className="pointer-events-none select-none blur-sm opacity-40">
                    {preview}
                </div>
            )}

            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-bg-canvas/80 backdrop-blur-sm">
                <div className="card-os max-w-sm w-full mx-4 p-8 flex flex-col items-center gap-4 text-center border border-border shadow-brutal shadow-accent/20">
                    <div className="w-14 h-14 flex items-center justify-center bg-accent/10 border border-accent/30">
                        <Lock className="w-7 h-7 text-accent" />
                    </div>

                    <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">
                            Revenue Intelligence
                        </p>
                        <h3 className="text-xl text-text-primary">
                            Upgrade to unlock
                        </h3>
                    </div>

                    <p className="text-sm text-text-secondary leading-relaxed">
                        This feature is part of the{' '}
                        <span className="text-accent">Revenue Intelligence</span> tier,
                        which includes Live Call Scoring, Pipeline Health, Competitive Intel,
                        and more.
                    </p>

                    <div className="w-full border border-border p-4 bg-bg-surface flex flex-col gap-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-text-muted text-xs uppercase tracking-widest">Per user</span>
                            <span className="text-2xl text-accent">
                                {PRICING.format(PRICING.REVENUE_INTELLIGENCE.pricePerUserMonthly)}
                                <span className="text-sm text-text-muted">/mo</span>
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-text-muted text-xs uppercase tracking-widest">Onboarding</span>
                            <span className="text-sm text-text-secondary">
                                + {PRICING.format(PRICING.ONBOARDING_FEE)} per business
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/settings/billing')}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <TrendingUp className="w-4 h-4" />
                        View upgrade options
                    </button>

                    <p className="text-[10px] text-text-muted">
                        {PRICING.TRIAL_DAYS}-day free trial available · No card required during trial
                    </p>
                </div>
            </div>
        </div>
    );
}
