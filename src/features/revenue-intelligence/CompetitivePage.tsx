import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { SUPABASE_FUNCTIONS_URL } from '../../utils/supabase';



interface CompetitorRow {
    id: string;
    competitor_name: string;
    mention_count: number;
    win_rate: number | null;
    loss_rate: number | null;
    common_objections: string[] | null;
    battlecard_notes: string | null;
    last_mentioned_at: string | null;
}

function WinRateBadge({ rate }: { rate: number | null }) {
    if (rate === null) return <span className="text-text-muted text-xs">—</span>;
    const color = rate >= 60 ? 'text-status-success' : rate >= 40 ? 'text-status-warning' : 'text-status-danger';
    const Icon = rate >= 60 ? TrendingUp : rate >= 40 ? Minus : TrendingDown;
    return (
        <span className={`flex items-center gap-1 text-sm ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            {rate}%
        </span>
    );
}

function CompetitiveDashboard() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [rows, setRows] = useState<CompetitorRow[]>([]);
    const [selected, setSelected] = useState<CompetitorRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

    useEffect(() => {
        if (!authHeader) return;
        fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/competitive`, {
            headers: { Authorization: authHeader },
        })
            .then(r => r.json())
            .then(json => {
                setRows(json.data ?? []);
                setLoading(false);
            })
            .catch(err => {
                setError(String(err));
                setLoading(false);
            });
    }, [authHeader]);

    const sorted = [...rows].sort((a, b) => b.mention_count - a.mention_count);

    return (
        <div className="pb-12 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/revenue-intel')}
                    className="p-2 text-text-muted hover:text-text-primary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-0.5">Revenue Intelligence</p>
                    <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight flex items-center gap-3">
                        <Layers className="w-6 h-6 text-accent" />
                        Competitive Intelligence
                    </h1>
                </div>
            </div>

            {loading && <LoadingSpinner message="Loading competitive data…" />}
            {error && <p className="text-status-danger text-sm">{error}</p>}

            {!loading && !error && sorted.length === 0 && (
                <div className="card-os p-10 text-center space-y-2">
                    <Layers className="w-8 h-8 text-text-muted mx-auto" />
                    <p className="text-sm text-text-muted">No competitive data yet.</p>
                    <p className="text-xs text-text-muted opacity-60">
                        Complete sessions that mention competitors to populate this view.
                    </p>
                </div>
            )}

            {!loading && sorted.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Competitor List */}
                    <div className="lg:col-span-1 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                            {sorted.length} competitor{sorted.length !== 1 ? 's' : ''} tracked
                        </p>
                        {sorted.map(row => (
                            <button
                                key={row.id}
                                onClick={() => setSelected(row)}
                                className={`w-full text-left card-os p-4 transition-colors border ${selected?.id === row.id ? 'border-accent/60 bg-accent/5' : 'border-border hover:border-border/60'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-text-primary">{row.competitor_name}</span>
                                    <WinRateBadge rate={row.win_rate} />
                                </div>
                                <div className="flex items-center gap-3 text-xs text-text-muted">
                                    <span>{row.mention_count} mention{row.mention_count !== 1 ? 's' : ''}</span>
                                    {row.last_mentioned_at && (
                                        <span>Last: {new Date(row.last_mentioned_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    )}
                                </div>
                                {/* Mention bar */}
                                <div className="mt-2 h-1 bg-bg-raised">
                                    <div
                                        className="h-full bg-accent/60 transition-all duration-500"
                                        style={{ width: `${Math.min(100, (row.mention_count / (sorted[0].mention_count || 1)) * 100)}%` }}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Detail / Battlecard */}
                    <div className="lg:col-span-2">
                        {!selected ? (
                            <div className="card-os p-8 h-full flex items-center justify-center text-center border border-border">
                                <div>
                                    <Layers className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
                                    <p className="text-sm text-text-muted">Select a competitor to view their battlecard</p>
                                </div>
                            </div>
                        ) : (
                            <div className="card-os p-6 space-y-5 border border-border">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl text-text-primary">{selected.competitor_name}</h2>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                                            <span>{selected.mention_count} mentions</span>
                                            {selected.win_rate !== null && (
                                                <span className="flex items-center gap-1">
                                                    Win rate: <WinRateBadge rate={selected.win_rate} />
                                                </span>
                                            )}
                                            {selected.loss_rate !== null && (
                                                <span>Loss rate: {selected.loss_rate}%</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelected(null)}
                                        className="text-xs text-text-muted hover:text-text-primary transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {selected.common_objections && selected.common_objections.length > 0 && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Common Objections</p>
                                        <ul className="space-y-1.5">
                                            {selected.common_objections.map((obj, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                                                    <span className="text-accent mt-0.5 shrink-0">→</span>
                                                    {obj}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selected.battlecard_notes && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Battlecard Notes</p>
                                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{selected.battlecard_notes}</p>
                                    </div>
                                )}

                                {!selected.battlecard_notes && (!selected.common_objections || selected.common_objections.length === 0) && (
                                    <p className="text-sm text-text-muted italic">
                                        No battlecard data yet. Battlecards are auto-populated from analysed call transcripts mentioning this competitor.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CompetitivePage() {
    return (
        <TierGate
            preview={
                <div className="p-6 space-y-4 opacity-70 pointer-events-none">
                    <h1 className="text-2xl text-text-primary">Competitive Intelligence</h1>
                    <div className="grid grid-cols-3 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="card-os p-5 border border-border h-24 bg-bg-surface" />
                        ))}
                    </div>
                </div>
            }
        >
            <CompetitiveDashboard />
        </TierGate>
    );
}
