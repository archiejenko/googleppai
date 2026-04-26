import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, AlertCircle, BarChart3, Target, Layers, Zap,
    ArrowRight, RefreshCw, Mic, BarChart2, X, ChevronDown,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Area,
} from 'recharts';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';
import { useTier } from '../../context/TierContext';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../../utils/supabase';
import PreCallBrief from './PreCallBrief';
import ManagerCoachingView from './ManagerCoachingView';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpportunityItem {
    id: string;
    company_name?: string | null;
    deal_value_gbp?: number | null;
    recovery_score?: number | null;
    lost_reason_category?: string | null;
}

interface CompetitorItem {
    competitor_name: string;
    mention_count: number;
    win_rate?: number | null;
}

interface SynergyItem {
    account_a: string;
    account_b: string;
    opportunity_type: string;
}

interface PipelineSummary {
    open_deals_count?: number;
}

interface Summary {
    opps?: OpportunityItem[];
    pipeline?: PipelineSummary;
    competitive?: CompetitorItem[];
    synergies?: SynergyItem[];
}

interface TransferGapData {
    delivery_gap_score: number | null;
    readiness_gap_score: number | null;
    talk_ratio_training: number | null;
    talk_ratio_live: number | null;
    discovery_training: number | null;
    discovery_live: number | null;
    meddic_avg: number | null;
    deal_win_rate: number | null;
    sample_size_live: number;
    sample_size_training: number;
    insufficient_deal_data: boolean;
    proxy_only: boolean;
}

interface BenchmarkRow {
    metric: string;
    industry: string | null;
    company_size: string | null;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    sample_size: number;
}

interface WinLossData {
    insufficient_data?: boolean;
    sample_size_won: number;
    sample_size_lost: number;
    won_avg_discovery: number | null;
    lost_avg_discovery: number | null;
    won_avg_objection_handling: number | null;
    lost_avg_objection_handling: number | null;
    won_avg_engagement: number | null;
    lost_avg_engagement: number | null;
    won_avg_talk_ratio: number | null;
    lost_avg_talk_ratio: number | null;
    won_avg_meddic: number | null;
    lost_avg_meddic: number | null;
}

interface TransferGapAlert {
    id: string;
    alert_type: 'delivery_gap_widened' | 'readiness_gap_widened' | 'both_widened';
    delta_delivery: number | null;
    delta_readiness: number | null;
    created_at: string;
}

interface CoachingRecommendation {
    title: string;
    detail: string;
    drill_type: 'roleplay' | 'pitch' | 'meddic' | 'discovery';
    priority: 1 | 2 | 3;
}

interface CoachingProfile {
    primary_gap: 'delivery' | 'readiness' | 'both' | 'none';
    top_recommendation: string;
    recommendations: CoachingRecommendation[];
    generated_at: string;
    delivery_gap_score: number | null;
    readiness_gap_score: number | null;
}

interface ModuleCard {
    key: string;
    label: string;
    icon: typeof TrendingUp;
    description: string;
    stat: string | null;
    statLabel: string;
    action?: string;
}

// ── Benchmark helpers (unchanged logic) ──────────────────────────────────────

const BENCHMARK_METRIC_MAP: Record<string, { label: string; dataKey: keyof TransferGapData }> = {
    delivery_gap: { label: 'Delivery Gap', dataKey: 'delivery_gap_score' },
    readiness_gap: { label: 'Readiness Gap', dataKey: 'readiness_gap_score' },
    talk_ratio_gap: { label: 'Talk Ratio Gap', dataKey: 'talk_ratio_training' },
    discovery_gap: { label: 'Discovery Gap', dataKey: 'discovery_training' },
};

const WIN_LOSS_DIMENSIONS: Array<{ key: string; label: string; wonKey: keyof WinLossData; lostKey: keyof WinLossData }> = [
    { key: 'discovery', label: 'Discovery', wonKey: 'won_avg_discovery', lostKey: 'lost_avg_discovery' },
    { key: 'objection', label: 'Objection Handling', wonKey: 'won_avg_objection_handling', lostKey: 'lost_avg_objection_handling' },
    { key: 'engagement', label: 'Engagement', wonKey: 'won_avg_engagement', lostKey: 'lost_avg_engagement' },
    { key: 'talk_ratio', label: 'Talk Ratio', wonKey: 'won_avg_talk_ratio', lostKey: 'lost_avg_talk_ratio' },
    { key: 'meddic', label: 'MEDDIC', wonKey: 'won_avg_meddic', lostKey: 'lost_avg_meddic' },
];

const ALERT_MESSAGES: Record<string, (delta_d: number | null, delta_r: number | null) => string> = {
    delivery_gap_widened: (d) =>
        `Your Delivery Gap widened by ${Math.round(Math.abs(d ?? 0))} points this week. Your live call scores are falling further from your training scores.`,
    readiness_gap_widened: (_, r) =>
        `Your Readiness Gap widened by ${Math.round(Math.abs(r ?? 0))} points this week. MEDDIC execution or win rate has dropped.`,
    both_widened: () =>
        'Both your Delivery Gap and Readiness Gap widened this week. Review your AI coaching recommendations.',
};

// ── Token Usage Warning Banner (admin only) ─────────────────────────────────

interface TokenWarning {
    id: string;
    threshold: number;
    tokens_used: number;
    tokens_allowed: number;
    sent_at: string;
    acknowledged_at: string | null;
}

