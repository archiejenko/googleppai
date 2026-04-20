import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, ChevronUp, ChevronDown, Minimize2, ExternalLink, Loader2, MicOff } from 'lucide-react';
import { useLiveCall } from '../../context/LiveCallContext';
import { useTier } from '../../context/TierContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDeepgramSTT } from '../../hooks/useDeepgramSTT';
import { supabase } from '../../utils/supabase';
import PreCallConsent from '../PreCallConsent';

interface InterimScores {
    talk_ratio_score: number | null;
    engagement_score: number | null;
    question_quality_score: number | null;
    filler_rate_per_min: number | null;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
    const color = value >= 75 ? 'bg-status-success' : value >= 55 ? 'bg-status-warning' : 'bg-status-danger';
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-muted uppercase tracking-widest">
                <span>{label}</span>
                <span className="text-text-secondary">{Math.round(value)}</span>
            </div>
            <div className="h-1 bg-bg-raised overflow-hidden">
                <motion.div
                    className={`h-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, value)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}

function ScoreRing({ score }: { score: number }) {
    const r = 28;
    const circumference = 2 * Math.PI * r;
    const dash = (score / 100) * circumference;
    const color = score >= 75 ? '#22c55e' : score >= 55 ? '#fbbf24' : '#ef4444';

    return (
        <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--bg-raised))" strokeWidth="5" />
                <motion.circle
                    cx="32" cy="32" r={r}
                    fill="none" stroke={color} strokeWidth="5"
                    strokeLinecap="butt"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - dash }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg text-text-primary leading-none">{Math.round(score)}</span>
                <span className="text-[8px] text-text-muted uppercase tracking-widest">score</span>
            </div>
        </div>
    );
}

function SignalTag({ label, active }: { label: string; active: boolean }) {
    if (!active) return null;
    return (
        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 border border-accent/30 bg-accent/10 text-accent">
            {label}
        </span>
    );
}

function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function FillerRateIndicator({ rate }: { rate: number }) {
    const color = rate <= 2 ? 'text-status-success' : rate <= 5 ? 'text-status-warning' : 'text-status-danger';
    return (
        <div className="flex justify-between text-[10px] text-text-muted uppercase tracking-widest">
            <span>Filler Rate</span>
            <span className={`font-mono ${color}`}>{rate.toFixed(1)}/min</span>
        </div>
    );
}

export default function OastLiveWidget() {
    const { activeCall, endCall, activateSession, abandonSession, pushTranscriptChunk } = useLiveCall();
    const { isRevIntel } = useTier();
    const { session } = useAuth();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [elapsedSecs, setElapsedSecs] = useState(0);
    const [processingFinal, setProcessingFinal] = useState(false);
    const [interimScores, setInterimScores] = useState<InterimScores | null>(null);
    const [confirmingWithdrawal, setConfirmingWithdrawal] = useState(false);
    const [recordingStopped, setRecordingStopped] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const realtimeScoreAtRef = useRef<number>(0);

    const onFinalTranscript = useCallback((text: string) => {
        pushTranscriptChunk(text);
    }, [pushTranscriptChunk]);

    const onInterimTranscript = useCallback((_text: string) => {
        // Interim display handled by the 30s auto-scoring interval in LiveCallContext
    }, []);

    const { start: startSTT, stop: stopSTT } = useDeepgramSTT({
        authToken: session?.access_token,
        consentConfirmed: activeCall?.consentConfirmed ?? false,
        onFinalTranscript,
        onInterimTranscript,
        onError: (err) => console.error('[OastLiveWidget] Deepgram error:', err),
    });

    // Start/stop Deepgram STT — only after consent confirmed and session active
    useEffect(() => {
        if (activeCall && !activeCall.ended && activeCall.status === 'active' && activeCall.consentConfirmed) {
            startSTT();
        }
        return () => { stopSTT(); };
    }, [activeCall?.callId, activeCall?.ended, activeCall?.status, activeCall?.consentConfirmed, startSTT, stopSTT]);

    // Update interim scores from the 30s snapshot response (fallback)
    useEffect(() => {
        if (!activeCall?.latestSnapshot) return;
        // Don't override a more recent Realtime push
        if (realtimeScoreAtRef.current > Date.now() - 5_000) return;
        const snap = activeCall.latestSnapshot;
        setInterimScores({
            talk_ratio_score: snap.talk_ratio_score,
            engagement_score: snap.engagement_score,
            question_quality_score: snap.objection_handling_score,
            filler_rate_per_min: null,
        });
    }, [activeCall?.latestSnapshot]);

    // Subscribe to Realtime broadcast for immediate interim score updates
    useEffect(() => {
        if (!activeCall?.callId || activeCall.ended) return;

        const channel = supabase.channel('live-scores-widget')
            .on('broadcast', { event: 'score.snapshot' }, ({ payload }) => {
                if (payload.session_id !== activeCall.callId) return;
                realtimeScoreAtRef.current = Date.now();
                setInterimScores({
                    talk_ratio_score: payload.talk_ratio_score,
                    engagement_score: payload.engagement_score,
                    question_quality_score: payload.question_quality_score,
                    filler_rate_per_min: payload.filler_rate_per_min,
                });
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [activeCall?.callId, activeCall?.ended]);

    useEffect(() => {
        if (!activeCall) { setElapsedSecs(0); return; }
        timerRef.current = setInterval(() => {
            setElapsedSecs(Math.round((Date.now() - activeCall.startedAt.getTime()) / 1000));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeCall?.callId]);

    useEffect(() => {
        if (activeCall?.qualified) setExpanded(true);
    }, [activeCall?.qualified]);

    const handleEndCall = async () => {
        setProcessingFinal(true);
        await endCall();
    };

    const handleWithdrawConsent = async () => {
        if (!activeCall) return;
        stopSTT();
        // Route withdrawal through telephony-webhook (service role) since
        // call_consent_log has no authenticated UPDATE policy by design.
        const token = session?.access_token;
        if (token) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telephony-webhook/withdraw-consent`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: activeCall.callId }),
            }).catch(() => {});
        }
        await endCall();
        setRecordingStopped(true);
        setConfirmingWithdrawal(false);
    };

    // Reset processing state when call ends
    useEffect(() => {
        if (activeCall?.ended) {
            setProcessingFinal(false);
        }
    }, [activeCall?.ended]);

    if (!isRevIntel || !activeCall) return null;

    // Show consent modal when session is pending consent
    if (activeCall.status === 'pending_consent') {
        return (
            <PreCallConsent
                sessionId={activeCall.callId}
                orgId={activeCall.orgId ?? ''}
                onConsentGiven={activateSession}
                onConsentDeclined={abandonSession}
            />
        );
    }

    const snap = activeCall.latestSnapshot;
    const latestNudges = snap?.coaching_nudges?.slice(-3) ?? [];
    const signals = snap?.signals;

    const displayScores = snap ? {
        talk_ratio: snap.talk_ratio_score,
        discovery: snap.discovery_score,
        engagement: snap.engagement_score,
        objections: snap.objection_handling_score,
    } : interimScores ? {
        talk_ratio: interimScores.talk_ratio_score ?? 0,
        discovery: 0,
        engagement: interimScores.engagement_score ?? 0,
        objections: interimScores.question_quality_score ?? 0,
    } : null;

    return (
        <AnimatePresence>
            <motion.div
                key="live-widget"
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                drag
                dragMomentum={false}
                className="fixed bottom-6 right-6 z-[9000] select-none"
                style={{ width: expanded ? 320 : 'auto' }}
            >
                {!expanded && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="flex items-center gap-3 bg-bg-surface border border-border px-4 py-2.5 shadow-brutal shadow-accent/30 hover:border-accent/50 transition-colors"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full bg-accent opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 bg-accent" />
                        </span>
                        <span className="text-xs text-text-secondary">
                            {activeCall.prospectName || 'Live Call'} · {formatTime(elapsedSecs)}
                        </span>
                        {snap && (
                            <span className="text-xs text-accent font-mono">{Math.round(snap.overall_score)}</span>
                        )}
                        <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
                    </button>
                )}

                {expanded && (
                    <div className="bg-bg-surface border border-border shadow-brutal shadow-accent/20 flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full bg-accent opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 bg-accent" />
                                </span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">OAST Live</span>
                            </div>
                            <button onClick={() => setExpanded(false)} className="text-text-muted hover:text-text-secondary">
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary truncate">
                                        {activeCall.prospectName || 'Prospect'}
                                    </p>
                                    <p className="text-xs text-text-muted truncate">
                                        {activeCall.companyName || 'Company'}
                                    </p>
                                    <p className="text-xs text-text-muted mt-0.5 font-mono">{formatTime(elapsedSecs)}</p>
                                </div>
                                {snap ? <ScoreRing score={snap.overall_score} /> : (
                                    <div className="w-20 h-20 flex items-center justify-center text-text-muted text-[10px] uppercase tracking-widest">
                                        {activeCall.qualified ? 'Scoring...' : 'Listening...'}
                                    </div>
                                )}
                            </div>

                            {displayScores && (
                                <div className="space-y-2">
                                    <ScoreBar label="Talk Ratio" value={displayScores.talk_ratio} />
                                    <ScoreBar label="Discovery" value={displayScores.discovery} />
                                    <ScoreBar label="Engagement" value={displayScores.engagement} />
                                    <ScoreBar label="Objections" value={displayScores.objections} />
                                </div>
                            )}

                            {interimScores?.filler_rate_per_min != null && (
                                <FillerRateIndicator rate={interimScores.filler_rate_per_min} />
                            )}

                            {signals && (
                                <div className="flex flex-wrap gap-1">
                                    <SignalTag label="Budget" active={signals.budget} />
                                    <SignalTag label="Timeline" active={signals.timeline} />
                                    <SignalTag label="Pain" active={signals.pain} />
                                    <SignalTag label="Buying" active={signals.buying} />
                                    <SignalTag label="Competitor" active={signals.competitor} />
                                </div>
                            )}

                            {latestNudges.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[9px] uppercase tracking-[0.2em] text-text-muted">Coaching</p>
                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {[...latestNudges].reverse().map((n, i) => (
                                            <div key={i} className="text-[11px] text-text-secondary leading-relaxed border-l-2 border-accent/40 pl-2">
                                                {n.nudge}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {processingFinal && !activeCall.ended && (
                                <div className="text-center py-2 flex items-center justify-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                                    <p className="text-xs text-text-muted">Processing final scores</p>
                                </div>
                            )}

                            {recordingStopped && (
                                <div className="text-center py-2">
                                    <p className="text-xs text-status-warning">Recording stopped. No further audio is being captured.</p>
                                </div>
                            )}

                            {activeCall.ended && !recordingStopped && (
                                <div className="text-center py-2">
                                    <p className="text-xs text-status-success">Call complete, score committed</p>
                                </div>
                            )}

                            {confirmingWithdrawal && (
                                <div className="border border-status-danger/30 p-3 space-y-2">
                                    <p className="text-xs text-text-secondary">Are you sure you want to stop recording? Your session will end and no further audio will be captured.</p>
                                    <div className="flex gap-2">
                                        <button onClick={handleWithdrawConsent} className="text-[10px] uppercase tracking-widest text-status-danger hover:bg-status-danger/10 px-3 py-1 border border-status-danger/30">Confirm</button>
                                        <button onClick={() => setConfirmingWithdrawal(false)} className="text-[10px] uppercase tracking-widest text-text-muted hover:text-text-secondary px-3 py-1 border border-border">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 gap-2">
                            <button
                                onClick={() => setExpanded(false)}
                                className="text-[10px] text-text-muted uppercase tracking-widest hover:text-text-secondary transition-colors"
                            >
                                <Minimize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => navigate('/live-scores')}
                                className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-widest hover:text-accent transition-colors"
                            >
                                Full analysis <ExternalLink className="w-3 h-3" />
                            </button>
                            {!activeCall.ended && !recordingStopped && (
                                <button
                                    onClick={() => setConfirmingWithdrawal(true)}
                                    className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-text-muted hover:text-status-warning px-2 py-1.5 transition-colors"
                                    title="Stop Recording"
                                >
                                    <MicOff className="w-3 h-3" />
                                </button>
                            )}
                            {!activeCall.ended && (
                                <button
                                    onClick={handleEndCall}
                                    disabled={processingFinal}
                                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-status-danger hover:bg-status-danger/10 px-3 py-1.5 border border-status-danger/30 transition-colors disabled:opacity-50"
                                >
                                    {processingFinal ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <PhoneOff className="w-3 h-3" />
                                    )}
                                    {processingFinal ? 'Ending...' : 'End'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

export function StartLiveSessionButton({ prospectName: defaultProspect, companyName: defaultCompany, crmContactId }: {
    prospectName?: string;
    companyName?: string;
    crmContactId?: string;
}) {
    const { startCall, activeCall, isLoading } = useLiveCall();
    const { isRevIntel } = useTier();
    const [showModal, setShowModal] = useState(false);
    const [prospect, setProspect] = useState(defaultProspect ?? '');
    const [company, setCompany] = useState(defaultCompany ?? '');

    if (!isRevIntel) return null;
    if (activeCall) return null;

    const handleStart = () => {
        startCall({ prospectName: prospect || undefined, companyName: company || undefined, crmContactId });
        setShowModal(false);
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                disabled={isLoading}
                className="flex items-center gap-2 btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
            >
                <Phone className="w-3.5 h-3.5" />
                Start Live Session
            </button>

            {showModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
                    <div className="bg-bg-surface border border-border shadow-brutal p-6 max-w-sm w-full mx-4 space-y-4">
                        <h2 className="text-sm uppercase tracking-[0.2em] text-text-primary">New Session</h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Prospect Name</label>
                                <input
                                    type="text"
                                    value={prospect}
                                    onChange={e => setProspect(e.target.value)}
                                    placeholder="Optional"
                                    className="w-full bg-bg-raised border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">Company</label>
                                <input
                                    type="text"
                                    value={company}
                                    onChange={e => setCompany(e.target.value)}
                                    placeholder="Optional"
                                    className="w-full bg-bg-raised border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <button
                                onClick={handleStart}
                                disabled={isLoading}
                                className="btn-primary flex-1 py-2 text-xs uppercase tracking-widest disabled:opacity-50"
                            >
                                {isLoading ? 'Starting...' : 'Start Session'}
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn-ghost flex-1 py-2 text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
