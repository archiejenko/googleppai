import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, TrendingUp, TrendingDown, Minus, Plus,
    Trophy, XCircle, PauseCircle, Trash2, RefreshCw,
    Lightbulb, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SUPABASE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Outcome = 'won' | 'lost' | 'stalled';

interface DealOutcome {
    id: string;
    deal_name: string;
    outcome: Outcome;
    deal_value_gbp: number | null;
    closed_at: string;
    notes: string | null;
    associated_pitch_ids: string[];
    avg_pitch_score: number | null;
    avg_meddic_completion: number | null;
}

interface CorrelationRow {
    metric: string;
    won_avg: number | null;
    lost_avg: number | null;
    won_count: number;
    lost_count: number;
    multiplier: number | null;
}

interface LogForm {
    deal_name: string;
    outcome: Outcome;
    deal_value_gbp: string;
    closed_at: string;
    notes: string;
    associated_pitch_ids: string;
}

const EMPTY_FORM: LogForm = {
    deal_name:            '',
    outcome:              'won',
    deal_value_gbp:       '',
    closed_at:            new Date().toISOString().split('T')[0],
    notes:                '',
    associated_pitch_ids: '',
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

const OUTCOME_CONFIG = {
    won:     { icon: Trophy,     color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/30', label: 'Won'     },
    lost:    { icon: XCircle,    color: 'text-status-danger',  bg: 'bg-status-danger/10  border-status-danger/30',  label: 'Lost'    },
    stalled: { icon: PauseCircle,color: 'text-status-warning', bg: 'bg-status-warning/10 border-status-warning/30', label: 'Stalled' },
};

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
    const cfg = OUTCOME_CONFIG[outcome];
    return (
        <span className={`flex items-center gap-1 text-[10px] uppercase tracking-widest border px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
            <cfg.icon className="w-3 h-3" /> {cfg.label}
        </span>
    );
}

function MetricDelta({ won, lost, metric }: { won: number | null; lost: number | null; metric: string }) {
    if (!won || !lost) return null;
    const isInverted = metric === 'talk_ratio'; // lower = better
    const better = isInverted ? won < lost : won > lost;
    const diff = Math.abs(won - lost).toFixed(1);
    const Icon = better ? TrendingUp : (won === lost ? Minus : TrendingDown);
    const color = better ? 'text-status-success' : 'text-status-danger';
    return (
        <span className={`flex items-center gap-1 text-xs ${color}`}>
            <Icon className="w-3.5 h-3.5" /> {diff}
        </span>
    );
}

const METRIC_LABELS: Record<string, string> = {
    avg_pitch_score:    'Avg Pitch Score',
    meddic_completion:  'MEDDIC Completion',
    talk_ratio:         'Talk Ratio',
    objection_handling: 'Objection Handling',
    discovery_score:    'Discovery Score',
};

// ─── Main dashboard ───────────────────────────────────────────────────────────

function DealOutcomesDashboard() {
    const { session } = useAuth();
    const navigate = useNavigate();

    const [outcomes, setOutcomes]           = useState<DealOutcome[]>([]);
    const [correlations, setCorrelations]   = useState<CorrelationRow[]>([]);
    const [insights, setInsights]           = useState<string[]>([]);
    const [loading, setLoading]             = useState(true);
    const [ingesting, setIngesting]         = useState(false);
    const [showForm, setShowForm]           = useState(false);
    const [form, setForm]                   = useState<LogForm>(EMPTY_FORM);
    const [submitting, setSubmitting]       = useState(false);
    const [insightOpen, setInsightOpen]     = useState(true);
    const [outcomeFilter, setOutcomeFilter] = useState<Outcome | 'all'>('all');

    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

    const call = useCallback(async (body: Record<string, unknown>) => {
        const res = await fetch(`${SUPABASE_FN}/deal-outcomes`, {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return res.json();
    }, [authHeader]);

    const loadData = useCallback(async () => {
        if (!authHeader) return;
        setLoading(true);
        const [listRes, corrRes] = await Promise.all([
            call({ action: 'list_outcomes', limit: 50 }),
            call({ action: 'get_correlation' }),
        ]);
        if (listRes.ok) setOutcomes(listRes.data.outcomes ?? []);
        if (corrRes.ok) {
            setCorrelations(corrRes.data.correlations ?? []);
            setInsights(corrRes.data.insights ?? []);
        }
        setLoading(false);
    }, [authHeader, call]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSubmit = async () => {
        if (!form.deal_name.trim()) return;
        setSubmitting(true);
        const pitchIds = form.associated_pitch_ids
            .split(',').map(s => s.trim()).filter(Boolean);
        await call({
            action:                 'log_outcome',
            deal_name:              form.deal_name,
            outcome:                form.outcome,
            deal_value_gbp:         form.deal_value_gbp ? Number(form.deal_value_gbp) : null,
            closed_at:              new Date(form.closed_at).toISOString(),
            notes:                  form.notes || null,
            associated_pitch_ids:   pitchIds,
        });
        setForm(EMPTY_FORM);
        setShowForm(false);
        setSubmitting(false);
        await loadData();
    };

    const handleDelete = async (id: string) => {
        await call({ action: 'delete_outcome', id });
        await loadData();
    };

    const handleCrmIngest = async () => {
        setIngesting(true);
        await call({ action: 'ingest_from_crm' });
        await loadData();
        setIngesting(false);
    };

    const wonCount    = outcomes.filter(o => o.outcome === 'won').length;
    const lostCount   = outcomes.filter(o => o.outcome === 'lost').length;
    
    const winRate     = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : null;
    const totalValue  = outcomes.filter(o => o.outcome === 'won').reduce((s, o) => s + (o.deal_value_gbp ?? 0), 0);

    const filtered = outcomeFilter === 'all' ? outcomes : outcomes.filter(o => o.outcome === outcomeFilter);

    return (
        <div className="pb-12 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/revenue-intel')} className="p-2 text-text-muted hover:text-text-primary transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-0.5">Revenue Intelligence</p>
                        <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight flex items-center gap-3">
                            <Trophy className="w-6 h-6 text-accent" />
                            Deal Outcomes
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCrmIngest}
                        disabled={ingesting}
                        className="btn-ghost flex items-center gap-2 text-xs py-2 px-3 border border-border"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
                        {ingesting ? 'Importing…' : 'Import from CRM'}
                    </button>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="btn-primary flex items-center gap-2 text-xs py-2 px-4"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Log Outcome
                    </button>
                </div>
            </div>

            {loading && <LoadingSpinner message="Loading deal outcomes…" />}

            {!loading && (
                <>
                    {/* KPI row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Won',        value: wonCount,                              color: 'text-status-success' },
                            { label: 'Lost',       value: lostCount,                             color: 'text-status-danger'  },
                            { label: 'Win Rate',   value: winRate != null ? `${winRate}%` : '—', color: 'text-accent'         },
                            { label: 'Won Value',  value: totalValue > 0 ? `£${Math.round(totalValue/1000)}k` : '—', color: 'text-text-primary' },
                        ].map(k => (
                            <div key={k.label} className="card-os p-4 border border-border">
                                <p className={`text-2xl ${k.color}`}>{k.value}</p>
                                <p className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">{k.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Log form */}
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-os border border-accent/30 bg-accent/3 p-6 space-y-4"
                        >
                            <p className="text-[10px] uppercase tracking-widest text-accent mb-1">Log Deal Outcome</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-1.5">Deal Name *</label>
                                    <input
                                        type="text"
                                        value={form.deal_name}
                                        onChange={e => setForm(f => ({ ...f, deal_name: e.target.value }))}
                                        className="input-os w-full text-sm"
                                        placeholder="Acme Corp — Enterprise"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-1.5">Outcome</label>
                                    <select
                                        value={form.outcome}
                                        onChange={e => setForm(f => ({ ...f, outcome: e.target.value as Outcome }))}
                                        className="input-os w-full text-sm"
                                    >
                                        <option value="won">Won</option>
                                        <option value="lost">Lost</option>
                                        <option value="stalled">Stalled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-1.5">Deal Value (£)</label>
                                    <input
                                        type="number"
                                        value={form.deal_value_gbp}
                                        onChange={e => setForm(f => ({ ...f, deal_value_gbp: e.target.value }))}
                                        className="input-os w-full text-sm"
                                        placeholder="25000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-1.5">Close Date</label>
                                    <input
                                        type="date"
                                        value={form.closed_at}
                                        onChange={e => setForm(f => ({ ...f, closed_at: e.target.value }))}
                                        className="input-os w-full text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
                                        Linked Session IDs
                                        <span className="ml-1 opacity-50 normal-case">(comma-separated pitch IDs — optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.associated_pitch_ids}
                                        onChange={e => setForm(f => ({ ...f, associated_pitch_ids: e.target.value }))}
                                        className="input-os w-full text-sm font-mono"
                                        placeholder="uuid1, uuid2, ..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-1.5">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                        rows={2}
                                        className="input-os w-full text-sm resize-none"
                                        placeholder="What drove this outcome?"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2 border-t border-border">
                                <button onClick={handleSubmit} disabled={submitting || !form.deal_name.trim()} className="btn-primary text-xs px-5 py-2">
                                    {submitting ? 'Saving…' : 'Save Outcome'}
                                </button>
                                <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="btn-ghost text-xs px-4 py-2 border border-border">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Correlation insight card */}
                    {(correlations.length > 0 || insights.length > 0) && (
                        <div className="card-os border border-accent/20 bg-accent/3">
                            <button
                                onClick={() => setInsightOpen(v => !v)}
                                className="w-full flex items-center justify-between p-5"
                            >
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-accent" />
                                    <span className="text-sm text-text-primary">Win/Loss Correlation Insights</span>
                                </div>
                                {insightOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                            </button>

                            {insightOpen && (
                                <div className="border-t border-border px-5 pb-5 space-y-5">
                                    {/* Insight strings */}
                                    {insights.length > 0 && (
                                        <div className="space-y-2 pt-4">
                                            {insights.map((ins, i) => (
                                                <p key={i} className="text-sm text-text-secondary leading-relaxed flex gap-2">
                                                    <span className="text-accent mt-0.5 shrink-0">→</span>
                                                    {ins}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Metric comparison table */}
                                    {correlations.some(r => r.won_avg !== null) && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-border text-text-muted uppercase tracking-widest text-[10px]">
                                                        <th className="text-left py-2 pr-4">Metric</th>
                                                        <th className="text-right py-2 px-3 text-status-success">Won avg</th>
                                                        <th className="text-right py-2 px-3 text-status-danger">Lost avg</th>
                                                        <th className="text-right py-2 pl-3">Δ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {correlations.filter(r => r.won_avg !== null && r.lost_avg !== null).map(row => (
                                                        <tr key={row.metric} className="hover:bg-bg-raised transition-colors">
                                                            <td className="py-2 pr-4 text-text-secondary">{METRIC_LABELS[row.metric] ?? row.metric}</td>
                                                            <td className="py-2 px-3 text-right text-status-success">{row.won_avg ?? '—'}</td>
                                                            <td className="py-2 px-3 text-right text-status-danger">{row.lost_avg ?? '—'}</td>
                                                            <td className="py-2 pl-3 text-right">
                                                                <MetricDelta won={row.won_avg} lost={row.lost_avg} metric={row.metric} />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <p className="text-[10px] text-text-muted opacity-50 mt-2">
                                                Based on {Math.max(...correlations.map(r => r.won_count ?? 0))} won and {Math.max(...correlations.map(r => r.lost_count ?? 0))} lost/stalled deals
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Outcome list */}
                    <div>
                        {/* Filter tabs */}
                        <div className="flex items-center gap-2 mb-4">
                            {(['all', 'won', 'lost', 'stalled'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setOutcomeFilter(f)}
                                    className={`text-[10px] uppercase tracking-widest border px-3 py-1.5 transition-colors ${
                                        outcomeFilter === f
                                            ? 'border-accent/60 text-accent bg-accent/10'
                                            : 'border-border text-text-muted hover:border-border/60'
                                    }`}
                                >
                                    {f === 'all' ? `All (${outcomes.length})` : `${f} (${outcomes.filter(o => o.outcome === f).length})`}
                                </button>
                            ))}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="card-os p-10 text-center border border-border">
                                <Trophy className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
                                <p className="text-sm text-text-muted">
                                    {outcomes.length === 0
                                        ? 'No deal outcomes logged yet. Click "Log Outcome" or import from CRM.'
                                        : `No ${outcomeFilter} deals logged.`}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filtered.map((deal, i) => (
                                    <motion.div
                                        key={deal.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="card-os border border-border p-4 flex items-start justify-between gap-4 hover:border-border/60 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <OutcomeBadge outcome={deal.outcome} />
                                                <span className="text-sm text-text-primary truncate">{deal.deal_name}</span>
                                                {deal.deal_value_gbp && (
                                                    <span className="text-sm text-accent font-mono ml-auto shrink-0">
                                                        £{Number(deal.deal_value_gbp).toLocaleString('en-GB')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] text-text-muted">
                                                <span>{new Date(deal.closed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                {deal.avg_pitch_score != null && (
                                                    <span>Avg score: <span className="text-text-secondary">{deal.avg_pitch_score}</span></span>
                                                )}
                                                {deal.avg_meddic_completion != null && (
                                                    <span>MEDDIC: <span className="text-text-secondary">{deal.avg_meddic_completion}%</span></span>
                                                )}
                                                {deal.associated_pitch_ids.length > 0 && (
                                                    <span>{deal.associated_pitch_ids.length} session{deal.associated_pitch_ids.length !== 1 ? 's' : ''} linked</span>
                                                )}
                                            </div>
                                            {deal.notes && (
                                                <p className="text-xs text-text-muted mt-1.5 opacity-70 line-clamp-1">{deal.notes}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(deal.id)}
                                            className="text-text-muted hover:text-status-danger transition-colors shrink-0 p-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default function DealOutcomesPage() {
    return (
        <TierGate
            preview={
                <div className="p-6 space-y-4 opacity-70 pointer-events-none">
                    <h1 className="text-2xl text-text-primary">Deal Outcomes</h1>
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="card-os p-5 border border-border h-16 bg-bg-surface" />
                        ))}
                    </div>
                    <div className="card-os border border-border h-40 bg-bg-surface" />
                </div>
            }
        >
            <DealOutcomesDashboard />
        </TierGate>
    );
}
