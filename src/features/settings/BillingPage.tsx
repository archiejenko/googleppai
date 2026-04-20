import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Users, TrendingUp, Clock, CheckCircle, AlertCircle, ExternalLink, Loader2, Activity } from 'lucide-react';
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
        const map: Record<string, { label: string; cls: string }> = {
            active: { label: 'Active', cls: 'text-status-success border-status-success/30 bg-status-success/10' },
            trialing: { label: 'Trial', cls: 'text-status-warning border-status-warning/30 bg-status-warning/10' },
            past_due: { label: 'Past Due', cls: 'text-status-danger border-status-danger/30 bg-status-danger/10' },
            cancelled: { label: 'Cancelled', cls: 'text-text-muted border-border bg-bg-raised' },
            inactive: { label: 'Inactive', cls: 'text-text-muted border-border bg-bg-raised' },
        };
        const s = map[status ?? 'inactive'] ?? map.inactive;
        return (
            <span className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 ${s.cls}`}>
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
        <div className="p-6 space-y-6 max-w-4xl">
            <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">Settings</p>
                <h1 className="text-2xl text-text-primary">Billing</h1>
            </div>

            {/* Activated banner */}
            {activated && (
                <div className="card-os p-4 border border-status-success/40 bg-status-success/5 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-status-success flex-shrink-0" />
                    <p className="text-sm text-text-primary">
                        Subscription activated — your Revenue Intelligence access is now live.
                    </p>
                </div>
            )}

            {/* Stripe error */}
            {stripeError && (
                <div className="card-os p-4 border border-status-danger/40 bg-status-danger/5 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-status-danger flex-shrink-0" />
                    <p className="text-sm text-text-secondary">{stripeError}</p>
                </div>
            )}

            {/* Current Plan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-os p-5 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-widest">
                        <CreditCard className="w-4 h-4" /> Current Tier
                    </div>
                    <p className="text-xl text-text-primary">
                        {org.tier === 'revenue_intelligence' ? 'Revenue Intelligence' : 'Core Platform'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-accent text-sm">
                            {PRICING.format(org.pricePerSeatGbp)}/user/mo
                        </p>
                        <StatusChip status={orgExt?.subscription_status} />
                    </div>
                    {isTrialActive && (
                        <div className="flex items-center gap-1 text-status-warning text-xs">
                            <Clock className="w-3 h-3" />
                            Trial: {trialDaysRemaining} days remaining
                        </div>
                    )}
                    {orgExt?.current_period_end && (
                        <p className="text-text-muted text-xs">
                            Renews {formatDate(orgExt.current_period_end)}
                        </p>
                    )}
                </div>

                <div className="card-os p-5 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-widest">
                        <Users className="w-4 h-4" /> Licensed Seats
                    </div>
                    <p className="text-xl text-text-primary">{org.seatsLicensed}</p>
                    <p className="text-text-secondary text-sm">
                        Monthly total: <span className="text-accent">{PRICING.format(monthlyTotal)}</span>
                    </p>
                </div>

                <div className="card-os p-5 border border-border space-y-2">
                    <div className="flex items-center gap-2 text-text-muted text-xs uppercase tracking-widest">
                        <CheckCircle className="w-4 h-4" /> Onboarding Fee
                    </div>
                    <p className="text-xl text-text-primary">
                        {PRICING.format(PRICING.ONBOARDING_FEE)}
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                        {org.onboardingFeePaid ? (
                            <><CheckCircle className="w-3 h-3 text-status-success" />
                                <span className="text-status-success">Paid</span></>
                        ) : (
                            <><AlertCircle className="w-3 h-3 text-status-warning" />
                                <span className="text-status-warning">Pending</span></>
                        )}
                    </div>
                </div>
            </div>

            {/* Upgrade CTA — Core tier */}
            {!isRevIntel && (
                <div className="card-os p-6 border border-accent/30 bg-accent/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="text-text-primary mb-1 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-accent" />
                            Upgrade to Revenue Intelligence
                        </p>
                        <p className="text-text-muted text-sm">
                            {PRICING.format(PRICING.REVENUE_INTELLIGENCE.pricePerUserMonthly)}/user/mo
                            · Live Scoring, Pipeline Health, Competitive Intel & more
                        </p>
                    </div>
                    <button
                        onClick={handleUpgrade}
                        disabled={upgrading}
                        className="btn-primary whitespace-nowrap flex-shrink-0 flex items-center gap-2"
                    >
                        {upgrading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                            : 'Upgrade Now'}
                    </button>
                </div>
            )}

            {/* Manage Subscription — Rev Intel tier */}
            {isRevIntel && (
                <div className="card-os p-5 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <p className="text-text-primary mb-1">Subscription Management</p>
                        <p className="text-text-muted text-sm">
                            Update payment method, view invoices, change seats or cancel via Stripe.
                        </p>
                    </div>
                    <button
                        onClick={handleManagePortal}
                        disabled={togglingPortal}
                        className="btn-ghost whitespace-nowrap flex-shrink-0 flex items-center gap-2 border border-border px-4 py-2"
                    >
                        {togglingPortal
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening portal…</>
                            : <><ExternalLink className="w-4 h-4" /> Manage Subscription</>}
                    </button>
                </div>
            )}

            {/* This Month's Usage */}
            <div>
                <h2 className="text-sm text-text-muted uppercase tracking-widest mb-3">
                    Usage — {currentPeriod}
                </h2>
                {loadingUsage ? (
                    <p className="text-text-muted text-sm">Loading…</p>
                ) : usage.length === 0 ? (
                    <p className="text-text-muted text-sm">No usage recorded this period.</p>
                ) : (
                    <div className="card-os border border-border divide-y divide-border">
                        {usage.map(u => (
                            <div key={u.event_type} className="flex items-center justify-between px-5 py-3 text-sm">
                                <span className="text-text-secondary capitalize">
                                    {u.event_type.replace(/_/g, ' ')}
                                </span>
                                <span className="text-text-primary font-mono">
                                    {u.total_units.toLocaleString('en-GB', { maximumFractionDigits: 2 })}{' '}
                                    <span className="text-text-muted text-xs">{u.unit_type}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Billing History */}
            <div>
                <h2 className="text-sm text-text-muted uppercase tracking-widest mb-3">
                    Recent Usage Events
                </h2>
                <div className="card-os border border-border overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
                                <th className="px-5 py-3 text-left">Period</th>
                                <th className="px-5 py-3 text-left">Event</th>
                                <th className="px-5 py-3 text-right">Units</th>
                                <th className="px-5 py-3 text-center">Billed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {history.slice(0, 20).map(row => (
                                <tr key={row.id} className="hover:bg-bg-raised transition-colors">
                                    <td className="px-5 py-3 text-text-muted font-mono text-xs">{row.billing_period}</td>
                                    <td className="px-5 py-3 text-text-secondary capitalize">
                                        {row.event_type.replace(/_/g, ' ')}
                                    </td>
                                    <td className="px-5 py-3 text-right text-text-primary font-mono">
                                        {Number(row.units).toLocaleString('en-GB', { maximumFractionDigits: 4 })}{' '}
                                        <span className="text-text-muted text-xs">{row.unit_type}</span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        {row.billed
                                            ? <CheckCircle className="w-4 h-4 text-status-success mx-auto" />
                                            : <Clock className="w-4 h-4 text-text-muted mx-auto" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {history.length === 0 && (
                        <p className="px-5 py-4 text-text-muted text-sm">No billing history yet.</p>
                    )}
                </div>
            </div>

            {/* AI Token Usage (admin only) */}
            {isAdmin && isRevIntel && (
                <div>
                    <h2 className="text-sm text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> AI Token Usage
                    </h2>
                    {loadingTokens ? (
                        <p className="text-text-muted text-sm">Loading token usage...</p>
                    ) : !tokenUsage ? (
                        <p className="text-text-muted text-sm">No token usage data available.</p>
                    ) : (
                        <div className="space-y-4">
                            {/* Allowance and progress bar */}
                            {(() => {
                                const allowance = org!.tokenAllowanceOverride ?? org!.monthlyTokenAllowance * org!.seatsLicensed;
                                const pct = allowance > 0 ? Math.min(100, (tokenUsage.total / allowance) * 100) : 0;
                                const barColor = pct >= 90 ? 'bg-status-danger' : pct >= 75 ? 'bg-status-warning' : 'bg-accent';
                                return (
                                    <div className="card-os border border-border p-5 space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-text-secondary">Current month</span>
                                            <span className="text-text-primary font-mono">
                                                {(tokenUsage.total).toLocaleString('en-GB')} / {allowance.toLocaleString('en-GB')} tokens
                                            </span>
                                        </div>
                                        <div className="w-full bg-bg-raised h-3 border border-border">
                                            <div className={`${barColor} h-full transition-all`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest">
                                            {pct.toFixed(1)}% of monthly allowance
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Breakdown by function */}
                            {tokenUsage.byFunction.length > 0 && (
                                <div className="card-os border border-border overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
                                                <th className="px-5 py-3 text-left">Function</th>
                                                <th className="px-5 py-3 text-right">Tokens</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {tokenUsage.byFunction.map(fn => (
                                                <tr key={fn.function_name} className="hover:bg-bg-raised transition-colors">
                                                    <td className="px-5 py-3 text-text-secondary capitalize">
                                                        {fn.function_name.replace(/[-_]/g, ' ')}
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-text-primary font-mono">
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
                                <div className="card-os border border-border p-5 space-y-3">
                                    <p className="text-[10px] uppercase tracking-widest text-text-muted">Monthly History</p>
                                    <div className="space-y-2">
                                        {(() => {
                                            const maxTokens = Math.max(...tokenUsage.history.map(m => m.total_tokens), 1);
                                            return tokenUsage.history.map(m => (
                                                <div key={m.month} className="flex items-center gap-3">
                                                    <span className="text-xs text-text-muted font-mono w-16">{m.month}</span>
                                                    <div className="flex-1 bg-bg-raised h-4 border border-border">
                                                        <div
                                                            className="bg-accent h-full transition-all"
                                                            style={{ width: `${(m.total_tokens / maxTokens) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-text-primary font-mono w-24 text-right">
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
