import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronLeft, Play, Clock, Users, Calendar,
    AlertTriangle, CheckCircle, TrendingUp, Mic,
    Eye, Activity, MonitorPlay, BookOpen, Lock,
} from 'lucide-react';
import { useTier } from '../../context/TierContext';
import { supabase } from '../../utils/supabase';

// ─── Data Model ───────────────────────────────────────────────────────────────

interface TranscriptSegment {
    speaker: 'rep' | 'prospect';
    name: string;
    start_ms: number;
    text: string;
    sentiment: number;
    moments?: Array<{ type: string; label: string }>;
}

interface Moment {
    timestamp_ms: number;
    type: 'objection' | 'positive_signal' | 'filler_spike' | 'meddic_hit' | 'monologue' | 'low_presence' | 'prospect_engagement' | 'next_step';
    label: string;
    severity: 'positive' | 'neutral' | 'warning' | 'critical';
}

interface Session {
    id: string;
    type: 'phone_call' | 'teams_meeting' | 'zoom_meeting' | 'meet_meeting';
    date: string;
    duration: string;
    rep: string;
    prospect: string;
    platform: string | null;
    overall_score: number;
    vs_avg: number;
    personal_avg: number;
    scores: {
        meddic: number;
        talk_ratio_rep: number;
        pace: number;
        energy: number;
        confidence: number;
        objection: number;
        next_steps: number;
        eye_contact_pct: number | null;
        posture: number | null;
        presence: number | null;
        slide_alignment: number | null;
        prospect_engagement: number | null;
    };
    presence_timeline: number[];  // 30 values, one per 30-second segment
    transcript: TranscriptSegment[];
    moments: Moment[];
    ai_feedback: {
        summary: string;
        strengths: Array<{ text: string; timestamp: string }>;
        improvements: Array<{ text: string; timestamp: string; drill: string }>;
        presence_feedback: string | null;
        drill_recommendations: string[];
    };
    meeting_metadata: {
        consent_confirmed: boolean;
        slides_detected: boolean;
    } | null;
}

// ─── Mock Sessions ────────────────────────────────────────────────────────────

