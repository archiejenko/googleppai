import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
    MonitorPlay, Video, TrendingUp, TrendingDown,
    Eye, Activity, Wifi, WifiOff, CheckCircle2, AlertCircle,
    ExternalLink, Settings, Zap,
} from 'lucide-react';
import TierGate from '../../components/shared/TierGate';


import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMeetingAnalytics } from '../../hooks/useMeetingAnalytics';
import { useIntegrations } from '../../hooks/useIntegrations';

// ─── Types ────────────────────────────────────────────────────────────────────

type MeetingPlatform = 'Teams' | 'Zoom' | 'Meet';
type MeetingStatus = 'processing' | 'scored' | 'reviewed';

interface DbMeeting {
    id: string;
    type: string;
    platform: string | null;
    prospect_name: string | null;
    company_name: string | null;
    started_at: string | null;
    duration_seconds: number | null;
    overall_score: number | null;
    meddic_score: number | null;
    talk_ratio: number | null;
    presence_score: number | null;
    status: string;
    scores: Record<string, number>;
}

function platformFromType(type: string, platform: string | null): MeetingPlatform {
    if (platform) {
        const p = platform.toLowerCase();
        if (p.includes('teams')) return 'Teams';
        if (p.includes('zoom')) return 'Zoom';
        if (p.includes('meet')) return 'Meet';
    }
    if (type.includes('teams')) return 'Teams';
    if (type.includes('zoom')) return 'Zoom';
    if (type.includes('meet')) return 'Meet';
    return 'Teams';
}

