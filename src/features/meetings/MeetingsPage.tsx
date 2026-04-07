import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
    MonitorPlay, Video, Users, Clock, TrendingUp, TrendingDown,
    Eye, Activity, Wifi, WifiOff, CheckCircle2, AlertCircle,
    ExternalLink, Settings, ChevronRight, Zap,
} from 'lucide-react';
import TierGate from '../../components/shared/TierGate';
import ScoreBadge from '../../components/shared/ScoreBadge';
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest border font-black ${PLATFORM_COLORS[platform]}`}>
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

function ScoreBar({ label, value, color = 'bg-accent' }: { label: string; value: number; color?: string }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-20 text-text-muted shrink-0">{label}</span>
            <div className="flex-1 h-1 bg-bg-raised">
                <div className={`h-full ${color} transition-all`} style={{ width: `${value}%` }} />
            </div>
            <span className="w-6 text-right text-text-secondary">{value}</span>
        </div>
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
        <div className="card-os p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-bg-raised border border-border flex items-center justify-center">
                        <Icon className="w-4 h-4 text-text-secondary" />
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

    return (
        <TierGate>
            <div className="p-6 space-y-8 max-w-7xl mx-auto">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <MonitorPlay className="w-6 h-6 text-accent" />
                            <h1 className="text-2xl text-text-primary tracking-tight">MEETING INTELLIGENCE</h1>
                            <span className="text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 border border-accent/30 text-accent bg-accent/5">
                                Revenue Intel
                            </span>
                        </div>
                        <p className="text-text-secondary text-sm">
                            Full-session analysis for Teams, Zoom & Google Meet — body language, transcript, and prospect engagement.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/settings/integrations')}
                        className="btn-ghost text-xs flex items-center gap-2 border border-border px-4 py-2"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Integrations
                    </button>
                </div>

                {/* ── Section 1: Recent Meetings ── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs uppercase tracking-[0.18em] text-text-muted">Recent Meetings</h2>
                        <div className="flex gap-1">
                            {PLATFORM_FILTERS.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setActivePlatform(p)}
                                    className={`text-[11px] px-3 py-1 border transition-colors ${
                                        activePlatform === p
                                            ? 'bg-accent text-white border-accent'
                                            : 'border-border text-text-muted hover:text-text-primary hover:border-border'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingMeetings ? (
                        <div className="card-os p-8 flex items-center justify-center">
                            <span className="text-text-muted text-sm animate-pulse">Loading meetings…</span>
                        </div>
                    ) : filteredMeetings.length === 0 ? (
                        <div className="card-os p-10 flex flex-col items-center justify-center gap-4 text-center">
                            <MonitorPlay className="w-8 h-8 text-text-muted opacity-40" />
                            <p className="text-text-muted text-sm">
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
                    <div className="space-y-2">
                        {filteredMeetings.map((meeting: DbMeeting) => {
                            const platform = platformFromType(meeting.type, meeting.platform);
                            const dateStr = meeting.started_at
                                ? new Date(meeting.started_at).toISOString().slice(0, 10)
                                : '—';

                            return (
                            <div
                                key={meeting.id}
                                onClick={() => navigate(`/sessions/${meeting.id}`)}
                                className="card-os p-4 cursor-pointer hover:bg-bg-raised transition-colors group flex items-center gap-4"
                            >
                                {/* Platform + date */}
                                <div className="flex flex-col gap-1.5 min-w-[110px]">
                                    <PlatformBadge platform={platform} />
                                    <span className="text-[11px] text-text-muted">{dateStr}</span>
                                </div>

                                {/* Duration + Prospect */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary truncate">
                                        {meeting.prospect_name || meeting.company_name || 'Unknown prospect'}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1 text-xs text-text-muted">
                                            <Clock className="w-3 h-3" />{formatDuration(meeting.duration_seconds)}
                                        </span>
                                        {meeting.company_name && (
                                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                                <Users className="w-3 h-3" />{meeting.company_name}
                                            </span>
                                        )}
                                        <StatusDot status={meeting.status as MeetingStatus} />
                                    </div>
                                </div>

                                {/* Score bars */}
                                <div className="hidden lg:flex flex-col gap-1 w-48">
                                    <ScoreBar label="MEDDIC"  value={Math.round(meeting.meddic_score ?? 0)} />
                                    <ScoreBar label="Talk"    value={Math.round(meeting.talk_ratio ?? 0)}   color="bg-blue-400" />
                                    <ScoreBar label="Presence" value={Math.round(meeting.presence_score ?? 0)} color="bg-purple-400" />
                                </div>

                                {/* Overall score */}
                                <div className="flex items-center gap-2">
                                    <ScoreBadge score={Math.round(meeting.overall_score ?? 0)} size="lg" />
                                    <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            );
                        })}
                        {meetingsCursor && activePlatform === 'All' && (
                            <div className="flex justify-center pt-2">
                                <button
                                    onClick={handleLoadMoreMeetings}
                                    disabled={loadingMoreMeetings}
                                    className="btn-ghost text-xs py-2 px-6"
                                >
                                    {loadingMoreMeetings ? 'Loading…' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </div>
                    )}
                </section>

                {/* ── Section 2: Performance Comparison ── */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 card-os p-6">
                        <h2 className="text-xs uppercase tracking-[0.18em] text-text-muted mb-1">Call vs Meeting Performance</h2>
                        <p className="text-[11px] text-text-muted mb-4">Same rep, different channel — where the gap lives.</p>
                        {!hasComparisonData ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <MonitorPlay className="w-8 h-8 text-text-muted opacity-30 mb-3" />
                                <p className="text-text-muted text-sm">No call or meeting data yet.</p>
                                <p className="text-xs text-text-muted mt-1">Complete live calls and meeting sessions to see the channel comparison.</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={260}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="rgb(var(--color-border))" />
                                        <PolarAngleAxis
                                            dataKey="subject"
                                            tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10, fontFamily: 'Oswald' }}
                                        />
                                        <Radar name="Phone Calls" dataKey="calls" stroke="#ff6b6b" fill="#ff6b6b" fillOpacity={0.15} strokeWidth={2} />
                                        <Radar name="Video Meetings" dataKey="meetings" stroke="#818cf8" fill="#818cf8" fillOpacity={0.12} strokeWidth={2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                                <div className="flex gap-4 mt-2">
                                    <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                        <span className="w-3 h-0.5 bg-accent inline-block" /> Phone Calls
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                        <span className="w-3 h-0.5 bg-[#818cf8] inline-block" /> Video Meetings
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Insight callout */}
                    <div className="flex flex-col gap-4">
                        <div className="card-os p-5 border-l-4 border-l-accent flex-1">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Key Insight</p>
                            {!hasComparisonData ? (
                                <p className="text-text-muted text-sm">Connect a meeting platform and complete live calls to see channel comparison insights.</p>
                            ) : delta > 0 ? (
                                <p className="text-text-primary text-sm leading-relaxed">
                                    You score{' '}
                                    <span className="text-accent">{delta} points higher</span>{' '}
                                    on phone calls than video meetings. On-camera presence may be limiting your meeting conversions.
                                </p>
                            ) : delta < 0 ? (
                                <p className="text-text-primary text-sm leading-relaxed">
                                    You score{' '}
                                    <span className="text-status-success">{Math.abs(delta)} points higher</span>{' '}
                                    in video meetings than phone calls. Your on-camera presence is strong.
                                </p>
                            ) : (
                                <p className="text-text-primary text-sm leading-relaxed">
                                    Your performance is consistent across calls and video meetings.
                                </p>
                            )}
                        </div>
                        <div className="card-os p-5 flex flex-col gap-3">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted">Averages</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-text-secondary">Phone Calls</span>
                                <span className="text-accent text-sm">{callAvg > 0 ? callAvg : '—'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-text-secondary">Video Meetings</span>
                                <span className="text-[#818cf8] text-sm">{meetingAvg > 0 ? meetingAvg : '—'}</span>
                            </div>
                            <div className="border-t border-border pt-3">
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

                {/* ── Section 3: Presence Insights ── */}
                <section>
                    <h2 className="text-xs uppercase tracking-[0.18em] text-text-muted mb-4">Presence Insights — Last 30 Days</h2>

                    {/* KPI row — values and deltas from useMeetingAnalytics */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { kpi: kpiTrends[0], icon: Eye },
                            { kpi: kpiTrends[1], icon: Activity },
                            { kpi: kpiTrends[2], icon: MonitorPlay },
                        ].map(({ kpi, icon: Icon }, i) => {
                            if (!kpi) return <div key={i} className="card-os p-5 border border-border h-28 animate-pulse bg-bg-raised" />;
                            const trendLabel = kpi.trendLabel ?? '—';
                            return (
                                <div key={kpi.label} className="card-os p-5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <Icon className="w-4 h-4" />
                                        <span className="text-[10px] uppercase tracking-widest">{kpi.label}</span>
                                    </div>
                                    <p className="text-3xl text-text-primary">{kpi.value}</p>
                                    {kpi.delta !== null ? (
                                        <span className={`flex items-center gap-1 text-xs ${kpi.up ? 'text-status-success' : 'text-status-danger'}`}>
                                            {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {trendLabel}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-text-muted">No prior data</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Trend chart — built from real meeting presence scores */}
                    <div className="card-os p-6">
                        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-4">Presence Score Trend</p>
                        {scoredMeetings.length < 2 ? (
                            <p className="text-text-muted text-xs py-6 text-center">
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
                                    tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 9, fontFamily: 'Oswald' }}
                                    interval={Math.max(0, Math.floor(scoredMeetings.length / 8) - 1)}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 9, fontFamily: 'Oswald' }}
                                    width={28}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgb(15 23 42)',
                                        border: '1px solid rgb(30 41 59)',
                                        borderRadius: 0,
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

                {/* ── Section 4: Integration Status ── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs uppercase tracking-[0.18em] text-text-muted">Integration Status</h2>
                        <button
                            onClick={() => navigate('/settings/integrations')}
                            className="text-xs text-accent flex items-center gap-1 hover:underline"
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
                            description="Universal meeting bot — any platform"
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