const MOCK_SESSIONS: Record<string, Session> = {
    'session-001': {
        id: 'session-001',
        type: 'phone_call',
        date: '2026-03-08',
        duration: '24 min',
        rep: 'Alex Chen',
        prospect: 'Vertex Capital',
        platform: null,
        overall_score: 78,
        vs_avg: +6,
        personal_avg: 72,
        scores: {
            meddic: 74, talk_ratio_rep: 58, pace: 82,
            energy: 76, confidence: 80, objection: 71, next_steps: 85,
            eye_contact_pct: null, posture: null, presence: null,
            slide_alignment: null, prospect_engagement: null,
        },
        presence_timeline: [],
        transcript: [
            { speaker: 'rep', name: 'Alex', start_ms: 0, text: "Hi Sarah, thanks for making time today. I wanted to follow up on the proposal we sent through last week.", sentiment: 0.4, moments: [] },
            { speaker: 'prospect', name: 'Sarah', start_ms: 12000, text: "Sure, we've had a chance to look at it. I do have some concerns around the pricing model.", sentiment: -0.3, moments: [{ type: 'objection', label: 'OBJECTION' }] },
            { speaker: 'rep', name: 'Alex', start_ms: 24000, text: "Totally understand — can you tell me a bit more about what specifically is a concern? Is it the per-seat model or the total commitment?", sentiment: 0.1, moments: [] },
            { speaker: 'prospect', name: 'Sarah', start_ms: 40000, text: "Mainly the total. We have budget approval up to £80k annually and you're at £95k.", sentiment: -0.2, moments: [{ type: 'meddic_hit', label: 'MEDDIC: Budget' }] },
            { speaker: 'rep', name: 'Alex', start_ms: 60000, text: "That's really helpful context. So if we could get to £80k, would you be in a position to move forward within this quarter?", sentiment: 0.5, moments: [{ type: 'meddic_hit', label: 'MEDDIC: Timeline' }] },
            { speaker: 'prospect', name: 'Sarah', start_ms: 78000, text: "Yes, that's the ballpark. We have a board review on the 28th and ideally want a vendor selected before then.", sentiment: 0.3, moments: [{ type: 'positive_signal', label: 'SIGNAL' }] },
            { speaker: 'rep', name: 'Alex', start_ms: 95000, text: "Perfect. Let me, um, take this back to my team and see what we can do. I'm, like, pretty confident we can find a way to make this work. I'll have a revised proposal to you by Thursday — does that work?", sentiment: 0.6, moments: [{ type: 'filler_spike', label: 'FILLER' }, { type: 'next_step', label: 'NEXT STEP' }] },
        ],
        moments: [
            { timestamp_ms: 24000, type: 'objection', label: 'Pricing objection', severity: 'warning' },
            { timestamp_ms: 60000, type: 'meddic_hit', label: 'Budget confirmed', severity: 'positive' },
            { timestamp_ms: 78000, type: 'meddic_hit', label: 'Timeline identified', severity: 'positive' },
            { timestamp_ms: 95000, type: 'filler_spike', label: 'Filler burst (um, like)', severity: 'neutral' },
            { timestamp_ms: 95000, type: 'next_step', label: 'Proposal by Thursday', severity: 'positive' },
        ],
        ai_feedback: {
            summary: "Strong call with clear MEDDIC progression — you surfaced budget constraint early and converted it into a timeline commitment. Filler words in the close undercut your authority at a critical moment.",
            strengths: [
                { text: "Responded to the pricing objection with an open-ended probe rather than defending the price, keeping the conversation collaborative.", timestamp: "0:24" },
                { text: "Directly confirmed budget ceiling (£80k) and tied it to a quarterly timeline — two MEDDIC criteria in one exchange.", timestamp: "1:00" },
                { text: "Secured a concrete next step (revised proposal, specific date) before ending the call.", timestamp: "1:35" },
            ],
            improvements: [
                { text: "Filler words (um, like, pretty) in your closing statement diluted confidence at the most critical point in the call. Practice your close language.", timestamp: "1:35", drill: 'Filler Word Elimination' },
                { text: "You didn't explicitly identify the Economic Buyer — confirm who approves the final PO beyond the board review.", timestamp: "0:40", drill: 'MEDDIC Deep Dive' },
                { text: "Talk ratio of 58% is good but you spoke for 90 consecutive seconds at 0:40 — pause earlier to check for reaction.", timestamp: "0:40", drill: 'Talk Ratio Control' },
            ],
            presence_feedback: null,
            drill_recommendations: ['Filler Word Elimination', 'MEDDIC Deep Dive', 'Confidence Under Pressure'],
        },
        meeting_metadata: null,
    },

    'mtg-002': {
        id: 'mtg-002',
        type: 'teams_meeting',
        date: '2026-03-07',
        duration: '47 min',
        rep: 'Alex Chen',
        prospect: 'Vertex Capital',
        platform: 'Teams',
        overall_score: 84,
        vs_avg: +12,
        personal_avg: 72,
        scores: {
            meddic: 71, talk_ratio_rep: 62, pace: 88,
            energy: 79, confidence: 85, objection: 73, next_steps: 90,
            eye_contact_pct: 81, posture: 74, presence: 88,
            slide_alignment: 76, prospect_engagement: 82,
        },
        presence_timeline: [
            88, 91, 85, 79, 72, 68, 65, 70, 75, 82,
            86, 88, 90, 91, 87, 83, 78, 74, 71, 69,
            72, 78, 84, 88, 90, 91, 89, 87, 85, 88,
        ],
        transcript: [
            { speaker: 'rep', name: 'Alex', start_ms: 0, text: "Good morning Sarah, James — great to have you both. Can you see my screen okay? I want to walk through a few things before we get into the proposal.", sentiment: 0.6, moments: [] },
            { speaker: 'prospect', name: 'Sarah', start_ms: 18000, text: "Yes, looks good. We're keen to see the integration section — that was flagged in our last conversation.", sentiment: 0.2, moments: [] },
            { speaker: 'rep', name: 'Alex', start_ms: 30000, text: "Absolutely, let's go there now. So this slide shows the three integration points with your existing Salesforce setup — each takes under two weeks to configure.", sentiment: 0.5, moments: [{ type: 'meddic_hit', label: 'MEDDIC: Implementation' }] },
            { speaker: 'prospect', name: 'James', start_ms: 60000, text: "That's quicker than I expected. Who would own the implementation on our side?", sentiment: 0.3, moments: [] },
            { speaker: 'rep', name: 'Alex', start_ms: 75000, text: "Good question — typically it's your RevOps lead supported by our dedicated CSM. We'd do a kickoff call within 48 hours of contract signing and have you live within 14 days. The key metric we track is time-to-first-value.", sentiment: 0.7, moments: [{ type: 'positive_signal', label: 'SIGNAL' }] },
            { speaker: 'prospect', name: 'Sarah', start_ms: 120000, text: "The 14-day guarantee is compelling. What happens if you miss it?", sentiment: 0.0, moments: [{ type: 'objection', label: 'OBJECTION' }] },
            { speaker: 'rep', name: 'Alex', start_ms: 135000, text: "We extend your first month free — it's written into the MSA. We've never triggered it in 3 years, but it's there for your peace of mind.", sentiment: 0.8, moments: [{ type: 'positive_signal', label: 'SIGNAL' }] },
            { speaker: 'prospect', name: 'James', start_ms: 160000, text: "That actually resolves my biggest concern. Sarah, I think we're close here.", sentiment: 0.9, moments: [{ type: 'prospect_engagement', label: 'PROSPECT' }] },
            { speaker: 'rep', name: 'Alex', start_ms: 178000, text: "Glad to hear it. To make sure we're aligned — what would need to be true for you to give us the green light by end of month?", sentiment: 0.6, moments: [{ type: 'meddic_hit', label: 'MEDDIC: Decision' }] },
        ],
        moments: [
            { timestamp_ms: 30000, type: 'meddic_hit', label: 'Implementation timeline', severity: 'positive' },
            { timestamp_ms: 72000, type: 'low_presence', label: 'Eye contact dropped (looking at slides)', severity: 'warning' },
            { timestamp_ms: 120000, type: 'objection', label: 'Delivery guarantee challenge', severity: 'warning' },
            { timestamp_ms: 160000, type: 'prospect_engagement', label: 'Strong prospect buy-in signal', severity: 'positive' },
            { timestamp_ms: 178000, type: 'next_step', label: 'Decision criteria confirmed', severity: 'positive' },
        ],
        ai_feedback: {
            summary: "Your strongest meeting performance this month. MEDDIC coverage was thorough and you handled the delivery guarantee objection with a specific, credible counter (SLA clause) that visibly shifted the room. Eye contact dipped when screen-sharing — a common pattern to address.",
            strengths: [
                { text: "Proactively addressed the integration timeline before being asked — showed preparation and reduced the prospect's risk perception.", timestamp: "0:30" },
                { text: "Used a specific SLA commitment (first month free) to neutralise the delivery guarantee objection with zero defensiveness.", timestamp: "2:15" },
                { text: "Closed with a decision-criteria question rather than a yes/no close — sophisticated technique that surfaced remaining blockers.", timestamp: "2:58" },
            ],
            improvements: [
                { text: "Eye contact drops significantly when screen-sharing (0:72 segment scored 41%). Look at the camera lens, not your slides, when making key points.", timestamp: "1:12", drill: 'On-Camera Presence' },
                { text: "Talk ratio hit 62% — acceptable but watch the 90-second monologue at 1:15. After explaining the integration, you should have paused to check for reaction.", timestamp: "1:15", drill: 'Talk Ratio Control' },
                { text: "Slide alignment score 76% — at three points you read slide copy verbatim. Slides should anchor the conversation, not replace it.", timestamp: "0:30", drill: 'Slide-Free Delivery' },
            ],
            presence_feedback: "Overall on-camera presence is strong (88/100) — your energy and gestures read well on video. The main opportunity is eye contact during screen share (avg 41% vs 81% when not sharing). Try looking at your webcam when making critical statements, even while slides are visible.",
            drill_recommendations: ['On-Camera Presence', 'Slide-Free Delivery', 'Talk Ratio Control'],
        },
        meeting_metadata: {
            consent_confirmed: true,
            slides_detected: true,
        },
    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function formatMs(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function ScoreRow({
    label, value, max = 100, delay = 0, belowAvg = false,
}: {
    label: string;
    value: number;
    max?: number;
    delay?: number;
    belowAvg?: boolean;
}) {
    const pct = Math.round((value / max) * 100);
    const color = value >= 80 ? '#22c55e' : value >= 65 ? '#ff6b6b' : '#ef4444';
    return (
        <div className="flex items-center gap-2">
            <span className={`w-32 text-xs shrink-0 ${belowAvg ? 'text-status-danger' : 'text-text-secondary'}`}>
                {label}
            </span>
            <div className="flex-1 h-2 bg-bg-raised overflow-hidden">
                <motion.div
                    className="h-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay, ease: 'easeOut' }}
                />
            </div>
            <span className={`w-8 text-xs text-right tabular-nums ${belowAvg ? 'text-status-danger' : 'text-text-primary'}`}>
                {value}{max === 100 ? '' : '%'}
            </span>
        </div>
    );
}

function MomentBadge({ type, label }: { type: Moment['type']; label: string }) {
    const colors: Record<string, string> = {
        objection: 'bg-status-warning/10 text-status-warning border-status-warning/30',
        positive_signal: 'bg-status-success/10 text-status-success border-status-success/30',
        filler_spike: 'bg-bg-raised text-text-muted border-border',
        meddic_hit: 'bg-accent/10 text-accent border-accent/30',
        monologue: 'bg-status-danger/10 text-status-danger border-status-danger/30',
        low_presence: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
        prospect_engagement: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
        next_step: 'bg-status-success/10 text-status-success border-status-success/30',
    };
    return (
        <span className={`inline-flex text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${colors[type] ?? colors.meddic_hit}`}>
            {label}
        </span>
    );
}

function PresenceTimeline({ segments }: { segments: number[] }) {
    const lowMoments = segments.filter(s => s < 65).length;
    const highMoments = segments.filter(s => s >= 85).length;

    return (
        <div className="card-os p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Presence Timeline</h3>
                <div className="flex gap-4">
                    {lowMoments > 0 && (
                        <span className="text-[11px] text-status-warning flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {lowMoments} low presence
                        </span>
                    )}
                    {highMoments > 0 && (
                        <span className="text-[11px] text-status-success flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {highMoments} high energy
                        </span>
                    )}
                </div>
            </div>

            {/* Heatmap bar */}
            <div className="flex gap-0.5 h-8 items-stretch">
                {segments.map((score, i) => {
                    const color = score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444';
                    const opacity = 0.3 + (score / 100) * 0.7;
                    return (
                        <div
                            key={i}
                            className="flex-1 cursor-pointer relative group"
                            style={{ backgroundColor: color, opacity }}
                            title={`${i * 30}s–${(i + 1) * 30}s: ${score}`}
                        >
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-bg-raised border border-border text-[9px] px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                                {formatMs(i * 30000)} · {score}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3 mt-2">
                {[{ color: '#22c55e', label: '≥80 High' }, { color: '#f59e0b', label: '65–79 Mid' }, { color: '#ef4444', label: '<65 Low' }].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1 text-[10px] text-text-muted">
                        <span className="w-2 h-2 inline-block" style={{ backgroundColor: color }} />
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function PlatformBadge({ type, platform }: { type: Session['type']; platform: string | null }) {
    const labels: Record<string, { label: string; color: string }> = {
        phone_call: { label: 'PHONE CALL', color: 'bg-accent/10 text-accent border-accent/30' },
        teams_meeting: { label: 'TEAMS MEETING', color: 'bg-[#5059c9]/10 text-[#5059c9] border-[#5059c9]/30' },
        zoom_meeting: { label: 'ZOOM MEETING', color: 'bg-[#2D8CFF]/10 text-[#2D8CFF] border-[#2D8CFF]/30' },
        meet_meeting: { label: 'GOOGLE MEET', color: 'bg-[#34a853]/10 text-[#34a853] border-[#34a853]/30' },
    };
    const cfg = labels[type] ?? labels.phone_call;
    return (
        <span className={`text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 border ${cfg.color}`}>
            {platform ? `${platform} — ` : ''}{cfg.label}
        </span>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SessionReviewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isRevIntel } = useTier();

    const [session, setSession] = useState<Session | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        // Try DB first; fall back to mock data for demo IDs
        const mockFallback = MOCK_SESSIONS[id];
        if (mockFallback) {
            setSession(mockFallback);
            setLoadingSession(false);
            return;
        }

        (async () => {
            const { data, error } = await supabase
                .from('meeting_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                setSessionError('Session not found.');
            } else {
                // Map DB row to Session interface
                const row = data as Record<string, unknown>;
                const mapped: Session = {
                    id: row.id as string,
                    type: (row.type as Session['type']) ?? 'phone_call',
                    date: row.started_at
                        ? new Date(row.started_at as string).toISOString().slice(0, 10)
                        : '—',
                    duration: row.duration_seconds
                        ? `${Math.round((row.duration_seconds as number) / 60)} min`
                        : '—',
                    rep: 'You',
                    prospect: (row.prospect_name as string) ?? 'Unknown',
                    platform: (row.platform as string) ?? null,
                    overall_score: Math.round((row.overall_score as number) ?? 0),
                    vs_avg: 0,
                    personal_avg: 0,
                    scores: (row.scores as Session['scores']) ?? {
                        meddic: 0, talk_ratio_rep: 0, pace: 0, energy: 0,
                        confidence: 0, objection: 0, next_steps: 0,
                        eye_contact_pct: null, posture: null, presence: null,
                        slide_alignment: null, prospect_engagement: null,
                    },
                    presence_timeline: ((row.presence_timeline as number[]) ?? []),
                    transcript: ((row.transcript as TranscriptSegment[]) ?? []),
                    moments: ((row.moments as Moment[]) ?? []),
                    ai_feedback: ((row.ai_feedback as Session['ai_feedback']) ?? {
                        summary: '',
                        strengths: [],
                        improvements: [],
                        presence_feedback: null,
                        drill_recommendations: [],
                    }),
                    meeting_metadata: (row.meeting_metadata as Session['meeting_metadata']) ?? null,
                };
                setSession(mapped);
            }
            setLoadingSession(false);
        })();
    }, [id]);

    if (loadingSession) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[50vh]">
                <p className="text-text-muted text-sm animate-pulse">Loading session…</p>
            </div>
        );
    }

    if (sessionError || !session) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p className="text-text-muted text-sm">{sessionError ?? 'Session not found.'}</p>
                <button onClick={() => navigate('/meetings')} className="btn-ghost text-xs border border-border px-4 py-2">
                    Back to Meetings
                </button>
            </div>
        );
    }

    const isCall = session.type === 'phone_call';
    const isMeeting = !isCall;
    const consentOk = session.meeting_metadata?.consent_confirmed ?? false;
    const slidesDetected = session.meeting_metadata?.slides_detected ?? false;

    const s = session.scores;
    const avg = session.personal_avg;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">

            {/* ── Back ── */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {/* ── Session Header ── */}
            <div className="card-os p-6">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <PlatformBadge type={session.type} platform={session.platform} />
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                <Calendar className="w-3.5 h-3.5" /> {session.date}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                <Clock className="w-3.5 h-3.5" /> {session.duration}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                <Users className="w-3.5 h-3.5" /> {session.rep} · {session.prospect}
                            </span>
                        </div>
                        <h1 className="text-xl text-text-primary">{session.prospect}</h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Overall</p>
                            <p className="text-4xl text-accent">{session.overall_score}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">vs Avg</p>
                            <p className={`text-2xl ${session.vs_avg >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                                {session.vs_avg >= 0 ? '+' : ''}{session.vs_avg}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main 2-col: Playback + Scores ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Playback Panel */}
                <div className="card-os p-6 flex flex-col gap-5">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Playback</h3>

                    {/* Thumbnail / waveform placeholder */}
                    <div className="w-full h-40 bg-bg-raised border border-border flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                        {isMeeting ? (
                            <MonitorPlay className="w-10 h-10 text-text-muted opacity-40" />
                        ) : (
                            <Mic className="w-10 h-10 text-text-muted opacity-40" />
                        )}
                        <p className="text-xs text-text-muted">Recording · {session.duration}</p>
                        <button
                            disabled
                            className="btn-primary flex items-center gap-2 text-xs px-5 py-2 opacity-40 cursor-not-allowed"
                            title="Playback requires a connected meeting integration"
                        >
                            <Play className="w-3.5 h-3.5" /> Play Session
                        </button>
                        <p className="text-[10px] text-text-muted">Connect a meeting platform to enable playback</p>
                    </div>

                    {/* Timeline scrubber */}
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Timeline — Key Moments</p>
                        <div className="relative">
                            {/* Track */}
                            <div className="h-2 bg-bg-raised border border-border" />
                            {/* Moment markers */}
                            {session.moments.map((m, i) => {
                                const durationMs = (parseInt(session.duration) * 60 * 1000);
                                const pct = Math.min(98, (m.timestamp_ms / durationMs) * 100);
                                const sColor: Record<string, string> = {
                                    positive: '#22c55e',
                                    neutral: '#94a3b8',
                                    warning: '#f59e0b',
                                    critical: '#ef4444',
                                };
                                return (
                                    <div
                                        key={i}
                                        className="absolute top-0 -translate-y-0.5 w-3 h-3 border-2 cursor-pointer group"
                                        style={{ left: `${pct}%`, borderColor: sColor[m.severity], backgroundColor: sColor[m.severity] }}
                                        title={`${formatMs(m.timestamp_ms)} — ${m.label}`}
                                    >
                                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-bg-raised border border-border text-[9px] px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
                                            {formatMs(m.timestamp_ms)} · {m.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-3">
                            {[
                                { color: '#22c55e', label: 'Positive' },
                                { color: '#f59e0b', label: 'Warning' },
                                { color: '#ef4444', label: 'Critical' },
                                { color: '#94a3b8', label: 'Neutral' },
                            ].map(({ color, label }) => (
                                <span key={label} className="flex items-center gap-1 text-[10px] text-text-muted">
                                    <span className="w-2 h-2" style={{ backgroundColor: color }} /> {label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Score Panel */}
                <div className="card-os p-6 flex flex-col gap-4">
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Session Scores</h3>

                    {/* Call scores — always shown */}
                    <div className="space-y-3">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted opacity-60">Transcript</p>
                        <ScoreRow label="MEDDIC" value={s.meddic} delay={0.0} belowAvg={s.meddic < avg} />
                        <ScoreRow label="Talk Ratio" value={s.talk_ratio_rep} delay={0.1} belowAvg={s.talk_ratio_rep > 65} />
                        <ScoreRow label="Next Steps" value={s.next_steps} delay={0.2} belowAvg={s.next_steps < avg} />
                        <ScoreRow label="Objection H." value={s.objection} delay={0.3} belowAvg={s.objection < avg} />
                    </div>

                    <div className="space-y-3">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted opacity-60">Audio</p>
                        <ScoreRow label="Pace" value={s.pace} delay={0.4} belowAvg={s.pace < avg} />
                        <ScoreRow label="Energy" value={s.energy} delay={0.5} belowAvg={s.energy < avg} />
                        <ScoreRow label="Confidence" value={s.confidence} delay={0.6} belowAvg={s.confidence < avg} />
                    </div>

                    {/* Video scores — meetings only */}
                    {isMeeting && (
                        <div className="space-y-3 relative">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted opacity-60">Video Presence</p>

                            {!isRevIntel && (
                                <div className="absolute inset-0 bg-bg-canvas/70 backdrop-blur-sm flex items-center justify-center z-10">
                                    <div className="flex items-center gap-2 text-xs text-text-muted border border-border px-3 py-2 bg-bg-surface">
                                        <Lock className="w-3.5 h-3.5" />
                                        Revenue Intelligence required
                                    </div>
                                </div>
                            )}

                            {s.eye_contact_pct !== null && (
                                <ScoreRow label="Eye Contact" value={s.eye_contact_pct} delay={0.7} belowAvg={s.eye_contact_pct < avg} />
                            )}
                            {s.posture !== null && (
                                <ScoreRow label="Posture" value={s.posture} delay={0.8} belowAvg={s.posture < avg} />
                            )}
                            {s.presence !== null && (
                                <ScoreRow label="Presence" value={s.presence} delay={0.9} belowAvg={s.presence < avg} />
                            )}
                            {slidesDetected && s.slide_alignment !== null && (
                                <ScoreRow label="Slide Align" value={s.slide_alignment} delay={1.0} belowAvg={s.slide_alignment < avg} />
                            )}
                        </div>
                    )}

                    {/* Prospect Engagement — consent gated */}
                    {isMeeting && s.prospect_engagement !== null && (
                        <div className="space-y-3 relative">
                            <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted opacity-60">Prospect Engagement</p>
                            {!consentOk && (
                                <div className="absolute inset-0 bg-bg-canvas/80 backdrop-blur-sm flex items-center justify-center z-10 border border-status-warning/20">
                                    <div className="flex items-center gap-2 text-xs text-status-warning px-3 py-2">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Consent not confirmed for prospect analysis
                                    </div>
                                </div>
                            )}
                            <ScoreRow label="Engagement" value={s.prospect_engagement} delay={1.1} belowAvg={false} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Presence Timeline — meetings only ── */}
            {isMeeting && session.presence_timeline.length > 0 && (
                <PresenceTimeline segments={session.presence_timeline} />
            )}

            {/* ── Transcript Panel ── */}
            <div className="card-os p-6">
                <h3 className="text-[10px] uppercase tracking-[0.18em] text-text-muted mb-4">Transcript</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {session.transcript.map((seg, i) => {
                        const sentColor = seg.sentiment > 0.3 ? 'text-status-success' : seg.sentiment < -0.2 ? 'text-status-danger' : 'text-text-primary';
                        return (
                            <div key={i} className={`flex gap-3 ${seg.speaker === 'rep' ? '' : 'flex-row-reverse'}`}>
                                <div className={`w-8 h-8 shrink-0 flex items-center justify-center text-xs border ${
                                    seg.speaker === 'rep'
                                        ? 'bg-accent/10 border-accent/30 text-accent'
                                        : 'bg-bg-raised border-border text-text-secondary'
                                }`}>
                                    {seg.name[0]}
                                </div>
                                <div className={`flex-1 max-w-[80%] ${seg.speaker === 'rep' ? '' : 'items-end flex flex-col'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] uppercase tracking-widest text-text-muted">{seg.name}</span>
                                        <span className="text-[9px] text-text-muted">{formatMs(seg.start_ms)}</span>
                                        {(seg.moments ?? []).map((m, mi) => (
                                            <MomentBadge key={mi} type={m.type as Moment['type']} label={m.label} />
                                        ))}
                                    </div>
                                    <p className={`text-sm leading-relaxed ${sentColor}`}>{seg.text}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── AI Coaching Feedback ── */}
            <div className="card-os p-6 space-y-6">
                <h3 className="text-[10px] uppercase tracking-[0.18em] text-text-muted">AI Coaching Feedback</h3>

                {/* Summary */}
                <p className="text-text-secondary text-sm leading-relaxed border-l-2 border-accent pl-4">
                    {session.ai_feedback.summary}
                </p>

                {/* Strengths */}
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-status-success mb-3 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" /> Strengths
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {session.ai_feedback.strengths.map((s_item, i) => (
                            <div key={i} className="bg-status-success/5 border border-status-success/20 p-4">
                                <p className="text-[9px] text-status-success uppercase tracking-widest mb-2">{s_item.timestamp}</p>
                                <p className="text-xs text-text-secondary leading-relaxed">{s_item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Improvements */}
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-status-warning mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Areas to Improve
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {session.ai_feedback.improvements.map((imp, i) => (
                            <div key={i} className="bg-status-warning/5 border border-status-warning/20 p-4 flex flex-col gap-2">
                                <p className="text-[9px] text-status-warning uppercase tracking-widest">{imp.timestamp}</p>
                                <p className="text-xs text-text-secondary leading-relaxed flex-1">{imp.text}</p>
                                <button className="text-[10px] text-accent flex items-center gap-1 mt-1 hover:underline w-fit">
                                    <BookOpen className="w-3 h-3" /> {imp.drill} drill
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Presence feedback — meetings only */}
                {isMeeting && session.ai_feedback.presence_feedback && (
                    <div className={`relative ${!isRevIntel ? 'overflow-hidden' : ''}`}>
                        {!isRevIntel && (
                            <div className="absolute inset-0 bg-bg-canvas/80 backdrop-blur-sm flex items-center justify-center z-10">
                                <div className="flex items-center gap-2 text-xs text-text-muted border border-border px-3 py-2 bg-bg-surface">
                                    <Lock className="w-3.5 h-3.5" />
                                    Revenue Intelligence required for presence feedback
                                </div>
                            </div>
                        )}
                        <div className="bg-purple-400/5 border border-purple-400/20 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" /> Presence Feedback
                            </p>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                {session.ai_feedback.presence_feedback}
                            </p>
                        </div>
                    </div>
                )}

                {/* Drill recommendations */}
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" /> Recommended Next Drills
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {session.ai_feedback.drill_recommendations.map(drill => (
                            <button
                                key={drill}
                                onClick={() => navigate('/drills')}
                                className="btn-ghost text-xs border border-border px-3 py-1.5 flex items-center gap-1.5"
                            >
                                <TrendingUp className="w-3 h-3 text-accent" /> {drill}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