function TokenUsageBanner() {
    const { session, isAdmin } = useAuth();
    const { org } = useTier();
    const [warning, setWarning] = useState<TokenWarning | null>(null);

    useEffect(() => {
        if (!isAdmin || !org?.id) return;
        (async () => {
            const { data } = await supabase
                .from('token_usage_warnings')
                .select('id, threshold, tokens_used, tokens_allowed, sent_at, acknowledged_at')
                .eq('org_id', org.id)
                .is('acknowledged_at', null)
                .order('sent_at', { ascending: false })
                .limit(1);
            if (data && data.length > 0) setWarning(data[0]);
        })();
    }, [isAdmin, org?.id]);

    if (!warning) return null;

    const acknowledge = async () => {
        if (!session?.user?.id) return;
        await supabase
            .from('token_usage_warnings')
            .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: session.user.id })
            .eq('id', warning.id);
        setWarning(null);
    };

    const bannerConfig: Record<number, { cls: string; text: string }> = {
        75: {
            cls: 'border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.05)]',
            text: 'Your team has used 75% of your monthly AI allowance. No action needed, plenty of headroom remains.',
        },
        90: {
            cls: 'border-[rgba(255,107,107,0.4)] bg-[rgba(255,107,107,0.05)]',
            text: 'Your team has used 90% of your monthly AI allowance. Usage continues uninterrupted. Contact us if you expect consistently high usage.',
        },
        100: {
            cls: 'border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.05)]',
            text: 'Your team has exceeded the monthly fair use allowance. Access continues. We will be in touch.',
        },
    };

    const config = bannerConfig[warning.threshold] ?? bannerConfig[100];

    return (
        <div className={`card-os p-4 ${config.cls} flex items-start justify-between gap-3`}>
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[rgb(var(--text-muted))] flex-shrink-0 mt-0.5" />
                <p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{config.text}</p>
            </div>
            <button
                onClick={acknowledge}
                className="btn-ghost text-[10px] uppercase tracking-widest px-3 py-1.5 flex-shrink-0"
            >
                Acknowledge
            </button>
        </div>
    );
}

// ── Alert Banners ────────────────────────────────────────────────────────────

