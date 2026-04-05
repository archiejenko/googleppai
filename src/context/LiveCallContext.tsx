import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';
import { useAudioQueue } from '../hooks/useAudioQueue';

const MAX_CALL_DURATION_MINUTES = 120;
// Keep-warm: ping the hot-path Edge Functions every 20s during an active call
// to prevent Deno cold starts between user turns.
const KEEPWARM_INTERVAL_MS = 20_000;
const SUPABASE_FUNCTIONS_URL_INTERNAL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface ScoreSnapshot {
    t: number;
    overall_score: number;
    talk_ratio_score: number;
    discovery_score: number;
    engagement_score: number;
    objection_handling_score: number;
    sentiment_points: { t: number; sentiment: number }[];
    signals: { budget: boolean; timeline: boolean; pain: boolean; buying: boolean; competitor: boolean };
    coaching_nudges: { t: number; nudge: string; category: string }[];
    competitor_mentions: { name: string; t: number }[];
    objections: { t: number; text: string; handled: boolean }[];
}

interface ActiveCall {
    callId: string;
    startedAt: Date;
    prospectName?: string;
    companyName?: string;
    qualified: boolean;
    snapshots: ScoreSnapshot[];
    latestSnapshot: ScoreSnapshot | null;
    ended: boolean;
}

interface LiveCallContextType {
    activeCall: ActiveCall | null;
    startCall: (opts: { prospectName?: string; companyName?: string; crmContactId?: string }) => Promise<string>;
    endCall: () => Promise<void>;
    submitTextSnapshot: (text: string) => Promise<void>;
    pushTranscriptChunk: (text: string) => void;
    isLoading: boolean;
    // Audio queue — pre-warmed at call start; use enqueueAudio in TTS callbacks
    enqueueAudio: (arrayBuffer: ArrayBuffer) => Promise<void>;
    flushAudio: () => void;
}

const LiveCallContext = createContext<LiveCallContextType | null>(null);

