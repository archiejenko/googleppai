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

/** Score colour: green >= 80, amber 60-79, coral < 60 */
function scoreColor(v: number): string {
    if (v >= 80) return '#4ADE80';
    if (v >= 60) return '#FBBF24';
    return '#FF6B6B';
}

function scorePillClass(v: number): string {
    if (v >= 80) return 'pill pill-green';
    if (v >= 60) return 'pill pill-amber';
    return 'pill pill-coral';
}

function ScoreChip({ value }: { value: number | null }) {
    if (value === null) return <span className="text-[rgb(var(--text-muted))] text-xs">&mdash;</span>;
    const rounded = Math.round(value);
    return <span className={scorePillClass(rounded)}>{rounded}%</span>;
}

function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ── Expanded Row ──────────────────────────────────────────────── */

function ExpandedRow({ score }: { score: LiveScore }) {
    const signals = score.signals_detected || {};
    const activeSignals = Object.entries(signals).filter(([, v]) => v).map(([k]) => k);

    return (
        <tr>
            <td colSpan={7} className="bg-[#0a0e14] px-5 py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Score breakdown */}
                    <div className="space-y-2">
                        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">Score Breakdown</p>
                        {[
                            ['Talk Ratio', score.talk_ratio_score],
                            ['Discovery', score.discovery_score],
                            ['Engagement', score.engagement_score],
                            ['Objection Handling', score.objection_handling_score],
                        ].map(([label, val]) => {
                            const v = val as number | null;
                            return (
                                <div key={label as string} className="flex items-center gap-2.5 mb-2">
                                    <span className="text-[11px] text-[rgb(var(--text-secondary))] w-[72px] flex-shrink-0">{label as string}</span>
                                    <div className="flex-1 h-1.5 rounded-[3px] bg-[rgb(var(--border-default))]">
                                        {v !== null && (
                                            <div
                                                className="h-full rounded-[3px]"
                                                style={{ width: `${v}%`, background: scoreColor(v) }}
                                            />
                                        )}
                                    </div>
                                    <span className="font-display text-[12px] font-semibold w-9 text-right flex-shrink-0" style={{ color: v !== null ? scoreColor(v) : undefined }}>
                                        {v !== null ? `${Math.round(v)}%` : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Coaching nudges */}
                    <div className="space-y-2">
                        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">
                            Coaching Nudges ({(score.coaching_events || []).length})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {(score.coaching_events || []).slice(0, 5).map((ev, i) => (
                                <p key={i} className="text-[11px] text-[rgb(var(--text-secondary))] border-l-[3px] border-[#FF6B6B] pl-2 leading-relaxed bg-[#0a0e14] rounded-r-lg py-1">
                                    {ev.nudge}
                                </p>
                            ))}
                            {(score.coaching_events || []).length === 0 && (
                                <p className="text-[11px] text-[rgb(var(--text-muted))]">No nudges triggered</p>
                            )}
                        </div>
                    </div>

                    {/* Signals + objections */}
                    <div className="space-y-2">
                        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))]">Signals Detected</p>
                        <div className="flex flex-wrap gap-1">
                            {activeSignals.length > 0
                                ? activeSignals.map(s => (
                                    <span key={s} className="text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-md bg-[rgba(255,107,107,0.12)] text-[#FF6B6B] font-semibold">
                                        {s}
                                    </span>
                                ))
                                : <span className="text-[11px] text-[rgb(var(--text-muted))]">None detected</span>
                            }
                        </div>
                        {(score.objection_log || []).length > 0 && (
                            <>
                                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))] mt-2">
                                    Objections ({(score.objection_log || []).length})
                                </p>
                                {(score.objection_log || []).slice(0, 3).map((o, i) => (
                                    <p key={i} className="text-[11px] text-[rgb(var(--text-secondary))]">
                                        {o.text}
                                        <span className={`ml-2 text-[10px] font-semibold ${o.handled ? 'text-[#4ADE80]' : 'text-[#FF6B6B]'}`}>
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

        // Realtime subscription -- prepend new scores as calls complete
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

    /* ── Derived stats ───────────────────────────────────────────── */
    const totalCalls = filtered.length;
    const avgScore = totalCalls > 0
        ? Math.round(filtered.reduce((sum, s) => sum + (displayScore(s) ?? 0), 0) / totalCalls)
        : 0;
    const highCount = filtered.filter(s => (displayScore(s) ?? 0) >= 80).length;
    const lowCount = filtered.filter(s => (displayScore(s) ?? 0) < 60).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[rgb(var(--border-default))] border-t-[#FF6B6B]" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex justify-between items-start mb-5">
                <div>
                    <div className="page-kicker">Intelligence</div>
                    <div className="page-title">Live Scores</div>
                    <div className="page-desc">Real-time session monitoring and scoring</div>
                </div>
                <button
                    onClick={exportCsv}
                    className="inline-flex items-center gap-2 text-[11px] font-semibold py-[7px] px-3.5 rounded-lg border border-[rgb(var(--border-subtle))] bg-transparent text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
            </div>

            {/* Stat Cards - 5 columns like mockup */}
            <div className="grid grid-cols-5 gap-3 mb-5">
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Total Calls</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">{totalCalls}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Avg Score</div>
                    <div className="stat-value" style={{ color: totalCalls > 0 ? scoreColor(avgScore) : undefined }}>{totalCalls > 0 ? `${avgScore}%` : '—'}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">High Scores</div>
                    <div className="stat-value text-[#4ADE80]">{highCount}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Low Scores</div>
                    <div className="stat-value text-[#FF6B6B]">{lowCount}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Sessions Today</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">
                        {filtered.filter(s => {
                            const d = new Date(s.call_started_at);
                            const now = new Date();
                            return d.toDateString() === now.toDateString();
                        }).length}
                    </div>
                </div>
            </div>

            {/* Two-column layout: left (table), right (stats sidebar) */}
            <div className="grid grid-cols-[2fr_1fr] gap-4 mb-4">
                {/* Left Column - Recent Scores Table */}
                <div className="flex flex-col gap-4">
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                        <div className="card-title">Recent Scores</div>

                        {/* Filters */}
                        <div className="flex items-center gap-3 mb-4">
                            <Filter className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                            <select
                                value={filterScore}
                                onChange={e => setFilterScore(e.target.value)}
                                className="text-[12px] py-1.5 px-3 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] rounded-lg text-[rgb(var(--text-primary))] focus:outline-none focus:border-[#FF6B6B]"
                            >
                                <option value="all">All scores</option>
                                <option value="high">High (75+)</option>
                                <option value="mid">Mid (55-74)</option>
                                <option value="low">Low (&lt;55)</option>
                            </select>
                            <select
                                value={filterSignal}
                                onChange={e => setFilterSignal(e.target.value)}
                                className="text-[12px] py-1.5 px-3 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] rounded-lg text-[rgb(var(--text-primary))] focus:outline-none focus:border-[#FF6B6B]"
                            >
                                <option value="all">All signals</option>
                                <option value="budget">Budget</option>
                                <option value="timeline">Timeline</option>
                                <option value="pain">Pain</option>
                                <option value="buying">Buying</option>
                                <option value="competitor">Competitor</option>
                            </select>
                            <span className="text-[11px] text-[rgb(var(--text-muted))]">{filtered.length} calls</span>
                        </div>

                        <table className="table-os">
                            <thead>
                                <tr>
                                    <th className="w-8" />
                                    <th>Prospect</th>
                                    <th>Company</th>
                                    <th>Score</th>
                                    <th>Duration</th>
                                    <th>Top Signal</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(score => {
                                    const topSignal = Object.entries(score.signals_detected || {}).find(([, v]) => v)?.[0];
                                    const isExpanded = expandedId === score.id;
                                    return [
                                        <tr
                                            key={score.id}
                                            onClick={() => setExpandedId(isExpanded ? null : score.id)}
                                            className="cursor-pointer"
                                        >
                                            <td className="text-[rgb(var(--text-muted))]">
                                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </td>
                                            <td className="text-[rgb(var(--text-primary))] font-medium">{score.prospect_name || '—'}</td>
                                            <td>{score.company_name || '—'}</td>
                                            <td>
                                                <ScoreChip value={displayScore(score)} />
                                            </td>
                                            <td className="font-mono text-[11px]">
                                                {formatDuration(score.duration_secs)}
                                            </td>
                                            <td>
                                                {topSignal && (
                                                    <span className="text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded-md bg-[rgba(255,107,107,0.12)] text-[#FF6B6B] font-semibold">
                                                        {topSignal}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="font-mono text-[10px]">
                                                {formatTime(score.call_started_at)}
                                            </td>
                                        </tr>,
                                        isExpanded && <ExpandedRow key={`${score.id}-expanded`} score={score} />,
                                    ];
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-8 text-center text-[rgb(var(--text-muted))] text-[12px]">
                                            No live scores yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {nextCursor && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="text-[11px] font-semibold py-[7px] px-5 rounded-lg border border-[rgb(var(--border-subtle))] bg-transparent text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-colors"
                                >
                                    {loadingMore ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Team Live Stats */}
                <div className="flex flex-col gap-4">
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                        <div className="card-title">Session Stats</div>

                        {/* Stat rows */}
                        <div className="flex items-center justify-between py-3.5 border-b border-[rgb(var(--border-default))]">
                            <div className="flex items-center gap-2 text-[12px] text-[rgb(var(--text-secondary))]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] inline-block" />
                                <span>Total Sessions</span>
                            </div>
                            <div className="font-display text-[22px] font-semibold text-[rgb(var(--text-primary))]">{totalCalls}</div>
                        </div>
                        <div className="flex items-center justify-between py-3.5 border-b border-[rgb(var(--border-default))]">
                            <div className="flex items-center gap-2 text-[12px] text-[rgb(var(--text-secondary))]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] inline-block" />
                                <span>Avg Score</span>
                            </div>
                            <div className="font-display text-[22px] font-semibold" style={{ color: totalCalls > 0 ? scoreColor(avgScore) : 'rgb(var(--text-primary))' }}>
                                {totalCalls > 0 ? `${avgScore}%` : '—'}
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3.5 border-b border-[rgb(var(--border-default))] last:border-b-0">
                            <div className="flex items-center gap-2 text-[12px] text-[rgb(var(--text-secondary))]">
                                <span>High Performing</span>
                            </div>
                            <div className="font-display text-[22px] font-semibold text-[#4ADE80]">{highCount}</div>
                        </div>

                        {/* Score Distribution */}
                        <div className="mt-5 pt-4 border-t border-[rgb(var(--border-default))]">
                            <div className="card-title" style={{ fontSize: 12 }}>Score Distribution</div>
                            {filtered.length > 0 ? (
                                <div className="space-y-2">
                                    {[
                                        { label: 'High (80%+)', count: highCount, color: '#4ADE80' },
                                        { label: 'Mid (60-79%)', count: filtered.filter(s => { const v = displayScore(s) ?? 0; return v >= 60 && v < 80; }).length, color: '#FBBF24' },
                                        { label: 'Low (<60%)', count: lowCount, color: '#FF6B6B' },
                                    ].map(bucket => (
                                        <div key={bucket.label} className="flex items-center gap-2">
                                            <span className="text-[11px] text-[rgb(var(--text-secondary))] w-[80px] flex-shrink-0">{bucket.label}</span>
                                            <div className="flex-1 h-1.5 rounded-[3px] bg-[rgb(var(--border-default))]">
                                                <div
                                                    className="h-full rounded-[3px]"
                                                    style={{
                                                        width: `${totalCalls > 0 ? (bucket.count / totalCalls) * 100 : 0}%`,
                                                        background: bucket.color,
                                                    }}
                                                />
                                            </div>
                                            <span className="font-display text-[11px] font-semibold w-6 text-right" style={{ color: bucket.color }}>
                                                {bucket.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-[rgb(var(--text-muted))]">No data yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
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
