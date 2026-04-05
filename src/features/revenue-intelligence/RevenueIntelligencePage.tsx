import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertCircle, BarChart3, Target, Layers, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface ModuleCard {
    key: string;
    label: string;
    icon: typeof TrendingUp;
    description: string;
    stat: string | null;
    statLabel: string;
    action?: string;
}

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

function RevenueIntelDashboard() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [detailKey, setDetailKey] = useState<string | null>(null);

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

    useEffect(() => { fetchSummary(); }, []);

    const totalAtRisk = (summary.opps ?? [])
        .reduce((sum: number, o: any) => sum + (o.deal_value_gbp || 0), 0);

    const topCompetitor = [...(summary.competitive ?? [])]
        .sort((a: any, b: any) => b.mention_count - a.mention_count)[0];

    const cards: ModuleCard[] = [
        {
            key: 'missed',
            label: 'Missed Revenue',
            icon: AlertCircle,
            description: 'Open opportunities with recovery potential',
            stat: loading ? '…' : `£${Math.round(totalAtRisk / 1000)}k`,
            statLabel: 'ARR at risk',
            action: 'View opportunities',
        },
        {
            key: 'pipeline',
            label: 'Pipeline Health',
            icon: BarChart3,
            description: 'Open pipeline with signal-adjusted probabilities',
            stat: loading ? '…' : String(summary.pipeline?.open_deals_count ?? 0),
            statLabel: 'Open deals',
            action: 'View pipeline',
        },
        {
            key: 'competitive',
            label: 'Competitive Intel',
            icon: Layers,
            description: 'Win rates and battlecard insights vs competitors',
            stat: loading ? '…' : (topCompetitor?.competitor_name || '—'),
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
            stat: loading ? '…' : String((summary.synergies ?? []).length),
            statLabel: 'New synergies',
            action: 'View synergies',
        },
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
                        <button onClick={() => setDetailKey(null)} className="text-xs text-text-muted hover:text-text-primary">✕ Close</button>
                    </div>

                    {detailKey === 'competitive' && (
                        <div className="space-y-2">
                            {(summary.competitive ?? []).length === 0
                                ? <p className="text-sm text-text-muted">No competitive data yet. Complete sessions mentioning competitors.</p>
                                : (summary.competitive ?? []).map((c: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2">
                                        <span className="text-text-primary">{c.competitor_name}</span>
                                        <span className="text-text-muted">{c.mention_count} mentions · {c.win_rate ?? '—'}% win rate</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {detailKey === 'synergies' && (
                        <div className="space-y-2">
                            {(summary.synergies ?? []).length === 0
                                ? <p className="text-sm text-text-muted">No synergies detected yet.</p>
                                : (summary.synergies ?? []).map((s: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-2">
                                        <span className="text-text-primary">{s.account_a} ↔ {s.account_b}</span>
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
                                {(summary.opps ?? []).slice(0, 8).map((opp: any) => (
                                    <tr key={opp.id} className="hover:bg-bg-raised transition-colors">
                                        <td className="px-5 py-3 text-text-primary">{opp.company_name || '—'}</td>
                                        <td className="px-5 py-3 text-right text-accent font-mono">
                                            {opp.deal_value_gbp ? `£${Number(opp.deal_value_gbp).toLocaleString('en-GB')}` : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`text-xs px-2 py-0.5 ${(opp.recovery_score || 0) >= 70 ? 'bg-status-success/10 text-status-success' :
                                                    (opp.recovery_score || 0) >= 40 ? 'bg-status-warning/10 text-status-warning' :
                                                        'bg-bg-raised text-text-muted'
                                                }`}>
                                                {Math.round(opp.recovery_score || 0)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-text-muted text-xs">{opp.lost_reason_category || '—'}</td>
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