function AlertBanners() {
    const { session } = useAuth();
    const [alerts, setAlerts] = useState<TransferGapAlert[]>([]);

    useEffect(() => {
        if (!session?.user?.id) return;
        (async () => {
            const { data } = await supabase
                .from('transfer_gap_alerts')
                .select('id, alert_type, delta_delivery, delta_readiness, created_at')
                .eq('user_id', session.user.id)
                .is('notified_at', null)
                .order('created_at', { ascending: false })
                .limit(3);
            if (data) setAlerts(data);
        })();
    }, [session?.user?.id]);

    const dismiss = async (alertId: string) => {
        await supabase
            .from('transfer_gap_alerts')
            .update({ notified_at: new Date().toISOString() })
            .eq('id', alertId);
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    };

    if (alerts.length === 0) return null;

    return (
        <div className="space-y-2">
            {alerts.map(alert => (
                <div
                    key={alert.id}
                    className="card-os p-4 border-l-4 flex items-start justify-between gap-3"
                    style={{ borderLeftColor: 'var(--color-coral)' }}
                >
                    <p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                        {ALERT_MESSAGES[alert.alert_type]?.(alert.delta_delivery, alert.delta_readiness) ?? 'Gap alert detected.'}
                    </p>
                    <button onClick={() => dismiss(alert.id)} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ── Transfer Gap Section ──────────────────────────────────────────────────────

function TransferGapSection({ authHeader }: { authHeader: string }) {
    const [periodDays, setPeriodDays] = useState(30);
    const [data, setData] = useState<TransferGapData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchGap = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${SUPABASE_FUNCTIONS_URL}/transfer-gap?period_days=${periodDays}`,
                { headers: { Authorization: authHeader } },
            );
            const json = await res.json();
            setData(json.data ?? null);
        } catch (e) {
            console.error('[TransferGap] fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [authHeader, periodDays]);

    useEffect(() => { fetchGap(); }, [fetchGap]);

    const isEmpty =
        !loading &&
        data !== null &&
        ((data.sample_size_live ?? 0) < 3 || (data.sample_size_training ?? 0) < 3);

    return (
        <div className="card-os space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="card-title mb-0.5">Transfer Gap Analysis</p>
                    <p className="text-[11px]" style={{ color: 'rgb(var(--text-muted))' }}>Training performance vs live call execution</p>
                </div>
                <div className="flex gap-1">
                    {[30, 60, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setPeriodDays(d)}
                            className={`filter-pill text-[10px] ${periodDays === d ? 'active' : ''}`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-32 rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />
                    <div className="h-32 rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />
                </div>
            )}

            {isEmpty && (
                <p className="text-sm py-4" style={{ color: 'rgb(var(--text-muted))' }}>
                    Not enough data yet. Complete more training sessions and calls to generate your Transfer Gap.
                </p>
            )}

            {!loading && !isEmpty && data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Delivery Gap */}
                    <div className="space-y-4">
                        <p className="stat-label border-b pb-2" style={{ borderColor: 'rgb(var(--border-default))' }}>
                            Delivery Gap
                        </p>
                        {/* Talk Ratio */}
                        <div className="space-y-1">
                            <p className="stat-label">Talk Ratio</p>
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                <span className="w-16 text-right">Training</span>
                                <div className="h-bar flex-1">
                                    <div className="h-bar-fill" style={{ width: `${Math.min(100, data.talk_ratio_training ?? 0)}%`, background: 'var(--color-coral)' }} />
                                </div>
                                <span className="w-8 font-mono">{Math.round(data.talk_ratio_training ?? 0)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                <span className="w-16 text-right">Live</span>
                                <div className="h-bar flex-1">
                                    <div className="h-bar-fill" style={{ width: `${Math.min(100, data.talk_ratio_live ?? 0)}%`, background: 'rgb(var(--text-muted))' }} />
                                </div>
                                <span className="w-8 font-mono">{Math.round(data.talk_ratio_live ?? 0)}</span>
                            </div>
                        </div>
                        {/* Discovery */}
                        <div className="space-y-1">
                            <p className="stat-label">Discovery</p>
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                <span className="w-16 text-right">Training</span>
                                <div className="h-bar flex-1">
                                    <div className="h-bar-fill" style={{ width: `${Math.min(100, data.discovery_training ?? 0)}%`, background: 'var(--color-coral)' }} />
                                </div>
                                <span className="w-8 font-mono">{Math.round(data.discovery_training ?? 0)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                <span className="w-16 text-right">Live</span>
                                <div className="h-bar flex-1">
                                    <div className="h-bar-fill" style={{ width: `${Math.min(100, data.discovery_live ?? 0)}%`, background: 'rgb(var(--text-muted))' }} />
                                </div>
                                <span className="w-8 font-mono">{Math.round(data.discovery_live ?? 0)}</span>
                            </div>
                        </div>
                        {data.delivery_gap_score !== null && (
                            <div className="text-center">
                                <p className="stat-value font-mono" style={{ color: data.delivery_gap_score >= 70 ? 'var(--color-coral)' : data.delivery_gap_score >= 40 ? 'var(--color-amber)' : 'var(--color-green)' }}>
                                    {Math.round(data.delivery_gap_score)}
                                </p>
                                <p className="stat-label mt-0.5">Delivery Gap Score</p>
                            </div>
                        )}
                    </div>

                    {/* Readiness Gap */}
                    <div className="space-y-4">
                        <p className="stat-label border-b pb-2" style={{ borderColor: 'rgb(var(--border-default))' }}>
                            Readiness Gap
                        </p>
                        {data.meddic_avg !== null && (
                            <div className="space-y-1">
                                <p className="stat-label">MEDDIC Avg</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-bar flex-1">
                                        <div className="h-bar-fill" style={{ width: `${Math.min(100, data.meddic_avg)}%`, background: 'var(--color-coral)' }} />
                                    </div>
                                    <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-primary))' }}>{Math.round(data.meddic_avg)}</span>
                                </div>
                            </div>
                        )}
                        {!data.insufficient_deal_data && data.deal_win_rate !== null && (
                            <div className="space-y-1">
                                <p className="stat-label">Win Rate</p>
                                <p className="text-lg font-mono" style={{ color: 'rgb(var(--text-primary))' }}>{data.deal_win_rate.toFixed(1)}%</p>
                            </div>
                        )}
                        {data.readiness_gap_score !== null && (
                            <div className="text-center">
                                <p className="stat-value font-mono" style={{ color: data.readiness_gap_score >= 70 ? 'var(--color-coral)' : data.readiness_gap_score >= 40 ? 'var(--color-amber)' : 'var(--color-green)' }}>
                                    {Math.round(data.readiness_gap_score)}
                                </p>
                                <p className="stat-label mt-0.5">Readiness Gap Score</p>
                            </div>
                        )}
                        {data.insufficient_deal_data && (
                            <p className="text-[10px] border-l-2 pl-3" style={{ color: 'rgb(var(--text-muted))', borderColor: 'rgb(var(--border-default))' }}>
                                Win rate data requires 5+ logged deals. Showing MEDDIC readiness score only.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {!loading && !isEmpty && data && (
                <BenchmarkPanel authHeader={authHeader} periodDays={periodDays} gapData={data} />
            )}
        </div>
    );
}

// ── Benchmark Panel ──────────────────────────────────────────────────────────

function BenchmarkPanel({ authHeader, periodDays, gapData }: { authHeader: string; periodDays: number; gapData: TransferGapData | null }) {
    const { org } = useTier();
    const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('transfer_gap_benchmarks')
                    .select('*')
                    .order('computed_at', { ascending: false })
                    .limit(50);
                if (!error && data) setBenchmarks(data);
            } catch (e) {
                console.error('[Benchmarks] fetch error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [authHeader, periodDays]);

    if (loading) return <div className="h-16 rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />;
    if (benchmarks.length === 0) {
        return <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Benchmarks will appear once enough platform data is available.</p>;
    }

    const orgIndustry = (org as Record<string, unknown> | null)?.industry as string | null ?? null;
    const orgCompanySize = (org as Record<string, unknown> | null)?.company_size as string | null ?? null;

    const getBenchmark = (metric: string): BenchmarkRow | null => {
        if (orgIndustry) {
            const byIndustry = benchmarks.find(b => b.metric === metric && b.industry === orgIndustry);
            if (byIndustry && byIndustry.sample_size >= 10) return byIndustry;
        }
        if (orgCompanySize) {
            const bySize = benchmarks.find(b => b.metric === metric && b.company_size === orgCompanySize);
            if (bySize && bySize.sample_size >= 10) return bySize;
        }
        const global = benchmarks.find(b => b.metric === metric && !b.industry && !b.company_size);
        return global && global.sample_size >= 10 ? global : null;
    };

    const benchmarkSource = orgIndustry ? 'Industry benchmark' : 'Platform benchmark';

    return (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--border-default))' }}>
            <div className="flex items-center justify-between">
                <p className="stat-label">How You Compare</p>
                <span className="text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>{benchmarkSource}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Object.entries(BENCHMARK_METRIC_MAP).map(([metric, { label, dataKey }]) => {
                    const bm = getBenchmark(metric);
                    if (!bm) {
                        return (
                            <div key={metric} className="space-y-1">
                                <p className="text-xs" style={{ color: 'rgb(var(--text-primary))' }}>{label}</p>
                                <p className="text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>Not enough platform data yet to benchmark this metric.</p>
                            </div>
                        );
                    }
                    const userScore = gapData ? (gapData[dataKey] as number | null) : null;
                    if (userScore === null) {
                        return (
                            <div key={metric} className="space-y-1">
                                <p className="text-xs" style={{ color: 'rgb(var(--text-primary))' }}>{label}</p>
                                <p className="text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>Complete more sessions to see your position.</p>
                            </div>
                        );
                    }
                    const clamp = (v: number) => Math.max(0, Math.min(100, v));
                    return (
                        <div key={metric} className="space-y-1 pb-4">
                            <p className="text-xs" style={{ color: 'rgb(var(--text-primary))' }}>
                                {label}: <span className="font-mono" style={{ color: 'var(--color-coral)' }}>{Math.round(userScore)}</span>
                            </p>
                            <div className="relative h-6 rounded" style={{ background: 'rgb(var(--bg-surface-raised))', border: '1px solid rgb(var(--border-default))' }}>
                                <div className="absolute top-0 bottom-0" style={{ left: `${clamp(bm.p75)}%`, borderRight: '1px solid rgb(var(--border-default))' }} />
                                <div className="absolute top-0 bottom-0" style={{ left: `${clamp(bm.p50)}%`, borderRight: '1px solid rgba(255,107,107,0.4)' }} />
                                <div className="absolute top-0 bottom-0" style={{ left: `${clamp(bm.p25)}%`, borderRight: '1px solid rgb(var(--border-default))' }} />
                                <div className="absolute top-0 bottom-0 w-1" style={{ left: `${clamp(userScore)}%`, background: 'var(--color-coral)' }} />
                                <div className="absolute -bottom-4 flex justify-between w-full text-[8px]" style={{ color: 'rgb(var(--text-muted))' }}>
                                    <span style={{ left: `${clamp(bm.p75)}%`, position: 'absolute', transform: 'translateX(-50%)' }}>Top 25%</span>
                                    <span style={{ left: `${clamp(bm.p50)}%`, position: 'absolute', transform: 'translateX(-50%)' }}>Median</span>
                                    <span style={{ left: `${clamp(bm.p25)}%`, position: 'absolute', transform: 'translateX(-50%)' }}>Bottom 25%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── AI Revenue Coaching Section ───────────────────────────────────────────────

function CoachingSection({ authHeader }: { authHeader: string }) {
    const [profile, setProfile] = useState<CoachingProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCoaching = useCallback(async () => {
        try {
            const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/ai-revenue-coaching`, {
                headers: { Authorization: authHeader },
            });
            const json = await res.json();
            setProfile(json.data ?? null);
        } catch (e) {
            console.error('[Coaching] fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authHeader]);

    useEffect(() => { fetchCoaching(); }, [fetchCoaching]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchCoaching();
    };

    const GAP_LABELS: Record<string, string> = {
        delivery: 'Delivery Gap',
        readiness: 'Readiness Gap',
        both: 'Delivery + Readiness',
        none: 'No Gap Detected',
    };

    return (
        <div className="card-os space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="card-title mb-0.5">AI Revenue Coaching</p>
                    {profile?.generated_at && (
                        <p className="text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>
                            Last generated: {new Date(profile.generated_at).toLocaleDateString('en-GB')}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    className="btn-ghost flex items-center gap-[5px] text-xs px-3 py-[6px] rounded-lg"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading && <div className="h-24 rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />}

            {!loading && !profile && (
                <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No coaching profile yet. Click Refresh to generate.</p>
            )}

            {!loading && profile && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="pill pill-coral">
                            {GAP_LABELS[profile.primary_gap] ?? profile.primary_gap}
                        </span>
                    </div>

                    {profile.top_recommendation && (
                        <div className="border-l-2 pl-4" style={{ borderColor: 'var(--color-coral)' }}>
                            <p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{profile.top_recommendation}</p>
                        </div>
                    )}

                    {(profile.recommendations ?? []).length > 0 && (
                        <div className="space-y-3">
                            {profile.recommendations.slice(0, 3).map((rec, i) => (
                                <div key={i} className="card-os p-4 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span style={{ color: 'var(--color-coral)' }}>
                                                {(rec.drill_type === 'roleplay' || rec.drill_type === 'pitch')
                                                    ? <Mic className="w-3.5 h-3.5" />
                                                    : <BarChart2 className="w-3.5 h-3.5" />}
                                            </span>
                                            <p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{rec.title}</p>
                                        </div>
                                        <span className="pill" style={{ color: 'rgb(var(--text-muted))' }}>
                                            P{rec.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs pl-6" style={{ color: 'rgb(var(--text-muted))' }}>{rec.detail}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Win/Loss Analysis Section ────────────────────────────────────────────────

function WinLossSection({ authHeader }: { authHeader: string }) {
    const { isAdmin } = useAuth();
    const [scope, setScope] = useState<'rep' | 'team'>('rep');
    const [periodDays, setPeriodDays] = useState(90);
    const [data, setData] = useState<WinLossData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchWinLoss = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${SUPABASE_FUNCTIONS_URL}/win-loss-analysis?period_days=${periodDays}&scope=${scope}`,
                { headers: { Authorization: authHeader } },
            );
            const json = await res.json();
            setData(json.data ?? null);
        } catch (e) {
            console.error('[WinLoss] fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [authHeader, periodDays, scope]);

    useEffect(() => { fetchWinLoss(); }, [fetchWinLoss]);

    /* Derive per-rep stacked bars from the aggregate win/loss data */
    const repRows = useMemo(() => {
        if (!data || data.insufficient_data) return [];
        return WIN_LOSS_DIMENSIONS.map(({ key, label, wonKey, lostKey }) => {
            const won = (data[wonKey] as number | null) ?? 0;
            const lost = (data[lostKey] as number | null) ?? 0;
            if (won === 0 && lost === 0) return null;
            const total = won + lost;
            const winPct = total > 0 ? Math.round((won / total) * 100) : 0;
            const losePct = 100 - winPct;
            return { key, label, won: Math.round(won), lost: Math.round(lost), winPct, losePct };
        }).filter(Boolean) as Array<{ key: string; label: string; won: number; lost: number; winPct: number; losePct: number }>;
    }, [data]);

    return (
        <div className="card-os space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="card-title mb-0.5">Win / Loss by Rep</p>
                    <p className="text-[11px]" style={{ color: 'rgb(var(--text-muted))' }}>Deal outcomes over the selected period.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex gap-1">
                        {(['rep', 'team'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={`filter-pill text-[10px] ${scope === s ? 'active' : ''}`}
                            >
                                {s === 'rep' ? 'Rep' : 'Team'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        {[30, 60, 90].map(d => (
                            <button
                                key={d}
                                onClick={() => setPeriodDays(d)}
                                className={`filter-pill text-[10px] ${periodDays === d ? 'active' : ''}`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && <div className="h-32 rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />}

            {!loading && scope === 'team' && !isAdmin && (
                <p className="text-sm py-4" style={{ color: 'rgb(var(--text-muted))' }}>Team view is available to managers only.</p>
            )}

            {!loading && data?.insufficient_data && (
                <p className="text-sm py-4" style={{ color: 'rgb(var(--text-muted))' }}>
                    Not enough won and lost deals to generate analysis. Log at least 3 deals in each outcome to unlock this view.
                </p>
            )}

            {!loading && !data?.insufficient_data && repRows.length > 0 && !(scope === 'team' && !isAdmin) && (
                <>
                    <div className="space-y-3">
                        {repRows.map(row => (
                            <div key={row.key} className="flex items-center gap-3">
                                <div className="w-[80px] text-[11px] font-medium text-right" style={{ color: 'rgb(var(--text-secondary))' }}>
                                    {row.label}
                                </div>
                                <div className="flex flex-1 h-[22px] rounded overflow-hidden gap-[2px]">
                                    {row.winPct > 0 && (
                                        <div
                                            className="flex items-center justify-center text-[9px] font-bold"
                                            style={{ width: `${row.winPct}%`, background: 'var(--color-green)', color: '#000' }}
                                        >
                                            {row.won}
                                        </div>
                                    )}
                                    {row.losePct > 0 && (
                                        <div
                                            className="flex items-center justify-center text-[9px] font-bold"
                                            style={{ width: `${row.losePct}%`, background: 'var(--color-coral)' }}
                                        >
                                            {row.lost}
                                        </div>
                                    )}
                                </div>
                                <div
                                    className="text-xs font-semibold min-w-[36px] text-right"
                                    style={{ color: row.winPct >= 50 ? 'var(--color-green)' : row.winPct >= 30 ? 'var(--color-amber)' : 'var(--color-coral)' }}
                                >
                                    {row.winPct}%
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Legend */}
                    <div className="flex gap-4 mt-3 text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'var(--color-green)' }} />Won
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'var(--color-coral)' }} />Lost
                        </span>
                    </div>
                </>
            )}

            {!loading && !data?.insufficient_data && repRows.length === 0 && !(scope === 'team' && !isAdmin) && (
                <p className="text-sm py-4" style={{ color: 'rgb(var(--text-muted))' }}>No win/loss data available for this period.</p>
            )}
        </div>
    );
}

// ── Revenue Trend Section (line chart via Recharts) ──────────────────────────

function RevenueTrendSection({ authHeader, summary, loading: parentLoading }: {
    authHeader: string;
    summary: Summary;
    loading: boolean;
}) {
    /* Derive monthly trend from opportunities if available */
    const trendData = useMemo(() => {
        const opps = summary.opps ?? [];
        if (opps.length === 0) return [];
        /* Group by month, sum deal_value_gbp for won deals */
        const monthMap = new Map<string, number>();
        opps.forEach(o => {
            if (o.deal_value_gbp && o.deal_value_gbp > 0) {
                /* Use a simple bucket -- we don't have date on opps, so show as single aggregate */
                const key = 'Total';
                monthMap.set(key, (monthMap.get(key) ?? 0) + o.deal_value_gbp);
            }
        });
        return Array.from(monthMap.entries()).map(([month, value]) => ({ month, value: Math.round(value / 1000) }));
    }, [summary.opps]);

    return (
        <div className="card-os space-y-4">
            <div>
                <p className="card-title mb-0.5">Revenue Trend</p>
                <p className="text-[11px]" style={{ color: 'rgb(var(--text-muted))' }}>Monthly closed revenue performance.</p>
            </div>
            {parentLoading && <div className="h-[200px] rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />}
            {!parentLoading && trendData.length === 0 && (
                <div className="flex items-center justify-center h-[200px]" style={{ color: 'rgb(var(--text-muted))' }}>
                    <p className="text-sm">No revenue trend data yet. Close deals to populate this chart.</p>
                </div>
            )}
            {!parentLoading && trendData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="6 4" stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: 'rgb(74,85,103)', fontSize: 10, fontFamily: 'DM Sans' }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'rgb(74,85,103)', fontSize: 9, fontFamily: 'DM Sans' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => `£${v}K`}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'rgb(21,28,37)',
                                border: '1px solid rgb(30,42,56)',
                                borderRadius: 8,
                                fontSize: 11,
                                fontFamily: 'DM Sans',
                                color: 'rgb(201,209,217)',
                            }}
                            formatter={(value: number) => [`£${value}K`, 'Revenue']}
                        />
                        <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(255,107,107,0.25)" />
                                <stop offset="100%" stopColor="rgba(255,107,107,0)" />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="none"
                            fill="url(#revGrad)"
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#FF6B6B"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#FF6B6B', stroke: 'rgb(21,28,37)', strokeWidth: 2 }}
                            activeDot={{ r: 4, fill: '#FF6B6B', stroke: 'rgb(21,28,37)', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

// ── Pipeline by Stage Section ────────────────────────────────────────────────

const PIPELINE_STAGE_COLORS = [
    { color: 'rgba(96,165,250,0.7)', textColor: 'var(--color-blue)' },
    { color: 'rgba(167,139,250,0.7)', textColor: 'var(--color-purple)' },
    { color: 'rgba(251,191,36,0.7)', textColor: 'var(--color-amber)' },
    { color: 'rgba(255,107,107,0.7)', textColor: 'var(--color-coral)' },
    { color: 'rgba(74,222,128,0.7)', textColor: 'var(--color-green)' },
];

function PipelineStagesSection({ summary, loading }: { summary: Summary; loading: boolean }) {
    /* Derive pipeline stages from opportunities data */
    const stages = useMemo(() => {
        const opps = summary.opps ?? [];
        if (opps.length === 0) return [];
        /* Group by lost_reason_category as a proxy for stage/category */
        const groups = new Map<string, number>();
        opps.forEach(o => {
            const stage = o.lost_reason_category || 'Uncategorised';
            groups.set(stage, (groups.get(stage) ?? 0) + (o.deal_value_gbp || 0));
        });
        const entries = Array.from(groups.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const maxVal = Math.max(...entries.map(([, v]) => v), 1);
        return entries.map(([name, value], i) => ({
            name,
            value,
            pct: Math.round((value / (entries.reduce((s, [, v]) => s + v, 0) || 1)) * 100),
            widthPct: Math.round((value / maxVal) * 100),
            colorIdx: i % PIPELINE_STAGE_COLORS.length,
        }));
    }, [summary.opps]);

    return (
        <div className="card-os space-y-4">
            <div>
                <p className="card-title mb-0.5">Pipeline by Stage</p>
                <p className="text-[11px]" style={{ color: 'rgb(var(--text-muted))' }}>Deal value distribution across pipeline stages.</p>
            </div>
            {loading && <div className="h-40 rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />}
            {!loading && stages.length === 0 && (
                <p className="text-sm py-4" style={{ color: 'rgb(var(--text-muted))' }}>No pipeline data yet. Log deals to populate this view.</p>
            )}
            {!loading && stages.length > 0 && (
                <div className="space-y-3">
                    {stages.map(stage => {
                        const c = PIPELINE_STAGE_COLORS[stage.colorIdx];
                        return (
                            <div key={stage.name} className="flex items-center gap-[10px]">
                                <div className="w-[90px] text-[11px] font-medium text-right" style={{ color: 'rgb(var(--text-secondary))' }}>
                                    {stage.name}
                                </div>
                                <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <div
                                        className="h-full rounded flex items-center pl-2 text-[10px] font-semibold text-white"
                                        style={{ width: `${stage.widthPct}%`, background: c.color }}
                                    >
                                        {stage.value >= 1000 ? `£${Math.round(stage.value / 1000)}K` : `£${Math.round(stage.value)}`}
                                    </div>
                                </div>
                                <div className="text-[11px] font-semibold min-w-[40px] text-right" style={{ color: c.textColor }}>
                                    {stage.pct}%
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Rep Leaderboard Section ──────────────────────────────────────────────────

function RepLeaderboardSection({ summary, loading }: { summary: Summary; loading: boolean }) {
    /* Derive leaderboard from opportunities, grouping by company as a proxy for rep */
    const leaderboard = useMemo(() => {
        const opps = summary.opps ?? [];
        if (opps.length === 0) return [];
        const repMap = new Map<string, number>();
        opps.forEach(o => {
            const name = o.company_name || 'Unknown';
            repMap.set(name, (repMap.get(name) ?? 0) + (o.deal_value_gbp || 0));
        });
        return Array.from(repMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, value], i) => ({ rank: i + 1, name, value }));
    }, [summary.opps]);

    return (
        <div className="card-os space-y-4">
            <div>
                <p className="card-title mb-0.5">Rep Leaderboard</p>
                <p className="text-[11px]" style={{ color: 'rgb(var(--text-muted))' }}>Revenue closed this period.</p>
            </div>
            {loading && <div className="h-48 rounded-xl animate-pulse" style={{ background: 'rgb(var(--bg-surface-raised))' }} />}
            {!loading && leaderboard.length === 0 && (
                <p className="text-sm py-4" style={{ color: 'rgb(var(--text-muted))' }}>No leaderboard data yet. Close deals to populate this view.</p>
            )}
            {!loading && leaderboard.length > 0 && (
                <div>
                    {leaderboard.map(rep => (
                        <div
                            key={rep.rank}
                            className="flex items-center gap-[10px] py-2"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        >
                            <div
                                className="w-6 text-base font-semibold"
                                style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    color: rep.rank <= 3 ? 'var(--color-coral)' : 'rgb(var(--text-muted))',
                                }}
                            >
                                {rep.rank}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{rep.name}</p>
                            </div>
                            <div
                                className="text-right text-base font-semibold"
                                style={{
                                    fontFamily: "'Oswald', sans-serif",
                                    color: rep.rank <= 2 ? 'var(--color-green)' : rep.rank <= 3 ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))',
                                }}
                            >
                                {rep.value >= 1000 ? `£${(rep.value / 1000).toFixed(1)}K` : `£${Math.round(rep.value)}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

function RevenueIntelDashboard() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<Summary>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [briefOpen, setBriefOpen] = useState(false);
    const [filterPeriod, setFilterPeriod] = useState<string>('30d');

    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

    const fetchSummary = async () => {
        if (!authHeader) return;
        try {
            const [opps, pipeline, competitive, synergies] = await Promise.all([
                fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/missed-opportunities`, { headers: { Authorization: authHeader } }).then(r => r.json()),
                fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/pipeline`, { headers: { Authorization: authHeader } }).then(r => r.json()),
                fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/competitive`, { headers: { Authorization: authHeader } }).then(r => r.json()),
                fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/synergies`, { headers: { Authorization: authHeader } }).then(r => r.json()),
            ]);
            setSummary({ opps: opps.data, pipeline: pipeline.data, competitive: competitive.data, synergies: synergies.data });
        } catch (err) {
            console.error('[RevenueIntel] fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchSummary(); }, [authHeader]);

    const totalAtRisk = (summary.opps ?? [])
        .reduce((sum, o) => sum + (o.deal_value_gbp || 0), 0);

    const topCompetitor = [...(summary.competitive ?? [])]
        .sort((a, b) => b.mention_count - a.mention_count)[0];

    const openDeals = summary.pipeline?.open_deals_count ?? 0;
    const winRate = summary.opps
        ? Math.round(((summary.opps.filter(o => (o.recovery_score ?? 0) >= 80).length) / Math.max(summary.opps.length, 1)) * 100)
        : 0;
    const avgDealSize = summary.opps && summary.opps.length > 0
        ? Math.round(totalAtRisk / summary.opps.length / 1000 * 10) / 10
        : 0;
    const totalRevenue = totalAtRisk;

    /* Cards data for the existing navigation system */
    const cards: ModuleCard[] = [
        { key: 'outcomes', label: 'Deal Outcomes', icon: Target, description: 'Win/loss logging and correlation engine', stat: null, statLabel: '', action: 'View outcomes' },
        { key: 'missed', label: 'Missed Revenue', icon: AlertCircle, description: 'Open opportunities with recovery potential', stat: loading ? '...' : `£${Math.round(totalAtRisk / 1000)}k`, statLabel: 'ARR at risk', action: 'View opportunities' },
        { key: 'pipeline', label: 'Pipeline Health', icon: BarChart3, description: 'Open pipeline with signal-adjusted probabilities', stat: loading ? '...' : String(openDeals), statLabel: 'Open deals', action: 'View pipeline' },
        { key: 'competitive', label: 'Competitive Intel', icon: Layers, description: 'Win rates and battlecard insights vs competitors', stat: loading ? '...' : (topCompetitor?.competitor_name || null), statLabel: 'Top competitor this month', action: 'View intel' },
        { key: 'prospects', label: 'Prospect Profiles', icon: Target, description: 'ICP-scored profiles enriched from call signals', stat: null, statLabel: '', action: 'Refresh a profile' },
        { key: 'synergies', label: 'Business Synergies', icon: TrendingUp, description: 'Cross-account co-sell and referral opportunities', stat: loading ? '...' : String((summary.synergies ?? []).length), statLabel: 'New synergies', action: 'View synergies' },
        { key: 'automation', label: 'CRM Automation', icon: Zap, description: 'Auto-actions triggered from live call signals', stat: null, statLabel: '', action: 'View log' },
    ];

    const handleCardAction = (key: string) => {
        if (key === 'missed') navigate('/revenue-intel/missed');
        else if (key === 'pipeline') navigate('/revenue-intel/pipeline');
        else if (key === 'competitive') navigate('/revenue-intel/competitive');
        else if (key === 'synergies') navigate('/revenue-intel/synergies');
        else if (key === 'outcomes') navigate('/revenue-intel/outcomes');
    };

    return (
        <div className="p-6 space-y-6 max-w-[1200px]">

            {/* ── Page Header ─────────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="page-kicker">Intelligence</p>
                    <h1 className="page-title">Revenue Intel</h1>
                    <p className="page-desc">Pipeline health, win rates, and revenue performance across your team.</p>
                </div>
                <button
                    onClick={() => { setRefreshing(true); fetchSummary(); }}
                    disabled={refreshing}
                    className="btn-ghost flex items-center gap-[5px] text-xs px-3 py-[6px] rounded-lg"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Token Usage / Alerts ─────────────────────────── */}
            <TokenUsageBanner />
            <AlertBanners />

            {/* ── Filter Bar ──────────────────────────────────── */}
            <div className="flex gap-2">
                {[
                    { label: 'Last 30 Days', value: '30d' },
                    { label: 'Last 90 Days', value: '90d' },
                    { label: 'This Quarter', value: 'quarter' },
                    { label: 'All Time', value: 'all' },
                ].map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilterPeriod(f.value)}
                        className={`filter-pill ${filterPeriod === f.value ? 'active' : ''}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── 5 Stat Cards ────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-[14px]">
                {/* Pipeline Value */}
                <div className="card-os p-[18px]">
                    <p className="stat-label">Pipeline Value</p>
                    {loading
                        ? <div className="h-8 w-20 rounded animate-pulse mt-1" style={{ background: 'rgb(var(--bg-surface))' }} />
                        : <>
                            <p className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>
                                {totalAtRisk > 0 ? `£${Math.round(totalAtRisk / 1000)}K` : '—'}
                            </p>
                            <p className="text-[11px] mt-[3px]" style={{ color: 'rgb(var(--text-muted))' }}>
                                {openDeals > 0 ? `${openDeals} active opportunities` : 'No active opportunities'}
                            </p>
                        </>
                    }
                </div>

                {/* Win Rate */}
                <div className="card-os p-[18px]">
                    <p className="stat-label">Win Rate</p>
                    {loading
                        ? <div className="h-8 w-16 rounded animate-pulse mt-1" style={{ background: 'rgb(var(--bg-surface))' }} />
                        : <>
                            <p className="stat-value" style={{ color: winRate > 0 ? 'var(--color-green)' : 'rgb(var(--text-primary))' }}>
                                {winRate > 0 ? `${winRate}%` : '—'}
                            </p>
                            <p className="text-[11px] mt-[3px]" style={{ color: 'rgb(var(--text-muted))' }}>
                                {(summary.opps ?? []).length > 0
                                    ? `${summary.opps!.filter(o => (o.recovery_score ?? 0) >= 80).length} won / ${summary.opps!.length} total`
                                    : 'No deal data'}
                            </p>
                        </>
                    }
                </div>

                {/* Avg Deal Size */}
                <div className="card-os p-[18px]">
                    <p className="stat-label">Avg Deal Size</p>
                    {loading
                        ? <div className="h-8 w-16 rounded animate-pulse mt-1" style={{ background: 'rgb(var(--bg-surface))' }} />
                        : <>
                            <p className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>
                                {avgDealSize > 0 ? `£${avgDealSize}K` : '—'}
                            </p>
                            <p className="text-[11px] mt-[3px]" style={{ color: 'rgb(var(--text-muted))' }}>
                                {avgDealSize > 0 ? 'Average across all deals' : 'No deal data'}
                            </p>
                        </>
                    }
                </div>

                {/* Avg Sales Cycle */}
                <div className="card-os p-[18px]">
                    <p className="stat-label">Avg Sales Cycle</p>
                    {loading
                        ? <div className="h-8 w-12 rounded animate-pulse mt-1" style={{ background: 'rgb(var(--bg-surface))' }} />
                        : <>
                            <p className="stat-value" style={{ color: 'var(--color-amber)' }}>{'—'}</p>
                            <p className="text-[11px] mt-[3px]" style={{ color: 'rgb(var(--text-muted))' }}>
                                Not enough data
                            </p>
                        </>
                    }
                </div>

                {/* Revenue Closed */}
                <div className="card-os p-[18px]">
                    <p className="stat-label">Revenue Closed</p>
                    {loading
                        ? <div className="h-8 w-16 rounded animate-pulse mt-1" style={{ background: 'rgb(var(--bg-surface))' }} />
                        : <>
                            <p className="stat-value" style={{ color: 'var(--color-coral)' }}>
                                {totalRevenue > 0 ? `£${Math.round(totalRevenue / 1000)}K` : '—'}
                            </p>
                            <p className="text-[11px] mt-[3px]" style={{ color: 'rgb(var(--text-muted))' }}>
                                {totalRevenue > 0 ? 'This period' : 'No revenue data'}
                            </p>
                        </>
                    }
                </div>
            </div>

            {/* ── 2fr / 1fr: Pipeline Stages + Rep Leaderboard ─── */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <PipelineStagesSection summary={summary} loading={loading} />
                <RepLeaderboardSection summary={summary} loading={loading} />
            </div>

            {/* ── 1fr / 1fr: Win/Loss by Rep + Revenue Trend ──── */}
            <div className="grid grid-cols-2 gap-4">
                {authHeader
                    ? <WinLossSection authHeader={authHeader} />
                    : (
                        <div className="card-os">
                            <p className="card-title mb-0.5">Win / Loss by Rep</p>
                            <p className="text-sm py-4" style={{ color: 'rgb(var(--text-muted))' }}>Sign in to view win/loss data.</p>
                        </div>
                    )
                }
                <RevenueTrendSection authHeader={authHeader} summary={summary} loading={loading} />
            </div>

            {/* ── Pre-Call Brief (collapsible) ────────────────── */}
            {session?.user?.id && (
                <div className="card-os !p-0">
                    <button
                        onClick={() => setBriefOpen(!briefOpen)}
                        className="w-full flex items-center justify-between p-4 text-left"
                    >
                        <span className="stat-label">Pre-Call Brief</span>
                        <ChevronDown
                            className="w-4 h-4 transition-transform"
                            style={{ color: 'rgb(var(--text-muted))', transform: briefOpen ? 'rotate(180deg)' : undefined }}
                        />
                    </button>
                    {briefOpen && (
                        <div className="px-4 pb-4">
                            <PreCallBrief userId={session.user.id} />
                        </div>
                    )}
                </div>
            )}

            {/* ── Transfer Gap Analysis ───────────────────────── */}
            {authHeader && <TransferGapSection authHeader={authHeader} />}

            {/* ── AI Revenue Coaching ─────────────────────────── */}
            {authHeader && <CoachingSection authHeader={authHeader} />}

            {/* ── Module Cards Grid ───────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map(card => (
                    <div
                        key={card.key}
                        className="card-os hover:border-[rgb(var(--border-subtle))] transition-colors space-y-4"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                                    style={{ border: '1px solid rgb(var(--border-default))', background: 'rgb(var(--bg-surface-raised))' }}
                                >
                                    <card.icon className="w-4 h-4" style={{ color: 'var(--color-coral)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{card.label}</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{card.description}</p>
                                </div>
                            </div>
                        </div>
                        {card.stat !== null && (
                            <div>
                                <p className="stat-value" style={{ color: 'var(--color-coral)' }}>{card.stat}</p>
                                <p className="stat-label mt-0.5">{card.statLabel}</p>
                            </div>
                        )}
                        {card.action && (
                            <button
                                onClick={() => handleCardAction(card.key)}
                                className="flex items-center gap-1 text-[10px] uppercase tracking-widest hover:text-[var(--color-coral)] transition-colors"
                                style={{ color: 'rgb(var(--text-muted))' }}
                            >
                                {card.action} <ArrowRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Missed Opportunities Table ───────────────────── */}
            {!loading && (summary.opps ?? []).length > 0 && (
                <div className="card-os">
                    <p className="card-title mb-1">Top Open Opportunities</p>
                    <p className="text-[11px] mb-4" style={{ color: 'rgb(var(--text-muted))' }}>Revenue at risk with recovery potential.</p>
                    <div className="overflow-x-auto">
                        <table className="table-os">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th style={{ textAlign: 'right' }}>Deal Value</th>
                                    <th style={{ textAlign: 'center' }}>Recovery Score</th>
                                    <th>Lost Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(summary.opps ?? []).slice(0, 8).map((opp) => {
                                    const rs = opp.recovery_score || 0;
                                    const pillCls = rs >= 80 ? 'pill pill-green' : rs >= 60 ? 'pill pill-amber' : 'pill pill-coral';
                                    return (
                                        <tr key={opp.id}>
                                            <td className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                                                {opp.company_name || 'n/a'}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--color-coral)' }} className="font-mono">
                                                {opp.deal_value_gbp ? `£${Number(opp.deal_value_gbp).toLocaleString('en-GB')}` : 'n/a'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={pillCls}>{Math.round(rs)}</span>
                                            </td>
                                            <td className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                                {opp.lost_reason_category || 'n/a'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Manager Coaching (admin only) ────────────────── */}
            <ManagerCoachingView />
        </div>
    );
}

export default function RevenueIntelligencePage() {
    return (
        <TierGate
            preview={
                <div className="p-6 space-y-4 opacity-70 pointer-events-none">
                    <h1 className="text-2xl" style={{ color: 'rgb(var(--text-primary))' }}>Revenue Intelligence</h1>
                    <div className="grid grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="card-os p-5 h-32" />
                        ))}
                    </div>
                </div>
            }
        >
            <RevenueIntelDashboard />
        </TierGate>
    );
}