function formatDuration(seconds: number | null): string {
    if (!seconds) return '—';
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<MeetingPlatform, string> = {
    Teams: 'text-[#5059c9] border-[#5059c9]/40 bg-[#5059c9]/10',
    Zoom: 'text-[#2D8CFF] border-[#2D8CFF]/40 bg-[#2D8CFF]/10',
    Meet: 'text-[#34a853] border-[#34a853]/40 bg-[#34a853]/10',
};

const PLATFORM_ICONS: Record<MeetingPlatform, string> = {
    Teams: 'T',
    Zoom: 'Z',
    Meet: 'M',
};

function PlatformBadge({ platform }: { platform: MeetingPlatform }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-md font-semibold ${PLATFORM_COLORS[platform]}`}>
            {PLATFORM_ICONS[platform]} {platform}
        </span>
    );
}

function StatusDot({ status }: { status: MeetingStatus }) {
    const cfg = {
        processing: { color: 'bg-status-warning', label: 'Processing' },
        scored: { color: 'bg-accent', label: 'Scored' },
        reviewed: { color: 'bg-status-success', label: 'Reviewed' },
    }[status];
    return (
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`w-1.5 h-1.5 ${cfg.color}`} />
            {cfg.label}
        </span>
    );
}

type IntegrationStatus = 'connected' | 'disconnected' | 'not_installed';

function IntegrationCard({
    name, description, status, icon: Icon, actionLabel, onAction,
}: {
    name: string;
    description: string;
    status: IntegrationStatus;
    icon: React.ElementType;
    actionLabel: string;
    onAction: () => void;
}) {
    const statusCfg: Record<IntegrationStatus, { label: string; color: string; Icon: React.ElementType }> = {
        connected: { label: 'Connected', color: 'text-status-success', Icon: CheckCircle2 },
        disconnected: { label: 'Disconnected', color: 'text-text-muted', Icon: WifiOff },
        not_installed: { label: 'Not installed', color: 'text-text-muted', Icon: AlertCircle },
    };
    const s = statusCfg[status];
    return (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-md flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[rgb(var(--text-secondary))]" />
                    </div>
                    <div>
                        <p className="text-sm text-text-primary">{name}</p>
                        <p className="text-xs text-text-muted">{description}</p>
                    </div>
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] ${s.color}`}>
                    <s.Icon className="w-3 h-3" />
                    {s.label}
                </span>
            </div>
            <button
                onClick={onAction}
                className="btn-ghost text-xs py-1.5 px-3 w-fit border border-border"
            >
                {actionLabel}
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterPlatform = 'All' | MeetingPlatform;
const PLATFORM_FILTERS: FilterPlatform[] = ['All', 'Teams', 'Zoom', 'Meet'];

export default function MeetingsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activePlatform, setActivePlatform] = useState<FilterPlatform>('All');
    const [meetings, setMeetings] = useState<DbMeeting[]>([]);
    const [loadingMeetings, setLoadingMeetings] = useState(true);
    const [loadingMoreMeetings, setLoadingMoreMeetings] = useState(false);
    const [meetingsCursor, setMeetingsCursor] = useState<string | null>(null);

    const { data: analytics } = useMeetingAnalytics(user?.id);
    const { integrations } = useIntegrations();

    const getPlatformStatus = (type: string): IntegrationStatus => {
        const rec = integrations[type];
        if (!rec) return 'disconnected';
        return rec.status === 'connected' ? 'connected' : 'disconnected';
    };

    const fetchMeetings = async (cursor: string | null, append: boolean) => {
        if (!user?.id) return;
        let query = supabase
            .from('meeting_sessions')
            .select('id, type, platform, prospect_name, company_name, started_at, duration_seconds, overall_score, meddic_score, talk_ratio, presence_score, status, scores')
            .order('started_at', { ascending: false })
            .limit(20);
        if (cursor) query = query.lt('started_at', cursor);
        const { data } = await query;
        const rows = (data as DbMeeting[]) ?? [];
        setMeetings(prev => append ? [...prev, ...rows] : rows);
        setMeetingsCursor(rows.length === 20 ? rows[rows.length - 1].started_at : null);
    };

    useEffect(() => {
        if (!user?.id) return;
        fetchMeetings(null, false).finally(() => setLoadingMeetings(false));
    }, [user?.id]);

    const handleLoadMoreMeetings = async () => {
        setLoadingMoreMeetings(true);
        await fetchMeetings(meetingsCursor, true);
        setLoadingMoreMeetings(false);
    };

    const filteredMeetings = meetings.filter(m =>
        activePlatform === 'All' || platformFromType(m.type, m.platform) === activePlatform
    );

    const scoredMeetings = meetings.filter(m => m.overall_score != null);

    // All analytics values come from the hook — no hardcoded constants
    const radarData = analytics?.radarData ?? [];
    const callAvg = analytics?.callAvg ?? 0;
    const meetingAvg = analytics?.meetingAvg ?? 0;
    const delta = analytics?.delta ?? 0;
    const kpiTrends = analytics?.kpiTrends ?? [];
    const hasComparisonData = analytics?.hasCallData || analytics?.hasMeetingData;

    // Derive upcoming vs past meetings
    const upcomingMeetings = filteredMeetings.filter(m => {
        if (!m.started_at) return false;
        return new Date(m.started_at) > new Date();
    });
    const pastMeetings = filteredMeetings.filter(m => {
        if (!m.started_at) return true;
        return new Date(m.started_at) <= new Date();
    });

    // Compute stat card values from real data
    const completedThisWeek = (() => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return pastMeetings.filter(m => m.started_at && new Date(m.started_at) >= weekAgo).length;
    })();
    const avgMeetingScore = (() => {
        const scored = pastMeetings.filter(m => m.overall_score != null);
        if (scored.length === 0) return 0;
        return Math.round(scored.reduce((sum, m) => sum + (m.overall_score ?? 0), 0) / scored.length);
    })();
    const openActionItems = (analytics as unknown as Record<string, unknown>)?.actionItemsOpen as number ?? 0;

    // Helper: score pill class
    const getScorePillClass = (score: number) => {
        if (score >= 80) return 'pill pill-green';
        if (score >= 60) return 'pill pill-amber';
        return 'pill pill-coral';
    };

    // Helper: score colour for stat
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'var(--color-green)';
        if (score >= 60) return 'var(--color-amber)';
        return 'var(--color-coral)';
    };

    return (
        <TierGate>
            <div className="pb-12 space-y-5">

                {/* Page Header */}
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <div className="page-kicker">Coaching</div>
                        <div className="page-title">Meetings</div>
                        <div className="page-desc">Coaching sessions, team reviews, and meeting history.</div>
                    </div>
                    <button
                        onClick={() => navigate('/settings/integrations')}
                        className="btn-primary text-xs flex items-center gap-2"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Integrations
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">Upcoming</div>
                        <div className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>{upcomingMeetings.length}</div>
                    </div>
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">Completed This Week</div>
                        <div className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>{completedThisWeek}</div>
                    </div>
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">Avg Meeting Score</div>
                        <div className="stat-value" style={{ color: avgMeetingScore > 0 ? getScoreColor(avgMeetingScore) : 'rgb(var(--text-muted))' }}>
                            {avgMeetingScore > 0 ? `${avgMeetingScore}%` : '—'}
                        </div>
                    </div>
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">Action Items Open</div>
                        <div className="stat-value" style={{ color: 'var(--color-coral)' }}>{openActionItems}</div>
                    </div>
                </div>

                {/* Platform Filter */}
                <div className="flex items-center gap-2">
                    {PLATFORM_FILTERS.map(p => (
                        <button
                            key={p}
                            onClick={() => setActivePlatform(p)}
                            className={`text-[11px] px-3 py-1 border rounded-lg transition-colors ${
                                activePlatform === p
                                    ? 'bg-[rgb(var(--accent-primary))] text-white border-[rgb(var(--accent-primary))]'
                                    : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Upcoming Meetings */}
                {loadingMeetings ? (
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 h-48 animate-pulse flex items-center justify-center">
                        <span className="text-[rgb(var(--text-muted))] text-sm">Loading meetings...</span>
                    </div>
                ) : filteredMeetings.length === 0 ? (
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 flex flex-col items-center justify-center py-12 gap-4 text-center">
                        <MonitorPlay className="w-8 h-8 text-[rgb(var(--text-muted))] opacity-40" />
                        <p className="text-[rgb(var(--text-muted))] text-sm">
                            {meetings.length === 0
                                ? 'No meetings analysed yet. Connect a meeting platform in Integrations to start capturing sessions.'
                                : `No ${activePlatform} meetings found.`}
                        </p>
                        <button
                            onClick={() => navigate('/settings/integrations')}
                            className="btn-primary text-xs flex items-center gap-1.5"
                        >
                            <Settings className="w-3 h-3" /> Configure Integrations
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Upcoming Meetings Card */}
                        {upcomingMeetings.length > 0 && (
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                <div className="card-title">Upcoming Meetings</div>
                                <div className="grid grid-cols-3 gap-4">
                                    {upcomingMeetings.slice(0, 6).map((meeting) => {
                                        const platform = platformFromType(meeting.type, meeting.platform);
                                        const dateStr = meeting.started_at
                                            ? new Date(meeting.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                            + ' · ' +
                                            new Date(meeting.started_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                            : '—';

                                        return (
                                            <div
                                                key={meeting.id}
                                                onClick={() => navigate(`/sessions/${meeting.id}`)}
                                                className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg p-4 flex flex-col gap-2.5 cursor-pointer hover:border-[rgba(255,107,107,0.3)] transition-colors"
                                            >
                                                <div className="font-['Oswald'] text-xs font-semibold text-[rgb(var(--text-primary))]">{dateStr}</div>
                                                <div className="flex items-center">
                                                    <PlatformBadge platform={platform} />
                                                </div>
                                                <div className="text-[11px] text-[rgb(var(--text-secondary))] leading-snug line-clamp-2">
                                                    {meeting.prospect_name || meeting.company_name || 'Meeting scheduled'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Past Meetings Table */}
                        {pastMeetings.length > 0 && (
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                <div className="card-title">Past Meetings</div>
                                <table className="table-os">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Participants</th>
                                            <th>Type</th>
                                            <th>Duration</th>
                                            <th>Status</th>
                                            <th>Score</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastMeetings.map((meeting) => {
                                            const platform = platformFromType(meeting.type, meeting.platform);
                                            const dateStr = meeting.started_at
                                                ? new Date(meeting.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                                : '—';
                                            const score = Math.round(meeting.overall_score ?? 0);

                                            return (
                                                <tr key={meeting.id}>
                                                    <td style={{ color: 'rgb(var(--text-primary))', fontWeight: 500 }}>{dateStr}</td>
                                                    <td>{meeting.prospect_name || meeting.company_name || '—'}</td>
                                                    <td><PlatformBadge platform={platform} /></td>
                                                    <td>{formatDuration(meeting.duration_seconds)}</td>
                                                    <td><StatusDot status={meeting.status as MeetingStatus} /></td>
                                                    <td>
                                                        {meeting.overall_score != null ? (
                                                            <span className={getScorePillClass(score)}>{score}%</span>
                                                        ) : (
                                                            <span className="text-[rgb(var(--text-muted))]">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/sessions/${meeting.id}`); }}
                                                            className="text-[var(--color-coral)] font-semibold text-xs hover:underline"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {meetingsCursor && activePlatform === 'All' && (
                                    <div className="flex justify-center pt-4">
                                        <button
                                            onClick={handleLoadMoreMeetings}
                                            disabled={loadingMoreMeetings}
                                            className="btn-primary text-xs py-2 px-6"
                                        >
                                            {loadingMoreMeetings ? 'Loading...' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Performance Comparison -- hidden below fold */}
                {hasComparisonData && (
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                            <div className="card-title">Call vs Meeting Performance</div>
                            <p className="text-[11px] text-[rgb(var(--text-muted))] mb-4">Same rep, different channel -- where the gap lives.</p>
                            <ResponsiveContainer width="100%" height={260}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="rgb(var(--border-default))" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: 'rgb(var(--text-muted))', fontSize: 10, fontFamily: 'Oswald' }}
                                    />
                                    <Radar name="Phone Calls" dataKey="calls" stroke="#ff6b6b" fill="#ff6b6b" fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name="Video Meetings" dataKey="meetings" stroke="#818cf8" fill="#818cf8" fillOpacity={0.12} strokeWidth={2} />
                                </RadarChart>
                            </ResponsiveContainer>
                            <div className="flex gap-4 mt-2">
                                <span className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--text-muted))]">
                                    <span className="w-3 h-0.5 bg-[rgb(var(--accent-primary))] inline-block rounded" /> Phone Calls
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--text-muted))]">
                                    <span className="w-3 h-0.5 bg-[#818cf8] inline-block rounded" /> Video Meetings
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 border-l-4 border-l-[rgb(var(--accent-primary))] flex-1">
                                <p className="stat-label mb-2">Key Insight</p>
                                {delta > 0 ? (
                                    <p className="text-[rgb(var(--text-primary))] text-sm leading-relaxed">
                                        You score{' '}
                                        <span style={{ color: 'var(--color-coral)' }}>{delta} points higher</span>{' '}
                                        on phone calls than video meetings.
                                    </p>
                                ) : delta < 0 ? (
                                    <p className="text-[rgb(var(--text-primary))] text-sm leading-relaxed">
                                        You score{' '}
                                        <span style={{ color: 'var(--color-green)' }}>{Math.abs(delta)} points higher</span>{' '}
                                        in video meetings than phone calls.
                                    </p>
                                ) : (
                                    <p className="text-[rgb(var(--text-primary))] text-sm leading-relaxed">
                                        Your performance is consistent across calls and video meetings.
                                    </p>
                                )}
                            </div>
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 flex flex-col gap-3">
                                <p className="stat-label">Averages</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-[rgb(var(--text-secondary))]">Phone Calls</span>
                                    <span style={{ color: 'var(--color-coral)' }} className="text-sm">{callAvg > 0 ? callAvg : '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-[rgb(var(--text-secondary))]">Video Meetings</span>
                                    <span className="text-[#818cf8] text-sm">{meetingAvg > 0 ? meetingAvg : '—'}</span>
                                </div>
                                <div className="border-t border-[rgb(var(--border-default))] pt-3">
                                    <button
                                        onClick={() => navigate('/drills')}
                                        className="btn-primary text-xs w-full flex items-center justify-center gap-1.5"
                                    >
                                        <Zap className="w-3 h-3" /> On-Camera Drills
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Presence Insights */}
                <section>
                    <div className="card-title mb-4">Presence Insights -- Last 30 Days</div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {[
                            { kpi: kpiTrends[0], icon: Eye },
                            { kpi: kpiTrends[1], icon: Activity },
                            { kpi: kpiTrends[2], icon: MonitorPlay },
                        ].map(({ kpi, icon: Icon }, i) => {
                            if (!kpi) return <div key={i} className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 h-28 animate-pulse" />;
                            const trendLabel = kpi.trendLabel ?? '—';
                            return (
                                <div key={kpi.label} className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-[rgb(var(--text-muted))]">
                                        <Icon className="w-4 h-4" />
                                        <span className="stat-label mb-0">{kpi.label}</span>
                                    </div>
                                    <p className="stat-value" style={{ color: 'rgb(var(--text-primary))' }}>{kpi.value}</p>
                                    {kpi.delta !== null ? (
                                        <span className={`flex items-center gap-1 text-xs ${kpi.up ? 'text-[var(--color-green)]' : 'text-[var(--color-coral)]'}`}>
                                            {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {trendLabel}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-[rgb(var(--text-muted))]">No prior data</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                        <p className="stat-label mb-4">Presence Score Trend</p>
                        {scoredMeetings.length < 2 ? (
                            <p className="text-[rgb(var(--text-muted))] text-xs py-6 text-center">
                                Complete more meetings to see your presence trend.
                            </p>
                        ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={scoredMeetings.slice().reverse().map((m, i) => ({
                                date: m.started_at ? new Date(m.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' }) : `#${i + 1}`,
                                score: Math.round(m.presence_score ?? 0),
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: 'rgb(var(--text-muted))', fontSize: 9, fontFamily: 'Oswald' }}
                                    interval={Math.max(0, Math.floor(scoredMeetings.length / 8) - 1)}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: 'rgb(var(--text-muted))', fontSize: 9, fontFamily: 'Oswald' }}
                                    width={28}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgb(15 23 42)',
                                        border: '1px solid rgb(30 41 59)',
                                        borderRadius: 8,
                                        fontFamily: 'Oswald',
                                        fontSize: 11,
                                    }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    itemStyle={{ color: '#818cf8' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#818cf8"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 3, fill: '#818cf8' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </section>

                {/* Integration Status */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="card-title mb-0">Integration Status</div>
                        <button
                            onClick={() => navigate('/settings/integrations')}
                            className="text-xs text-[var(--color-coral)] flex items-center gap-1 hover:underline"
                        >
                            Configure <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <IntegrationCard
                            name="Microsoft Teams"
                            description="Post-meeting transcript + call records"
                            status={getPlatformStatus('teams')}
                            icon={Video}
                            actionLabel={getPlatformStatus('teams') === 'connected' ? 'Manage' : 'Connect Microsoft'}
                            onAction={() => navigate('/settings/integrations')}
                        />
                        <IntegrationCard
                            name="Zoom"
                            description="Multi-platform meeting bot via OAuth"
                            status={getPlatformStatus('zoom')}
                            icon={Video}
                            actionLabel={getPlatformStatus('zoom') === 'connected' ? 'Manage' : 'Connect Zoom'}
                            onAction={() => navigate('/settings/integrations')}
                        />
                        <IntegrationCard
                            name="Google Meet"
                            description="Google Workspace meeting recordings"
                            status={getPlatformStatus('meet')}
                            icon={Video}
                            actionLabel={getPlatformStatus('meet') === 'connected' ? 'Manage' : 'Connect Google'}
                            onAction={() => navigate('/settings/integrations')}
                        />
                        <IntegrationCard
                            name="Recall.ai Bot"
                            description="Universal meeting bot -- any platform"
                            status={getPlatformStatus('recall_ai')}
                            icon={Wifi}
                            actionLabel={getPlatformStatus('recall_ai') === 'connected' ? 'Configure Bot' : 'Setup Bot'}
                            onAction={() => navigate('/settings/integrations')}
                        />
                        <IntegrationCard
                            name="Browser Extension"
                            description="Zero-IT capture via Chrome/Edge"
                            status="not_installed"
                            icon={ExternalLink}
                            actionLabel="Learn More"
                            onAction={() => navigate('/settings/integrations')}
                        />
                    </div>
                </section>
            </div>
        </TierGate>
    );
}
