import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, ChevronUp, ChevronDown, Minimize2, ExternalLink } from 'lucide-react';
import { useLiveCall } from '../../context/LiveCallContext';
import { useTier } from '../../context/TierContext';
import { useNavigate } from 'react-router-dom';

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

/** Formats seconds as mm:ss */
function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function OastLiveWidget() {
    const { activeCall, endCall } = useLiveCall();
    const { isRevIntel } = useTier();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [elapsedSecs, setElapsedSecs] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!activeCall) { setElapsedSecs(0); return; }
        timerRef.current = setInterval(() => {
            setElapsedSecs(Math.round((Date.now() - activeCall.startedAt.getTime()) / 1000));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeCall?.callId]);

    // Expand automatically when call qualifies
    useEffect(() => {
        if (activeCall?.qualified) setExpanded(true);
    }, [activeCall?.qualified]);

    if (!isRevIntel || !activeCall) return null;

    const snap = activeCall.latestSnapshot;
    const latestNudges = snap?.coaching_nudges?.slice(-3) ?? [];
    const signals = snap?.signals;

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
                {/* ── Collapsed Pill ── */}
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

                {/* ── Expanded Panel ── */}
                {expanded && (
                    <div className="bg-bg-surface border border-border shadow-brutal shadow-accent/20 flex flex-col">
                        {/* Header */}
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
                            {/* Prospect + Timer */}
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
                                        {activeCall.qualified ? 'Scoring…' : 'Waiting…'}
                                    </div>
                                )}
                            </div>

                            {/* Score Bars */}
                            {snap && (
                                <div className="space-y-2">
                                    <ScoreBar label="Talk Ratio" value={snap.talk_ratio_score} />
                                    <ScoreBar label="Discovery" value={snap.discovery_score} />
                                    <ScoreBar label="Engagement" value={snap.engagement_score} />
                                    <ScoreBar label="Objections" value={snap.objection_handling_score} />
                                </div>
                            )}

                            {/* Signal Tags */}
                            {signals && (
                                <div className="flex flex-wrap gap-1">
                                    <SignalTag label="Budget" active={signals.budget} />
                                    <SignalTag label="Timeline" active={signals.timeline} />
                                    <SignalTag label="Pain" active={signals.pain} />
                                    <SignalTag label="Buying" active={signals.buying} />
                                    <SignalTag label="Competitor" active={signals.competitor} />
                                </div>
                            )}

                            {/* Coaching Feed */}
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

                            {/* Ended state */}
                            {activeCall.ended && (
                                <div className="text-center py-2">
                                    <p className="text-xs text-status-success">Call complete — score committed</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
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
                            <button
                                onClick={endCall}
                                className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-status-danger hover:bg-status-danger/10 px-3 py-1.5 border border-status-danger/30 transition-colors"
                            >
                                <PhoneOff className="w-3 h-3" /> End
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

/** Start Live Session button — place anywhere in the app */
export function StartLiveSessionButton({ prospectName, companyName, crmContactId }: {
    prospectName?: string;
    companyName?: string;
    crmContactId?: string;
}) {
    const { startCall, activeCall, isLoading } = useLiveCall();
    const { isRevIntel } = useTier();

    if (!isRevIntel) return null;
    if (activeCall) return null;

    return (
        <button
            onClick={() => startCall({ prospectName, companyName, crmContactId })}
            disabled={isLoading}
            className="flex items-center gap-2 btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
        >
            <Phone className="w-3.5 h-3.5" />
            {isLoading ? 'Starting…' : 'Start Live Session'}
        </button>
    );
}
