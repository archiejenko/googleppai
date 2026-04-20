import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronRight, Download, Filter } from 'lucide-react';
import TierGate from '../../components/shared/TierGate';

interface LiveScore {
    id: string;
    call_id: string;
    prospect_name: string | null;
    company_name: string | null;
    call_started_at: string;
    duration_secs: number;
    overall_score: number | null;
    final_score: number | null;
    signals_detected: Record<string, boolean> | null;
    coaching_events: { nudge: string; category: string }[] | null;
    session_snapshots: any[];
    talk_ratio_score: number | null;
    discovery_score: number | null;
    engagement_score: number | null;
    objection_handling_score: number | null;
    sentiment_curve: { t: number; sentiment: number }[] | null;
    objection_log: { t: number; text: string; handled: boolean }[] | null;
}

function displayScore(s: LiveScore): number | null {
    return s.overall_score ?? s.final_score;
}

function ScoreChip({ value }: { value: number | null }) {
    if (value === null) return <span className="text-text-muted text-xs">—</span>;
    const color = value >= 75 ? 'text-status-success' : value >= 55 ? 'text-status-warning' : 'text-status-danger';
    return <span className={`font-mono text-sm ${color}`}>{Math.round(value)}</span>;
}

function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ExpandedRow({ score }: { score: LiveScore }) {
    const signals = score.signals_detected || {};
    const activeSignals = Object.entries(signals).filter(([, v]) => v).map(([k]) => k);

    return (
        <tr>
            <td colSpan={7} className="bg-bg-raised px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Score breakdown */}
                    <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted">Score Breakdown</p>
                        {[
                            ['Talk Ratio', score.talk_ratio_score],
                            ['Discovery', score.discovery_score],
                            ['Engagement', score.engagement_score],
                            ['Objection Handling', score.objection_handling_score],
                        ].map(([label, val]) => (
                            <div key={label as string} className="flex justify-between text-xs">
                                <span className="text-text-muted">{label as string}</span>
                                <ScoreChip value={val as number | null} />
                            </div>
                        ))}
                    </div>

                    {/* Coaching nudges */}
                    <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted">
                            Coaching Nudges ({(score.coaching_events || []).length})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {(score.coaching_events || []).slice(0, 5).map((ev, i) => (
                                <p key={i} className="text-xs text-text-secondary border-l-2 border-accent/30 pl-2 leading-relaxed">
                                    {ev.nudge}
                                </p>
                            ))}
                            {(score.coaching_events || []).length === 0 && (
                                <p className="text-xs text-text-muted">No nudges triggered</p>
                            )}
                        </div>
                    </div>

                    {/* Signals + objections */}
                    <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-widest text-text-muted">Signals Detected</p>
                        <div className="flex flex-wrap gap-1">
                            {activeSignals.length > 0
                                ? activeSignals.map(s => (
                                    <span key={s} className="text-[9px] uppercase tracking-widest px-2 py-0.5 border border-accent/30 bg-accent/10 text-accent">
                                        {s}
                                    </span>
                                ))
                                : <span className="text-xs text-text-muted">None detected</span>
                            }
                        </div>
                        {(score.objection_log || []).length > 0 && (
                            <>
                                <p className="text-[9px] uppercase tracking-widest text-text-muted mt-2">
                                    Objections ({(score.objection_log || []).length})
                                </p>
                                {(score.objection_log || []).slice(0, 3).map((o, i) => (
                                    <p key={i} className="text-xs text-text-secondary">
                                        {o.text}
                                        <span className={`ml-2 text-[9px] ${o.handled ? 'text-status-success' : 'text-status-danger'}`}>
                                            {o.handled ? 'handled' : 'unhandled'}
                                        </span>
                                    </p>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
}

const PAGE_SIZE = 25;

function LiveScoresTable() {
    const { user } = useAuth();
    const [scores, setScores] = useState<LiveScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterScore, setFilterScore] = useState<string>('all');
    const [filterSignal, setFilterSignal] = useState<string>('all');

    const fetchScores = async (cursor: string | null, append: boolean) => {
        if (!user?.id) return;
        let query = supabase
            .from('live_scores')
            .select('*')
            .eq('rep_id', user.id)
            .order('call_started_at', { ascending: false })
            .limit(PAGE_SIZE);
        if (cursor) query = query.lt('call_started_at', cursor);
        const { data } = await query;
        const rows = (data as LiveScore[]) ?? [];
        setScores(prev => append ? [...prev, ...rows] : rows);
        setNextCursor(rows.length === PAGE_SIZE ? rows[rows.length - 1].call_started_at : null);
    };

    useEffect(() => {
        if (!user?.id) return;
        fetchScores(null, false).finally(() => setLoading(false));

        // Realtime subscription — prepend new scores as calls complete
        const channel = supabase
            .channel(`live_scores:${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'live_scores', filter: `rep_id=eq.${user.id}` },
                (payload) => {
                    setScores(prev => [payload.new as LiveScore, ...prev]);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    const handleLoadMore = async () => {
        setLoadingMore(true);
        await fetchScores(nextCursor, true);
        setLoadingMore(false);
    };

    const filtered = scores.filter(s => {
        const score = displayScore(s) ?? 0;
        const scoreMatch =
            filterScore === 'all' ||
            (filterScore === 'high' && score >= 75) ||
            (filterScore === 'mid' && score >= 55 && score < 75) ||
            (filterScore === 'low' && score < 55);
        const signalMatch =
            filterSignal === 'all' ||
            (s.signals_detected as any)?.[filterSignal] === true;
        return scoreMatch && signalMatch;
    });

    const exportCsv = () => {
        const rows = [
            ['Date', 'Prospect', 'Company', 'Duration', 'Score', 'Talk Ratio', 'Discovery', 'Engagement', 'Objections', 'Top Signal'],
            ...filtered.map(s => [
                formatDate(s.call_started_at),
                s.prospect_name || '',
                s.company_name || '',
                formatDuration(s.duration_secs),
                Math.round(displayScore(s) ?? 0),
                Math.round(s.talk_ratio_score ?? 0),
                Math.round(s.discovery_score ?? 0),
                Math.round(s.engagement_score ?? 0),
                Math.round(s.objection_handling_score ?? 0),
                Object.entries(s.signals_detected || {}).find(([, v]) => v)?.[0] || '',
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'live-scores.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="p-8 text-text-muted text-sm">Loading…</div>;

    return (
        <div className="p-6 space-y-4 max-w-6xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">Revenue Intelligence</p>
                    <h1 className="text-2xl text-text-primary">Live Scores</h1>
                </div>
                <button onClick={exportCsv} className="btn-ghost flex items-center gap-2 text-xs py-2 px-3">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-text-muted" />
                <select
                    value={filterScore}
                    onChange={e => setFilterScore(e.target.value)}
                    className="input-os text-xs py-1.5 px-3"
                >
                    <option value="all">All scores</option>
                    <option value="high">High (75+)</option>
                    <option value="mid">Mid (55–74)</option>
                    <option value="low">Low (&lt;55)</option>
                </select>
                <select
                    value={filterSignal}
                    onChange={e => setFilterSignal(e.target.value)}
                    className="input-os text-xs py-1.5 px-3"
                >
                    <option value="all">All signals</option>
                    <option value="budget">Budget</option>
                    <option value="timeline">Timeline</option>
                    <option value="pain">Pain</option>
                    <option value="buying">Buying</option>
                    <option value="competitor">Competitor</option>
                </select>
                <span className="text-xs text-text-muted">{filtered.length} calls</span>
            </div>

            <div className="card-os border border-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
                            <th className="w-8 px-4 py-3" />
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Prospect</th>
                            <th className="px-4 py-3 text-left">Company</th>
                            <th className="px-4 py-3 text-right">Duration</th>
                            <th className="px-4 py-3 text-center">Score</th>
                            <th className="px-4 py-3 text-left">Top Signal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map(score => {
                            const topSignal = Object.entries(score.signals_detected || {}).find(([, v]) => v)?.[0];
                            const isExpanded = expandedId === score.id;
                            return [
                                <tr
                                    key={score.id}
                                    onClick={() => setExpandedId(isExpanded ? null : score.id)}
                                    className="hover:bg-bg-raised transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3 text-text-muted">
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </td>
                                    <td className="px-4 py-3 text-text-muted text-xs font-mono whitespace-nowrap">
                                        {formatDate(score.call_started_at)}
                                    </td>
                                    <td className="px-4 py-3 text-text-primary">{score.prospect_name || '—'}</td>
                                    <td className="px-4 py-3 text-text-secondary">{score.company_name || '—'}</td>
                                    <td className="px-4 py-3 text-right text-text-muted text-xs font-mono">
                                        {formatDuration(score.duration_secs)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <ScoreChip value={displayScore(score)} />
                                    </td>
                                    <td className="px-4 py-3">
                                        {topSignal && (
                                            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 border border-accent/20 text-accent/70">
                                                {topSignal}
                                            </span>
                                        )}
                                    </td>
                                </tr>,
                                isExpanded && <ExpandedRow key={`${score.id}-expanded`} score={score} />,
                            ];
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-text-muted text-sm">
                                    No live scores yet. Start a session from any deal or use the Live Session button.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {nextCursor && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="btn-ghost text-xs py-2 px-6"
                    >
                        {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function LiveScoresHistory() {
    return (
        <TierGate>
            <LiveScoresTable />
        </TierGate>
    );
}