export const LiveCallProvider = ({ children }: { children: ReactNode }) => {
    const { session } = useAuth();
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const transcriptBufferRef = useRef<string>('');
    const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const keepWarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { initContext: initAudioContext, enqueue: enqueueAudio, flush: flushAudio } = useAudioQueue();

    // Subscribe to Supabase Realtime channel for the active call
    useEffect(() => {
        if (!activeCall?.callId) return;

        const channel = supabase.channel(`live:${activeCall.callId}`)
            .on('broadcast', { event: 'score.snapshot' }, ({ payload }) => {
                const snap: ScoreSnapshot = payload.snapshot;
                setActiveCall(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        snapshots: [...prev.snapshots, snap],
                        latestSnapshot: snap,
                    };
                });
            })
            .on('broadcast', { event: 'call.qualified' }, () => {
                setActiveCall(prev => prev ? { ...prev, qualified: true } : prev);
            })
            .on('broadcast', { event: 'live_score.committed' }, () => {
                setActiveCall(prev => prev ? { ...prev, ended: true } : prev);
                // Auto-dismiss after 5s
                setTimeout(() => setActiveCall(null), 5000);
            })
            .subscribe();

        channelRef.current = channel;
        return () => { channel.unsubscribe(); };
    }, [activeCall?.callId]);

    // Keep-warm: ping hot-path Edge Functions every 20s to prevent Deno cold starts.
    // The x-keepwarm header causes unified-ai and tts-generate to return 200 immediately
    // without executing any AI logic.
    useEffect(() => {
        if (!activeCall?.callId || activeCall.ended) return;
        const token = session?.access_token;
        if (!token) return;

        keepWarmIntervalRef.current = setInterval(() => {
            fetch(`${SUPABASE_FUNCTIONS_URL_INTERNAL}/unified-ai`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'x-keepwarm': 'true' },
            }).catch(() => {/* non-critical — ignore errors */})
        }, KEEPWARM_INTERVAL_MS);

        return () => {
            if (keepWarmIntervalRef.current) clearInterval(keepWarmIntervalRef.current);
        };
    }, [activeCall?.callId, activeCall?.ended, session?.access_token]);

    // 30-second auto-scoring interval — flushes buffered transcript
    useEffect(() => {
        if (!activeCall?.callId || activeCall.ended) return;

        autoIntervalRef.current = setInterval(async () => {
            const durationSecs = Math.round((Date.now() - activeCall.startedAt.getTime()) / 1000);

            // Auto-terminate calls that exceed the maximum duration to prevent runaway AI costs
            if (durationSecs >= MAX_CALL_DURATION_MINUTES * 60) {
                toast.warning(`Call auto-ended after ${MAX_CALL_DURATION_MINUTES} minutes.`);
                endCall();
                return;
            }

            const text = transcriptBufferRef.current.trim();
            if (!text) return;
            transcriptBufferRef.current = '';
            const token = session?.access_token;
            if (!token) return;
            try {
                await fetch(`${SUPABASE_FUNCTIONS_URL_INTERNAL}/live-scoring/snapshot`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        call_id: activeCall.callId,
                        transcript_text: text,
                        duration_secs: durationSecs,
                        prospect_name: activeCall.prospectName,
                        company_name: activeCall.companyName,
                    }),
                });
            } catch (err) {
                console.error('[LiveCallContext] auto-snapshot error:', err);
            }
        }, 30_000);

        return () => {
            if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCall?.callId, activeCall?.ended]);

    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

    const startCall = async (opts: { prospectName?: string; companyName?: string; crmContactId?: string }) => {
        if (!authHeader) throw new Error('Not authenticated');
        setIsLoading(true);
        // Initialise AudioContext here — this is a user-gesture handler so browsers will allow it.
        // Initialising at call start (rather than on first TTS chunk) eliminates the ~100ms
        // AudioContext-creation + resume latency from the first audio playback.
        initAudioContext();
        try {
            const res = await fetch(`${SUPABASE_FUNCTIONS_URL_INTERNAL}/telephony-webhook/manual-start`, {
                method: 'POST',
                headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    crm_contact_id: opts.crmContactId,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start call');

            const callId: string = data.call_id;
            setActiveCall({
                callId,
                startedAt: new Date(),
                prospectName: opts.prospectName,
                companyName: opts.companyName,
                qualified: false,
                snapshots: [],
                latestSnapshot: null,
                ended: false,
            });
            return callId;
        } finally {
            setIsLoading(false);
        }
    };

    const endCall = async () => {
        if (!activeCall || !authHeader) return;
        try {
            const durationSecs = Math.round((Date.now() - activeCall.startedAt.getTime()) / 1000);
            await fetch(`${SUPABASE_FUNCTIONS_URL_INTERNAL}/telephony-webhook/manual-end`, {
                method: 'POST',
                headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ call_id: activeCall.callId, duration_secs: durationSecs }),
            });
        } catch (err) {
            console.error('[LiveCallContext] endCall error:', err);
        }
    };

    const pushTranscriptChunk = (text: string) => {
        transcriptBufferRef.current += (transcriptBufferRef.current ? ' ' : '') + text;
    };

    const submitTextSnapshot = async (text: string) => {
        if (!activeCall || !authHeader) return;
        const durationSecs = Math.round((Date.now() - activeCall.startedAt.getTime()) / 1000);
        await fetch(`${SUPABASE_FUNCTIONS_URL_INTERNAL}/live-scoring/snapshot`, {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                call_id: activeCall.callId,
                transcript_text: text,
                duration_secs: durationSecs,
                prospect_name: activeCall.prospectName,
                company_name: activeCall.companyName,
            }),
        });
    };

    return (
        <LiveCallContext.Provider value={{ activeCall, startCall, endCall, submitTextSnapshot, pushTranscriptChunk, isLoading, enqueueAudio, flushAudio }}>
            {children}
        </LiveCallContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLiveCall = () => {
    const ctx = useContext(LiveCallContext);
    if (!ctx) throw new Error('useLiveCall must be used within a LiveCallProvider');
    return ctx;
};
