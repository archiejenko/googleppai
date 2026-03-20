import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Users, ArrowRight } from 'lucide-react';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface SynergyRow {
    id: string;
    account_a: string;
    account_b: string;
    opportunity_type: string;
    confidence_score: number | null;
    recommended_action: string | null;
    detected_at: string | null;
    status: string | null;
}

const OPPORTUNITY_COLORS: Record<string, string> = {
    co_sell: 'text-accent border-accent/30 bg-accent/5',
    referral: 'text-status-success border-status-success/30 bg-status-success/5',
    upsell: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    cross_sell: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
};

function OpportunityBadge({ type }: { type: string }) {
    const cls = OPPORTUNITY_COLORS[type] ?? 'text-text-muted border-border bg-bg-raised';
    const label = type.replace(/_/g, '-');
    return (
        <span className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 ${cls}`}>
            {label}
        </span>
    );
}

function ConfidenceBar({ score }: { score: number | null }) {
    if (score === null) return null;
    const color = score >= 70 ? 'bg-status-success' : score >= 40 ? 'bg-status-warning' : 'bg-status-danger';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-bg-raised">
                <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs text-text-muted w-8 text-right">{score}%</span>
        </div>
    );
}

function SynergiesDashboard() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [synergies, setSynergies] = useState<SynergyRow[]>([]);
    const [selected, setSelected] = useState<SynergyRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

    useEffect(() => {
        if (!authHeader) return;
        fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/synergies`, {
            headers: { Authorization: authHeader },
        })
            .then(r => r.json())
            .then(json => {
                setSynergies(json.data ?? []);
                setLoading(false);
            })
            .catch(err => {
                setError(String(err));
                setLoading(false);
            });
    }, [authHeader]);

    const types = ['all', ...Array.from(new Set(synergies.map(s => s.opportunity_type)))];
    const filtered = filter === 'all' ? synergies : synergies.filter(s => s.opportunity_type === filter);
    const sorted = [...filtered].sort((a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0));

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
                        <TrendingUp className="w-6 h-6 text-accent" />
                        Business Synergies
                    </h1>
                </div>
            </div>

            {loading && <LoadingSpinner message="Loading synergies…" />}
            {error && <p className="text-status-danger text-sm">{error}</p>}

            {!loading && !error && synergies.length === 0 && (
                <div className="card-os p-10 text-center space-y-2">
                    <Users className="w-8 h-8 text-text-muted mx-auto" />
                    <p className="text-sm text-text-muted">No synergies detected yet.</p>
                    <p className="text-xs text-text-muted opacity-60">
                        Synergies are automatically detected from call signals across accounts. Complete more sessions to populate this view.
                    </p>
                </div>
            )}

            {!loading && synergies.length > 0 && (
                <>
                    {/* Summary row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(['co_sell', 'referral', 'upsell', 'cross_sell'] as const).map(type => {
                            const count = synergies.filter(s => s.opportunity_type === type).length;
                            return (
                                <div key={type} className="card-os p-4 border border-border">
                                    <p className="text-xl text-text-primary">{count}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">
                                        {type.replace(/_/g, '-')}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Type filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {types.map(t => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`text-[10px] uppercase tracking-widest border px-3 py-1.5 transition-colors ${
                                    filter === t
                                        ? 'border-accent/60 text-accent bg-accent/10'
                                        : 'border-border text-text-muted hover:border-border/60'
                                }`}
                            >
                                {t === 'all' ? `All (${synergies.length})` : `${t.replace(/_/g, '-')} (${synergies.filter(s => s.opportunity_type === t).length})`}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Synergy list */}
                        <div className="lg:col-span-1 space-y-2 max-h-[520px] overflow-y-auto pr-1">
                            {sorted.map(row => (
                                <button
                                    key={row.id}
                                    onClick={() => setSelected(row)}
                                    className={`w-full text-left card-os p-4 transition-colors border ${selected?.id === row.id ? 'border-accent/60 bg-accent/5' : 'border-border hover:border-border/60'}`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-text-primary truncate flex-1">{row.account_a}</span>
                                        <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                                        <span className="text-xs text-text-primary truncate flex-1 text-right">{row.account_b}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <OpportunityBadge type={row.opportunity_type} />
                                        {row.detected_at && (
                                            <span className="text-[10px] text-text-muted">
                                                {new Date(row.detected_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}
                                    </div>
                                    {row.confidence_score !== null && (
                                        <div className="mt-2">
                                            <ConfidenceBar score={row.confidence_score} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Detail panel */}
                        <div className="lg:col-span-2">
                            {!selected ? (
                                <div className="card-os p-8 h-full flex items-center justify-center text-center border border-border">
                                    <div>
                                        <TrendingUp className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
                                        <p className="text-sm text-text-muted">Select a synergy to view details</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="card-os p-6 space-y-5 border border-border">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg text-text-primary">{selected.account_a}</span>
                                                <ArrowRight className="w-4 h-4 text-accent" />
                                                <span className="text-lg text-text-primary">{selected.account_b}</span>
                                            </div>
                                            <OpportunityBadge type={selected.opportunity_type} />
                                        </div>
                                        <button
                                            onClick={() => setSelected(null)}
                                            className="text-xs text-text-muted hover:text-text-primary transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {selected.confidence_score !== null && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Confidence Score</p>
                                            <ConfidenceBar score={selected.confidence_score} />
                                        </div>
                                    )}

                                    {selected.recommended_action && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Recommended Action</p>
                                            <p className="text-sm text-text-secondary leading-relaxed">{selected.recommended_action}</p>
                                        </div>
                                    )}

                                    {selected.detected_at && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Detected</p>
                                            <p className="text-sm text-text-muted">
                                                {new Date(selected.detected_at).toLocaleDateString('en-GB', {
                                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    )}

                                    {selected.status && (
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Status</p>
                                            <span className={`text-[10px] uppercase tracking-widest border px-2 py-0.5 ${
                                                selected.status === 'actioned' ? 'text-status-success border-status-success/30 bg-status-success/5' : 'text-text-muted border-border bg-bg-raised'
                                            }`}>
                                                {selected.status}
                                            </span>
                                        </div>
                                    )}

                                    {!selected.recommended_action && (
                                        <p className="text-sm text-text-muted italic">
                                            No recommended action generated yet. Actions are derived from call transcript analysis.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function SynergiesPage() {
    return (
        <TierGate
            preview={
                <div className="p-6 space-y-4 opacity-70 pointer-events-none">
                    <h1 className="text-2xl text-text-primary">Business Synergies</h1>
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="card-os p-5 border border-border h-16 bg-bg-surface" />
                        ))}
                    </div>
                    <div className="card-os p-5 border border-border h-48 bg-bg-surface" />
                </div>
            }
        >
            <SynergiesDashboard />
        </TierGate>
    );
}
