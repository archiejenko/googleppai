import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, AlertCircle, BarChart3, Target, Layers, Zap,
    ArrowRight, RefreshCw, Mic, BarChart2, X, ChevronDown,
} from 'lucide-react';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';
import { useTier } from '../../context/TierContext';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../../utils/supabase';
import PreCallBrief from './PreCallBrief';

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

// ── Helper components ─────────────────────────────────────────────────────────

function MetricCard({ card, onAction }: { card: ModuleCard; onAction: (key: string) => void }) {
    return (
        <div className="card-os p-5 border border-border hover:border-border/80 transition-colors space-y-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center border border-border bg-bg-raised">
                        <card.icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                        <p className="text-sm text-text-primary">{card.label}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{card.description}</p>
                    </div>
                </div>
            </div>

            {card.stat !== null && (
                <div>
                    <p className="text-2xl text-accent">{card.stat}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">{card.statLabel}</p>
                </div>
            )}

            {card.action && (
                <button
                    onClick={() => onAction(card.key)}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-text-muted hover:text-accent transition-colors"
                >
                    {card.action} <ArrowRight className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

function GapScoreBadge({ score, label }: { score: number | null; label: string }) {
    if (score === null) return null;
    const color = score >= 70 ? 'text-status-error' : score >= 40 ? 'text-status-warning' : 'text-status-success';
    return (
        <div className="text-center">
            <p className={`text-3xl font-mono ${color}`}>{Math.round(score)}</p>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">{label}</p>
        </div>
    );
}

function CompBar({ label, training, live }: { label: string; training: number | null; live: number | null }) {
    const t = training ?? 0;
    const l = live ?? 0;
    return (
        <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-text-muted">{label}</p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="w-16 text-right">Training</span>
                <div className="flex-1 bg-bg-raised h-2">
                    <div className="bg-accent h-2" style={{ width: `${Math.min(100, t)}%` }} />
                </div>
                <span className="w-8 font-mono">{Math.round(t)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="w-16 text-right">Live</span>
                <div className="flex-1 bg-bg-raised h-2">
                    <div className="bg-text-muted h-2" style={{ width: `${Math.min(100, l)}%` }} />
                </div>
                <span className="w-8 font-mono">{Math.round(l)}</span>
            </div>
        </div>
    );
}

function DrillTypeIcon({ type }: { type: CoachingRecommendation['drill_type'] }) {
    if (type === 'roleplay' || type === 'pitch') return <Mic className="w-3.5 h-3.5" />;
    return <BarChart2 className="w-3.5 h-3.5" />;
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
        <div className="card-os border border-border p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-0.5">Transfer Gap Analysis</p>
                    <p className="text-sm text-text-muted">Training performance vs live call execution</p>
                </div>
                <div className="flex gap-1">
                    {[30, 60, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setPeriodDays(d)}
                            className={`text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                                periodDays === d
                                    ? 'border-accent text-accent'
                                    : 'border-border text-text-muted hover:text-text-primary'
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-32 bg-bg-raised animate-pulse" />
                    <div className="h-32 bg-bg-raised animate-pulse" />
                </div>
            )}

            {isEmpty && (
                <p className="text-sm text-text-muted py-4">
                    Not enough data yet. Complete more training sessions and calls to generate your Transfer Gap.
                </p>
            )}

            {!loading && !isEmpty && data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <p className="text-xs uppercase tracking-widest text-text-muted border-b border-border pb-2">
                            Delivery Gap
                        </p>
                        <CompBar
                            label="Talk Ratio"
                            training={data.talk_ratio_training}
                            live={data.talk_ratio_live}
                        />
                        <CompBar
                            label="Discovery"
                            training={data.discovery_training}
                            live={data.discovery_live}
                        />
                        <GapScoreBadge score={data.delivery_gap_score} label="Delivery Gap Score" />
                    </div>

                    <div className="space-y-4">
                        <p className="text-xs uppercase tracking-widest text-text-muted border-b border-border pb-2">
                            Readiness Gap
                        </p>
                        {data.meddic_avg !== null && (
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-text-muted">MEDDIC Avg</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-bg-raised h-2">
                                        <div className="bg-accent h-2" style={{ width: `${Math.min(100, data.meddic_avg)}%` }} />
                                    </div>
                                    <span className="text-xs font-mono text-text-primary w-8">{Math.round(data.meddic_avg)}</span>
                                </div>
                            </div>
                        )}
                        {!data.insufficient_deal_data && data.deal_win_rate !== null && (
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-widest text-text-muted">Win Rate</p>
                                <p className="text-lg font-mono text-text-primary">{data.deal_win_rate.toFixed(1)}%</p>
                            </div>
                        )}
                        <GapScoreBadge score={data.readiness_gap_score} label="Readiness Gap Score" />
                        {data.insufficient_deal_data && (
                            <p className="text-[10px] text-text-muted border-l-2 border-border pl-3">
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

const BENCHMARK_METRIC_MAP: Record<string, { label: string; dataKey: keyof TransferGapData }> = {
    delivery_gap: { label: 'Delivery Gap', dataKey: 'delivery_gap_score' },
    readiness_gap: { label: 'Readiness Gap', dataKey: 'readiness_gap_score' },
    talk_ratio_gap: { label: 'Talk Ratio Gap', dataKey: 'talk_ratio_training' },
    discovery_gap: { label: 'Discovery Gap', dataKey: 'discovery_training' },
};

function PercentileBar({ userScore, p25, p50, p75 }: { userScore: number; p25: number; p50: number; p75: number }) {
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const userPos = clamp(userScore);
    return (
        <div className="relative h-6 bg-bg-raised border border-border">
            <div className="absolute top-0 bottom-0 border-r border-border" style={{ left: `${clamp(p75)}%` }} />
            <div className="absolute top-0 bottom-0 border-r border-accent/40" style={{ left: `${clamp(p50)}%` }} />
            <div className="absolute top-0 bottom-0 border-r border-border" style={{ left: `${clamp(p25)}%` }} />
            <div
                className="absolute top-0 bottom-0 w-1 bg-accent"
                style={{ left: `${userPos}%` }}
            />
            <div className="absolute -bottom-4 flex justify-between w-full text-[8px] text-text-muted">
                <span style={{ left: `${clamp(p75)}%`, position: 'absolute', transform: 'translateX(-50%)' }}>Top 25%</span>
                <span style={{ left: `${clamp(p50)}%`, position: 'absolute', transform: 'translateX(-50%)' }}>Median</span>
                <span style={{ left: `${clamp(p25)}%`, position: 'absolute', transform: 'translateX(-50%)' }}>Bottom 25%</span>
            </div>
        </div>
    );
}

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

    if (loading) return <div className="h-16 bg-bg-raised animate-pulse" />;
    if (benchmarks.length === 0) {
        return <p className="text-sm text-text-muted">Benchmarks will appear once enough platform data is available.</p>;
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
        <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">How You Compare</p>
                <span className="text-[10px] text-text-muted">{benchmarkSource}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Object.entries(BENCHMARK_METRIC_MAP).map(([metric, { label, dataKey }]) => {
                    const bm = getBenchmark(metric);
                    if (!bm) {
                        return (
                            <div key={metric} className="space-y-1">
                                <p className="text-xs text-text-primary">{label}</p>
                                <p className="text-[10px] text-text-muted">Not enough platform data yet to benchmark this metric.</p>
                            </div>
                        );
                    }
                    const userScore = gapData ? (gapData[dataKey] as number | null) : null;
                    if (userScore === null) {
                        return (
                            <div key={metric} className="space-y-1">
                                <p className="text-xs text-text-primary">{label}</p>
                                <p className="text-[10px] text-text-muted">Complete more sessions to see your position.</p>
                            </div>
                        );
                    }
                    return (
                        <div key={metric} className="space-y-1 pb-4">
                            <p className="text-xs text-text-primary">{label}: <span className="text-accent font-mono">{Math.round(userScore)}</span></p>
                            <PercentileBar userScore={userScore} p25={bm.p25} p50={bm.p50} p75={bm.p75} />
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
        <div className="card-os border border-border p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-0.5">AI Revenue Coaching</p>
                    {profile?.generated_at && (
                        <p className="text-[10px] text-text-muted">
                            Last generated: {new Date(profile.generated_at).toLocaleDateString('en-GB')}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    className="btn-ghost flex items-center gap-2 text-xs py-2 px-3"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading && <div className="h-24 bg-bg-raised animate-pulse" />}

            {!loading && !profile && (
                <p className="text-sm text-text-muted">No coaching profile yet. Click Refresh to generate.</p>
            )}

            {!loading && profile && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest bg-bg-raised text-accent px-2 py-1 border border-border">
                            {GAP_LABELS[profile.primary_gap] ?? profile.primary_gap}
                        </span>
                    </div>

                    {profile.top_recommendation && (
                        <div className="border-l-2 border-accent pl-4">
                            <p className="text-sm text-text-primary">{profile.top_recommendation}</p>
                        </div>
                    )}

                    {(profile.recommendations ?? []).length > 0 && (
                        <div className="space-y-3">
                            {profile.recommendations.slice(0, 3).map((rec, i) => (
                                <div key={i} className="card-os border border-border p-4 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-accent">
                                                <DrillTypeIcon type={rec.drill_type} />
                                            </span>
                                            <p className="text-sm text-text-primary">{rec.title}</p>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-widest bg-bg-raised text-text-muted px-2 py-0.5 border border-border">
                                            P{rec.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-muted pl-6">{rec.detail}</p>
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

const WIN_LOSS_DIMENSIONS: Array<{ key: string; label: string; wonKey: keyof WinLossData; lostKey: keyof WinLossData }> = [
    { key: 'discovery', label: 'Discovery', wonKey: 'won_avg_discovery', lostKey: 'lost_avg_discovery' },
    { key: 'objection', label: 'Objection Handling', wonKey: 'won_avg_objection_handling', lostKey: 'lost_avg_objection_handling' },
    { key: 'engagement', label: 'Engagement', wonKey: 'won_avg_engagement', lostKey: 'lost_avg_engagement' },
    { key: 'talk_ratio', label: 'Talk Ratio', wonKey: 'won_avg_talk_ratio', lostKey: 'lost_avg_talk_ratio' },
    { key: 'meddic', label: 'MEDDIC', wonKey: 'won_avg_meddic', lostKey: 'lost_avg_meddic' },
];

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

    return (
        <div className="card-os border border-border p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="font-display text-lg text-text-primary uppercase tracking-wider">Win/Loss Analysis</h2>
                </div>
                <div className="flex gap-2">
                    <div className="flex gap-1">
                        {(['rep', 'team'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setScope(s)}
                                className={`btn-ghost text-[10px] uppercase tracking-widest px-3 py-1.5 ${
                                    scope === s ? 'border-accent text-accent' : ''
                                }`}
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
                                className={`text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                                    periodDays === d
                                        ? 'border-accent text-accent'
                                        : 'border-border text-text-muted hover:text-text-primary'
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && <div className="h-32 bg-bg-raised animate-pulse" />}

            {!loading && scope === 'team' && !isAdmin && (
                <p className="text-sm text-text-muted py-4">Team view is available to managers only.</p>
            )}

            {!loading && data?.insufficient_data && (
                <p className="text-sm text-text-muted py-4">
                    Not enough won and lost deals to generate analysis. Log at least 3 deals in each outcome to unlock this view.
                </p>
            )}

            {!loading && data && !data.insufficient_data && !(scope === 'team' && !isAdmin) && (
                <div className="space-y-4">
                    {WIN_LOSS_DIMENSIONS.map(({ key, label, wonKey, lostKey }) => {
                        const won = data[wonKey] as number | null;
                        const lost = data[lostKey] as number | null;
                        if (won === null && lost === null) return null;
                        const delta = (won ?? 0) - (lost ?? 0);
                        const deltaLabel = delta >= 0
                            ? `+${Math.round(delta)} on won deals`
                            : `${Math.round(delta)} on lost deals`;
                        return (
                            <div key={key} className="space-y-1">
                                <p className="text-xs text-text-primary">{label}</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                            <span className="w-8">Won</span>
                                            <div className="flex-1 bg-bg-raised h-3">
                                                <div className="bg-accent h-3" style={{ width: `${Math.min(100, won ?? 0)}%` }} />
                                            </div>
                                            <span className="w-8 font-mono text-accent">{Math.round(won ?? 0)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                            <span className="w-8">Lost</span>
                                            <div className="flex-1 bg-bg-raised h-3">
                                                <div className="bg-text-muted h-3" style={{ width: `${Math.min(100, lost ?? 0)}%` }} />
                                            </div>
                                            <span className="w-8 font-mono">{Math.round(lost ?? 0)}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-text-muted">{deltaLabel}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Alert Banners ────────────────────────────────────────────────────────────

const ALERT_MESSAGES: Record<string, (delta_d: number | null, delta_r: number | null) => string> = {
    delivery_gap_widened: (d) =>
        `Your Delivery Gap widened by ${Math.round(Math.abs(d ?? 0))} points this week. Your live call scores are falling further from your training scores.`,
    readiness_gap_widened: (_, r) =>
        `Your Readiness Gap widened by ${Math.round(Math.abs(r ?? 0))} points this week. MEDDIC execution or win rate has dropped.`,
    both_widened: () =>
        'Both your Delivery Gap and Readiness Gap widened this week. Review your AI coaching recommendations.',
};

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
                <div key={alert.id} className="card-os border border-border border-l-4 border-l-accent p-4 flex items-start justify-between gap-3">
                    <p className="text-sm text-text-primary">
                        {ALERT_MESSAGES[alert.alert_type]?.(alert.delta_delivery, alert.delta_readiness) ?? 'Gap alert detected.'}
                    </p>
                    <button onClick={() => dismiss(alert.id)} className="text-text-muted hover:text-text-primary shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
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
    const [detailKey, setDetailKey] = useState<string | null>(null);
    const [briefOpen, setBriefOpen] = useState(false);

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

    const cards: ModuleCard[] = [
        {
            key: 'outcomes',
            label: 'Deal Outcomes',
            icon: Target,
            description: 'Win/loss logging and correlation engine',
            stat: null,
            statLabel: '',
            action: 'View outcomes',
        },
        {
            key: 'missed',
            label: 'Missed Revenue',
            icon: AlertCircle,
            description: 'Open opportunities with recovery potential',
            stat: loading ? '...' : `£${Math.round(totalAtRisk / 1000)}k`,
            statLabel: 'ARR at risk',
            action: 'View opportunities',
        },
        {
            key: 'pipeline',
            label: 'Pipeline Health',
            icon: BarChart3,
            description: 'Open pipeline with signal-adjusted probabilities',
            stat: loading ? '...' : String(summary.pipeline?.open_deals_count ?? 0),
            statLabel: 'Open deals',
            action: 'View pipeline',
        },
        {
            key: 'competitive',
            label: 'Competitive Intel',
            icon: Layers,
            description: 'Win rates and battlecard insights vs competitors',
            stat: loading ? '...' : (topCompetitor?.competitor_name || null),
            statLabel: 'Top competitor this month',
            action: 'View intel',
        },
        {
            key: 'prospects',
            label: 'Prospect Profiles',
            icon: Target,
            description: 'ICP-scored profiles enriched from call signals',
            stat: null,
            statLabel: '',
            action: 'Refresh a profile',
        },
        {
            key: 'synergies',
            label: 'Business Synergies',
            icon: TrendingUp,
            description: 'Cross-account co-sell and referral opportunities',
            stat: loading ? '...' : String((summary.synergies ?? []).length),
            statLabel: 'New synergies',
            action: 'View synergies',
        },
        {
            key: 'automation',
            label: 'CRM Automation',
            icon: Zap,
            description: 'Auto-actions triggered from live call signals',
            stat: null,
            statLabel: '',
            action: 'View log',
        },
    ];

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">Revenue Intelligence</p>
                    <h1 className="text-2xl text-text-primary">Overview</h1>
                </div>
                <button
                    onClick={() => { setRefreshing(true); fetchSummary(); }}
                    disabled={refreshing}
                    className="btn-ghost flex items-center gap-2 text-xs py-2 px-3"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Pre-Call Brief (collapsible) */}
            {session?.user?.id && (
                <div className="card-os border border-border">
                    <button
                        onClick={() => setBriefOpen(!briefOpen)}
                        className="w-full flex items-center justify-between p-4 text-left"
                    >
                        <span className="text-[10px] uppercase tracking-widest text-text-muted">Pre-Call Brief</span>
                        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${briefOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {briefOpen && (
                        <div className="px-4 pb-4">
                            <PreCallBrief userId={session.user.id} />
                        </div>
                    )}
                </div>
            )}

            {/* Alert Banners */}
            <AlertBanners />

            {/* Section 1: Transfer Gap Analysis */}
            {authHeader && <TransferGapSection authHeader={authHeader} />}

            {/* Section 2: AI Revenue Coaching */}
            {authHeader && <CoachingSection authHeader={authHeader} />}

            {/* Section 2.5: Win/Loss Analysis */}
            {authHeader && <WinLossSection authHeader={authHeader} />}

            {/* Sections 3-9: Deal Outcomes first, then remaining cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map(card => (
                    <MetricCard
                        key={card.key}
                        card={card}
                        onAction={(key) => {
                            if (key === 'missed') navigate('/revenue-intel/missed');
                            else if (key === 'pipeline') navigate('/revenue-intel/pipeline');
                            else if (key === 'competitive') navigate('/revenue-intel/competitive');
                            else if (key === 'synergies') navigate('/revenue-intel/synergies');
                            else if (key === 'outcomes') navigate('/revenue-intel/outcomes');
                            else setDetailKey(prev => prev === key ? null : key);
                        }}
                    />
                ))}
            </div>

            {/* Inline detail panel */}
            {detailKey && (
                <div className="card-os border border-border p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-widest text-text-muted">
                            {cards.find(c => c.key === detailKey)?.label}
                        </p>
                        <button onClick={() => setDetailKey(null)} className="text-xs text-text-muted hover:text-text-primary">close</button>
                    </div>

                    {detailKey === 'competitive' && (
                        <div className="space-y-2">
                            {(summary.competitive ?? []).length === 0
                                ? <p className="text-sm text-text-muted">No competitive data yet. Complete sessions mentioning competitors.</p>
                                : (summary.competitive ?? []).map((c, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2">
                                        <span className="text-text-primary">{c.competitor_name}</span>
                                        <span className="text-text-muted">{c.mention_count} mentions · {c.win_rate ?? 'n/a'}% win rate</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {detailKey === 'synergies' && (
                        <div className="space-y-2">
                            {(summary.synergies ?? []).length === 0
                                ? <p className="text-sm text-text-muted">No synergies detected yet.</p>
                                : (summary.synergies ?? []).map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2">
                                        <span className="text-text-primary">{s.account_a} + {s.account_b}</span>
                                        <span className="text-accent text-xs">{s.opportunity_type}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {detailKey === 'automation' && (
                        <p className="text-sm text-text-muted">CRM automation log is populated as live call signals trigger actions. No entries yet.</p>
                    )}

                    {detailKey === 'prospects' && (
                        <p className="text-sm text-text-muted">Prospect profiles are enriched from call signal data. Complete sessions with named prospects to populate this view.</p>
                    )}
                </div>
            )}

            {/* Missed Opportunities Table */}
            {!loading && (summary.opps ?? []).length > 0 && (
                <div>
                    <h2 className="text-sm text-text-muted uppercase tracking-widest mb-3">Top Open Opportunities</h2>
                    <div className="card-os border border-border overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
                                    <th className="px-5 py-3 text-left">Company</th>
                                    <th className="px-5 py-3 text-right">Deal Value</th>
                                    <th className="px-5 py-3 text-center">Recovery Score</th>
                                    <th className="px-5 py-3 text-left">Lost Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(summary.opps ?? []).slice(0, 8).map((opp) => (
                                    <tr key={opp.id} className="hover:bg-bg-raised transition-colors">
                                        <td className="px-5 py-3 text-text-primary">{opp.company_name || 'n/a'}</td>
                                        <td className="px-5 py-3 text-right text-accent font-mono">
                                            {opp.deal_value_gbp ? `£${Number(opp.deal_value_gbp).toLocaleString('en-GB')}` : 'n/a'}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`text-xs px-2 py-0.5 ${(opp.recovery_score || 0) >= 70 ? 'bg-status-success/10 text-status-success' :
                                                    (opp.recovery_score || 0) >= 40 ? 'bg-status-warning/10 text-status-warning' :
                                                        'bg-bg-raised text-text-muted'
                                                }`}>
                                                {Math.round(opp.recovery_score || 0)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-text-muted text-xs">{opp.lost_reason_category || 'n/a'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RevenueIntelligencePage() {
    return (
        <TierGate
            preview={
                <div className="p-6 space-y-4 opacity-70 pointer-events-none">
                    <h1 className="text-2xl text-text-primary">Revenue Intelligence</h1>
                    <div className="grid grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="card-os p-5 border border-border h-32 bg-bg-surface" />
                        ))}
                    </div>
                </div>
            }
        >
            <RevenueIntelDashboard />
        </TierGate>
    );
}
