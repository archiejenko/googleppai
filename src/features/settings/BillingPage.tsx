import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Clock, CheckCircle, AlertCircle, ExternalLink, Loader2, Activity } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTier } from '../../context/TierContext';
import { PRICING } from '../../constants/pricing';
import UpgradeModal from '../../components/shared/UpgradeModal';

interface UsageSummary {
    event_type: string;
    total_units: number;
    unit_type: string;
}

interface BillingHistoryRow {
    id: string;
    billing_period: string;
    event_type: string;
    units: number;
    unit_type: string;
    billed: boolean;
    created_at: string;
}

interface TokenUsageByFunction {
    function_name: string;
    total_tokens: number;
}

interface MonthlyTokenUsage {
    month: string;
    total_tokens: number;
}

// Fields added by stripe_billing migration
interface OrgBillingExt {
    subscription_status?: string;
    current_period_start?: string;
    current_period_end?: string;
}

export default function BillingPage() {
    const { isAdmin } = useAuth();
    const { org, isRevIntel, isTrialActive, trialDaysRemaining } = useTier();
    const [usage, setUsage] = useState<UsageSummary[]>([]);
    const [history, setHistory] = useState<BillingHistoryRow[]>([]);
    const [loadingUsage, setLoadingUsage] = useState(true);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgrading, setUpgrading] = useState(false);
    const [togglingPortal, setTogglingPortal] = useState(false);
    const [stripeError, setStripeError] = useState('');

    const [tokenUsage, setTokenUsage] = useState<{ total: number; byFunction: TokenUsageByFunction[]; history: MonthlyTokenUsage[] } | null>(null);
    const [loadingTokens, setLoadingTokens] = useState(true);

    const orgExt = org as (typeof org & OrgBillingExt) | null;

    // Detect ?activated=true return from Stripe Checkout
    const activated = useMemo(
        () => new URLSearchParams(window.location.search).get('activated') === 'true',
        []
    );

    const currentPeriod = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    useEffect(() => {
        if (!org) return;
        (async () => {
            const { data } = await supabase
                .from('usage_events')
                .select('event_type, units, unit_type, billed, id, billing_period, created_at')
                .eq('org_id', org.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                setHistory(data as BillingHistoryRow[]);

                const thisMonth = data.filter(r => r.billing_period === currentPeriod);
                const agg: Record<string, { units: number; unit_type: string }> = {};
                for (const row of thisMonth) {
                    if (!agg[row.event_type]) agg[row.event_type] = { units: 0, unit_type: row.unit_type };
                    agg[row.event_type].units += Number(row.units);
                }
                setUsage(Object.entries(agg).map(([event_type, v]) => ({
                    event_type, total_units: v.units, unit_type: v.unit_type,
                })));
            }
            setLoadingUsage(false);
        })();
    }, [org?.id]);

    useEffect(() => {
        if (!org || !isAdmin) { setLoadingTokens(false); return; }
        (async () => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const { data: rows } = await supabase
                .from('token_usage_log')
                .select('function_name, total_tokens, logged_at')
                .eq('org_id', org.id)
                .order('logged_at', { ascending: false })
                .limit(5000);

            if (!rows) { setLoadingTokens(false); return; }

            let currentTotal = 0;
            const fnMap: Record<string, number> = {};
            const monthMap: Record<string, number> = {};

            for (const r of rows) {
                const t = r.total_tokens ?? 0;
                const month = (r.logged_at as string)?.slice(0, 7) ?? 'unknown';
                monthMap[month] = (monthMap[month] ?? 0) + t;

                if (r.logged_at >= monthStart) {
                    currentTotal += t;
                    const fn = r.function_name ?? 'unknown';
                    fnMap[fn] = (fnMap[fn] ?? 0) + t;
                }
            }

            const byFunction = Object.entries(fnMap)
                .map(([function_name, total_tokens]) => ({ function_name, total_tokens }))
                .sort((a, b) => b.total_tokens - a.total_tokens);

            const historyMonths = Object.entries(monthMap)
                .map(([month, total_tokens]) => ({ month, total_tokens }))
                .sort((a, b) => b.month.localeCompare(a.month))
                .slice(0, 3);

            setTokenUsage({ total: currentTotal, byFunction, history: historyMonths });
            setLoadingTokens(false);
        })();
    }, [org?.id, isAdmin]);

    const handleUpgrade = async () => {
        setUpgrading(true);
        setStripeError('');
        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
            body: {
                tier: 'revenue_intelligence',
                seat_count: org?.seatsLicensed ?? 1,
                triggered_from: 'billing_page',
            },
        });
        setUpgrading(false);
        if (data?.checkoutUrl) {
            window.location.href = data.checkoutUrl;
            return;
        }
        // Fallback to manual request if Stripe not configured
        if (!error || (error as { message?: string })?.message?.includes('STRIPE_NOT_CONFIGURED')) {
            setUpgradeModalOpen(true);
        } else {
            setStripeError('Could not start checkout. Please try again or contact sales@oast.ai');
        }
    };

    const handleManagePortal = async () => {
        setTogglingPortal(true);
        setStripeError('');
        const { data, error } = await supabase.functions.invoke('stripe-portal', {});
        setTogglingPortal(false);
        if (data?.portalUrl) {
            window.location.href = data.portalUrl;
            return;
        }
        setStripeError(
            error ? 'Could not open billing portal. Please try again or contact sales@oast.ai' : ''
        );
    };

    const formatDate = (iso?: string) =>
        iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    const StatusChip = ({ status }: { status?: string }) => {
        const map: Record<string, { label: string; pillClass: string }> = {
            active: { label: 'Active', pillClass: 'pill pill-green' },
            trialing: { label: 'Trial', pillClass: 'pill pill-amber' },
            past_due: { label: 'Past Due', pillClass: 'pill pill-coral' },
            cancelled: { label: 'Cancelled', pillClass: 'pill' },
            inactive: { label: 'Inactive', pillClass: 'pill' },
        };
        const s = map[status ?? 'inactive'] ?? map.inactive;
        return (
            <span className={s.pillClass} style={!s.pillClass.includes('pill-') ? { background: 'rgba(74,85,103,0.15)', color: 'rgb(var(--text-muted))' } : undefined}>
                {s.label}
            </span>
        );
    };

    if (!org) {
        return (
            <div className="p-8 text-text-muted text-sm">
                No organisation linked to your account. Contact your administrator.
            </div>
        );
    }

    const monthlyTotal = PRICING.monthlyTotal(org.tier, org.seatsLicensed);

    return (
        <div className="p-6 space-y-5 max-w-5xl">
            {/* Page Header */}
            <div className="flex justify-between items-start mb-5">
                <div>
                    <div className="page-kicker">Intelligence</div>
                    <div className="page-title">Billing</div>
                    <div className="page-desc">Plan details, usage, invoices, and payment management.</div>
                </div>
            </div>

            {/* Activated banner */}
            {activated && (
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4 flex items-center gap-3" style={{ borderColor: 'rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.05)' }}>
                    <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-green)' }} />
                    <p className="text-xs text-[rgb(var(--text-primary))]">
                        Subscription activated — your Revenue Intelligence access is now live.
                    </p>
                </div>
            )}

            {/* Stripe error */}
            {stripeError && (
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4 flex items-center gap-3" style={{ borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.05)' }}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-red)' }} />
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{stripeError}</p>
                </div>
            )}

            {/* Current Plan Card */}
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '18px', fontWeight: 600 }} className="text-[rgb(var(--text-primary))] mb-1">
                            {org.tier === 'revenue_intelligence' ? 'Revenue Intelligence' : 'Core Platform'}
                        </div>
                        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '28px', fontWeight: 600 }} className="mb-2" >
                            <span style={{ color: 'var(--color-coral)' }}>{PRICING.format(org.pricePerSeatGbp)}/user/month</span>
                        </div>
                        <div className="text-xs text-[rgb(var(--text-secondary))] mb-1">
                            Billing cycle: Monthly
                            <span className="ml-2"><StatusChip status={orgExt?.subscription_status} /></span>
                        </div>
                        {isTrialActive && (
                            <div className="flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--color-amber)' }}>
                                <Clock className="w-3 h-3" />
                                Trial: {trialDaysRemaining} days remaining
                            </div>
                        )}
                        {orgExt?.current_period_end && (
                            <div className="text-xs mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgb(var(--text-muted))' }}>
                                Next invoice: {formatDate(orgExt.current_period_end)}
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-[rgb(var(--text-secondary))]">Seats</span>
                            <span className="text-xs font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: 'Oswald, sans-serif' }}>{org.seatsLicensed} licensed</span>
                        </div>
                        <div className="h-bar" style={{ width: '200px' }}>
                            <div className="h-bar-fill" style={{ width: '80%', background: 'var(--color-green)' }}></div>
                        </div>
                    </div>
                    <div>
                        <button
                            onClick={handleManagePortal}
                            disabled={togglingPortal}
                            className="px-4 py-2 rounded-lg bg-transparent border border-[rgb(var(--border-subtle))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] text-[11px] font-semibold transition-colors"
                        >
                            {togglingPortal ? 'Opening...' : 'Change Plan'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Usage This Month */}
            <div>
                {loadingUsage ? (
                    <p className="text-[rgb(var(--text-muted))] text-xs">Loading usage...</p>
                ) : usage.length === 0 ? (
                    <p className="text-[rgb(var(--text-muted))] text-xs">No usage recorded this period.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {usage.map(u => (
                            <div key={u.event_type} className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                                <div className="stat-label capitalize">{u.event_type.replace(/_/g, ' ')}</div>
                                <div className="stat-value text-[rgb(var(--text-primary))]">
                                    {u.total_units.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Billing History */}
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                <div className="card-title">Recent Usage Events</div>
                <table className="table-os">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Event</th>
                            <th>Units</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.slice(0, 20).map(row => (
                            <tr key={row.id}>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{row.billing_period}</td>
                                <td className="capitalize">
                                    {row.event_type.replace(/_/g, ' ')}
                                </td>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                    {Number(row.units).toLocaleString('en-GB', { maximumFractionDigits: 4 })}{' '}
                                    <span className="text-[rgb(var(--text-muted))] text-[10px]">{row.unit_type}</span>
                                </td>
                                <td>
                                    {row.billed
                                        ? <span className="pill pill-green">Paid</span>
                                        : <span className="pill pill-amber">Pending</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {history.length === 0 && (
                    <p className="py-4 text-[rgb(var(--text-muted))] text-xs">No billing history yet.</p>
                )}
            </div>

            {/* Payment Method + Upgrade CTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method — Manage Subscription */}
                {isRevIntel && (
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                        <div className="card-title">Payment Method</div>
                        <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="w-6 h-6 text-[rgb(var(--text-secondary))]" />
                            <div>
                                <div className="text-[13px] text-[rgb(var(--text-primary))] font-medium">Subscription Management</div>
                                <div className="text-[11px] text-[rgb(var(--text-muted))]">Update payment method, view invoices, or cancel via Stripe.</div>
                            </div>
                        </div>
                        <button
                            onClick={handleManagePortal}
                            disabled={togglingPortal}
                            className="px-4 py-2 rounded-lg bg-transparent border border-[rgb(var(--border-subtle))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] text-[11px] font-semibold transition-colors flex items-center gap-2"
                        >
                            {togglingPortal
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening portal...</>
                                : <><ExternalLink className="w-4 h-4" /> Manage</>}
                        </button>
                    </div>
                )}

                {/* Onboarding Fee Card */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                    <div className="card-title">Onboarding Fee</div>
                    <div className="stat-value text-[rgb(var(--text-primary))] mb-2">{PRICING.format(PRICING.ONBOARDING_FEE)}</div>
                    <div className="flex items-center gap-1 text-xs">
                        {org.onboardingFeePaid ? (
                            <span className="pill pill-green">Paid</span>
                        ) : (
                            <span className="pill pill-amber">Pending</span>
                        )}
                    </div>
                </div>

                {/* Upgrade CTA — Core tier */}
                {!isRevIntel && (
                    <div className="bg-[rgb(var(--bg-surface-raised))] rounded-lg p-5" style={{ border: '2px solid var(--color-coral)' }}>
                        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '16px', fontWeight: 600, color: 'var(--color-coral)' }} className="mb-1">
                            Revenue Intelligence Layer
                        </div>
                        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: '24px', fontWeight: 600 }} className="text-[rgb(var(--text-primary))] mb-3">
                            {PRICING.format(PRICING.REVENUE_INTELLIGENCE.pricePerUserMonthly)}/user/month
                        </div>
                        <div className="flex flex-col gap-2 mb-4">
                            {['Live call scoring & analysis', 'Transfer gap intelligence', 'Revenue correlation insights', 'AI coaching recommendations', 'Advanced pipeline analytics'].map((feature) => (
                                <div key={feature} className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    {feature}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleUpgrade}
                            disabled={upgrading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {upgrading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout...</>
                                : 'Upgrade'}
                        </button>
                    </div>
                )}
            </div>

            {/* AI Token Usage (admin only) */}
            {isAdmin && isRevIntel && (
                <div>
                    <div className="card-title flex items-center gap-2">
                        <Activity className="w-4 h-4" /> AI Token Usage
                    </div>
                    {loadingTokens ? (
                        <p className="text-[rgb(var(--text-muted))] text-xs">Loading token usage...</p>
                    ) : !tokenUsage ? (
                        <p className="text-[rgb(var(--text-muted))] text-xs">No token usage data available.</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Allowance and progress bar */}
                            {(() => {
                                const allowance = org!.tokenAllowanceOverride ?? org!.monthlyTokenAllowance * org!.seatsLicensed;
                                const pct = allowance > 0 ? Math.min(100, (tokenUsage.total / allowance) * 100) : 0;
                                const barBg = pct >= 90 ? 'var(--color-red)' : pct >= 75 ? 'var(--color-amber)' : 'var(--color-green)';
                                return (
                                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-[rgb(var(--text-secondary))]">Current month</span>
                                            <span className="text-[rgb(var(--text-primary))]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                                {(tokenUsage.total).toLocaleString('en-GB')} / {allowance.toLocaleString('en-GB')} tokens
                                            </span>
                                        </div>
                                        <div className="h-bar">
                                            <div className="h-bar-fill" style={{ width: `${pct}%`, background: barBg }} />
                                        </div>
                                        <p className="stat-label">
                                            {pct.toFixed(1)}% of monthly allowance
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Breakdown by function */}
                            {tokenUsage.byFunction.length > 0 && (
                                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                    <table className="table-os">
                                        <thead>
                                            <tr>
                                                <th>Function</th>
                                                <th className="text-right">Tokens</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tokenUsage.byFunction.map(fn => (
                                                <tr key={fn.function_name}>
                                                    <td className="capitalize">
                                                        {fn.function_name.replace(/[-_]/g, ' ')}
                                                    </td>
                                                    <td className="text-right" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgb(var(--text-primary))' }}>
                                                        {fn.total_tokens.toLocaleString('en-GB')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Last 3 months history */}
                            {tokenUsage.history.length > 0 && (
                                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 space-y-3">
                                    <div className="stat-label">Monthly History</div>
                                    <div className="space-y-2">
                                        {(() => {
                                            const maxTokens = Math.max(...tokenUsage.history.map(m => m.total_tokens), 1);
                                            return tokenUsage.history.map(m => (
                                                <div key={m.month} className="flex items-center gap-3">
                                                    <span className="text-[10px] w-16" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgb(var(--text-muted))' }}>{m.month}</span>
                                                    <div className="flex-1 h-bar">
                                                        <div
                                                            className="h-bar-fill"
                                                            style={{ width: `${(m.total_tokens / maxTokens) * 100}%`, background: 'var(--color-coral)' }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] w-24 text-right" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgb(var(--text-primary))' }}>
                                                        {m.total_tokens.toLocaleString('en-GB')}
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <UpgradeModal open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
        </div>
    );
}
