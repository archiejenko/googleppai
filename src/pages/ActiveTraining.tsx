import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { posthog, isPostHogEnabled } from '../lib/posthog';

// Simulation sub-components
import SimulationTopBar from '../components/training/simulation/SimulationTopBar';
import ConversationPanel from '../components/training/simulation/ConversationPanel';
import IntelPanel from '../components/training/simulation/IntelPanel';
import IntelDrawer from '../components/training/simulation/IntelDrawer';
import EndSimulationBar from '../components/training/simulation/EndSimulationBar';
import PostCallScorecard from '../components/training/simulation/PostCallScorecard';
import BattleCard from '../components/training/BattleCard';
import type { TrackedObjection } from '../components/training/simulation/ObjectionTracker';

// ── Timing constants ─────────────────────────────────────────────────────────
const SILENCE_TIMEOUT_MS  = 2200;
const STREAM_CHAR_SPEED_MS = 25;
const TIMER_TICK_MS        = 1000;

const hasSpeechRecognition = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
    role: 'user' | 'ai';
    text: string;
    speaker?: string;
    emotion?: string;
    pill_tag?: string;
    coachingNote?: string;
    timestamp: Date;
}

interface UserSkill {
    skill_id: string;
    current_score: number;
    difficulty_tier: string;
}

interface DrillHighlight {
    id: string;
    title: string;
    score: number;
    completed_at: string;
}

interface SessionData {
    id: string;
    scenario: string | null;
    difficulty: string | null;
    pitch_goal: string | null;
    industry_id: string | null;
    persona_id: string | null;
    persona_category: string | null;
    methodology: string | null;
    conversation_history: unknown[];
    session_state: Record<string, unknown> | null;
}

interface LiveMetrics {
    user_pace_check: string;
    confidence_level: number;
    current_objection_state: string;
}

interface UnifiedAiResponse {
    buyer_response: string;
    evaluation: {
        confidence: number;
        clarity: number;
        objection_handling: number;
        rapport: number;
        overall_score: number;
    };
    coaching_feedback: string;
    missed_opportunities: string[];
    strengths: string[];
    next_objection_type: string;
    updated_state: {
        objection_stage: string;
        buyer_temperature: number;
        closing_probability: number;
    };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ActiveTraining() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');

    // ── Session & conversation state (unchanged) ───────────────────────────
    const [sessionData, setSessionData]         = useState<SessionData | null>(null);
    const [isListening, setIsListening]         = useState(false);
    const [transcript, setTranscript]           = useState('');
    const [messages, setMessages]               = useState<Message[]>([]);
    const [isProcessing, setIsProcessing]       = useState(false);
    const [isSpeaking, setIsSpeaking]           = useState(false);
    const [duration, setDuration]               = useState(0);
    const [methodologyProgress, setMethodologyProgress] = useState<Record<string, number>>({});
    const [, setUserSkills]           = useState<UserSkill[]>([]);
    const [, setRecentDrills]       = useState<DrillHighlight[]>([]);
    const [fetchError, setFetchError]           = useState<string | null>(null);
    const [playbookObjections, setPlaybookObjections] = useState<Record<string, string>>({});
    const [loading, setLoading]                 = useState(true);
    const [isMuted, setIsMuted]                 = useState(false);
    const [isPaused, setIsPaused]               = useState(false);
    const [voiceGender, setVoiceGender]         = useState<'male' | 'female'>('male');
    const [liveMetrics, setLiveMetrics]         = useState<LiveMetrics | null>(null);
    const [savedNoteIndices, setSavedNoteIndices] = useState<Set<number>>(new Set());
    const [textInputValue, setTextInputValue]   = useState('');
    const [streamingText, setStreamingText]     = useState('');
    const [silenceProgress, setSilenceProgress] = useState<number | null>(null);

    // ── New UI state ────────────────────────────────────────────────────────
    const [intelDrawerOpen, setIntelDrawerOpen] = useState(false);
    const [trackedObjections, setTrackedObjections] = useState<TrackedObjection[]>([]);
    const [overallScore, setOverallScore]       = useState(70);
    const [prevScore, setPrevScore]             = useState(70);
    const [showScorecard, setShowScorecard]     = useState(false);
    const [finalPitchId, setFinalPitchId]       = useState<string | undefined>();

    // ── Refs (unchanged) ────────────────────────────────────────────────────
    const recognitionRef        = useRef<SpeechRecognition | null>(null);
    const isListeningRef        = useRef(false);
    const isPausedRef           = useRef(false);
    const silenceTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transcriptRef         = useRef('');
    const handleSendRef         = useRef<() => void>(() => {});
    const resetSilenceTimerRef  = useRef<() => void>(() => {});
    const messagesRef           = useRef<Message[]>([]);
    const sessionEndedRef       = useRef(false);
    const mediaRecorderRef      = useRef<MediaRecorder | null>(null);
    const audioChunksRef        = useRef<Blob[]>([]);
    const [, setIsRecordingAudio] = useState(false);
    const streamingIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const silenceProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionStartTimeRef   = useRef<number | null>(null);
    const totalUserWordsRef     = useRef(0);
    const activeTtsRef          = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);

    // ── Ref syncs (unchanged) ───────────────────────────────────────────────
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { handleSendRef.current = handleSend; });
    useEffect(() => { resetSilenceTimerRef.current = resetSilenceTimer; });

    // ── Redirect if no sessionId ────────────────────────────────────────────
    useEffect(() => {
        if (!sessionId) navigate('/training', { replace: true });
    }, [sessionId, navigate]);

    // ── Auto-save on unmount ────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (!sessionEndedRef.current && messagesRef.current.length > 1 && sessionId) {
                supabase.functions.invoke('training-api', {
                    body: {
                        action: 'complete',
                        sessionId,
                        messages: messagesRef.current.map(m => ({ role: m.role, text: m.text })),
                    },
                });
            }
        };
    }, [sessionId]);

    // ── Timer (unchanged) ───────────────────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => {
            if (!isPaused) setDuration(prev => prev + 1);
        }, TIMER_TICK_MS);
        return () => clearInterval(timer);
    }, [isPaused]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ── Initial data load (unchanged) ───────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: skills } = await supabase.from('user_skills').select('*').eq('user_id', user.id);
                if (skills) setUserSkills(skills);

                const { data: pitches } = await supabase
                    .from('pitches')
                    .select('id, score, created_at, training_sessions(scenario)')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(3);
                if (pitches) {
                    setRecentDrills(pitches.map(p => ({
                        id: p.id,
                        title: (p.training_sessions as { scenario: string | null }[] | null)?.[0]?.scenario || 'Practice',
                        score: p.score,
                        completed_at: p.created_at,
                    })));
                }

                if (sessionId) {
                    const { data: sd, error: sdErr } = await supabase
                        .from('training_sessions')
                        .select('*')
                        .eq('id', sessionId)
                        .maybeSingle();

                    if (sdErr) { console.error('[ActiveTraining] DB error:', sdErr); setFetchError(sdErr.message); }

                    if (sd) {
                        setSessionData(sd);
                        setFetchError(null);

                        const { data: profile } = await supabase
                            .from('profiles').select('team_id').eq('id', user.id).single();

                        if (profile?.team_id) {
                            const { data: pb } = await supabase
                                .from('playbooks')
                                .select('objection_responses')
                                .eq('organization_id', profile.team_id)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            if (pb) setPlaybookObjections(pb.objection_responses || {});
                        }
                    } else {
                        setFetchError('Session not found or access denied.');
                    }
                }
            } catch (err) {
                console.error('Failed to load training data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [sessionId]);

    // ── Initial AI greeting (unchanged) ────────────────────────────────────
    useEffect(() => {
        const triggerGreeting = async () => {
            if (!loading && messages.length === 0 && sessionData && sessionId) {
                setIsProcessing(true);
                try {
                    const { data, error } = await supabase.functions.invoke('unified-ai', {
                        body: { sessionId, message: '__START_SIMULATION__', history: [] },
                    });
                    if (error) throw error;
                    handleAiResponse(data);
                    if (isPostHogEnabled) {
                        posthog.capture('training_session_started', {
                            session_id: sessionId,
                            scenario: sessionData?.scenario,
                            difficulty: sessionData?.difficulty,
                            methodology: sessionData?.methodology,
                        });
                    }
                } catch {
                    handleAiResponse({
                        buyer_response: "Hello? Is someone there?",
                        evaluation: { confidence: 0.8, overall_score: 80, clarity: 0.8, objection_handling: 0.8, rapport: 0.8 },
                        coaching_feedback: '',
                        missed_opportunities: [],
                        strengths: [],
                        next_objection_type: "None",
                        updated_state: { objection_stage: "None", buyer_temperature: 0.5, closing_probability: 0.1 },
                    });
                } finally {
                    setIsProcessing(false);
                }
            }
        };
        triggerGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, messages.length, sessionData, sessionId]);

    // ── Speech recognition init (unchanged — one-time, uses refs) ──────────
    useEffect(() => {
        if (!hasSpeechRecognition) return;
        type SpeechRecognitionCtor = new () => SpeechRecognition;
        const w = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
        const SpeechRecognitionConstructor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
        if (!SpeechRecognitionConstructor) return;
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (isPausedRef.current) return;
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
            }
            if (final) {
                setTranscript(prev => prev + ' ' + final.trim());
                resetSilenceTimerRef.current();
            }
        };

        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            console.error('[SR] error:', e.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            if (isListeningRef.current && !isPausedRef.current) {
                try { recognition.start(); } catch { /* ignore */ }
            }
        };

        recognitionRef.current = recognition;
        return () => { try { recognition.abort(); } catch { /* ignore */ } };
    }, []);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && isListeningRef.current && !isPausedRef.current) {
                try { recognitionRef.current?.start(); } catch { /* ignore */ }
            } else if (document.visibilityState === 'hidden') {
                try { recognitionRef.current?.stop(); } catch { /* ignore */ }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    // ── Silence timer (unchanged) ───────────────────────────────────────────
    const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (silenceProgressIntervalRef.current) clearInterval(silenceProgressIntervalRef.current);
        setSilenceProgress(100);
        const startedAt = Date.now();
        silenceProgressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startedAt;
            const remaining = Math.max(0, 100 - (elapsed / SILENCE_TIMEOUT_MS) * 100);
            setSilenceProgress(remaining);
            if (remaining <= 0 && silenceProgressIntervalRef.current) {
                clearInterval(silenceProgressIntervalRef.current);
                setSilenceProgress(null);
            }
        }, 50);
        silenceTimerRef.current = setTimeout(() => {
            if (silenceProgressIntervalRef.current) clearInterval(silenceProgressIntervalRef.current);
            setSilenceProgress(null);
            if (transcriptRef.current.trim().length > 0) handleSendRef.current();
        }, SILENCE_TIMEOUT_MS);
    };

    const toggleListening = () => isListening ? stopListening() : startListening();

    const startListening = () => {
        if (isPaused) setIsPaused(false);
        setIsListening(true);
        try { recognitionRef.current?.start(); } catch { /* ignore */ }
        if (!mediaRecorderRef.current && typeof MediaRecorder !== 'undefined') {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const mr = new MediaRecorder(stream);
                mediaRecorderRef.current = mr;
                audioChunksRef.current = [];
                mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
                mr.start(1000);
                setIsRecordingAudio(true);
            }).catch(() => { /* mic denied — silent skip */ });
        }
    };

    const stopListening = () => {
        setIsListening(false);
        recognitionRef.current?.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    // ── handleSend (unchanged logic) ────────────────────────────────────────
    const handleSend = async () => {
        const text = (transcript || textInputValue).trim();
        if (!text) return;

        const wordCount = text.split(/\s+/).filter(Boolean).length;
        totalUserWordsRef.current += wordCount;
        if (!sessionStartTimeRef.current) sessionStartTimeRef.current = Date.now();
        const elapsedMinutes = (Date.now() - sessionStartTimeRef.current) / 60000;
        const wpm = elapsedMinutes > 0.05 ? Math.round(totalUserWordsRef.current / elapsedMinutes) : 0;
        const computedPace = wpm > 0 ? (wpm < 110 ? 'Too Slow' : wpm > 170 ? 'Too Fast' : 'Optimal') : 'Optimal';

        setTranscript('');
        setTextInputValue('');
        if (silenceProgressIntervalRef.current) clearInterval(silenceProgressIntervalRef.current);
        setSilenceProgress(null);
        stopListening();

        setLiveMetrics(prev => prev ? { ...prev, user_pace_check: computedPace } : null);

        const userMsg: Message = { role: 'user', text, timestamp: new Date() };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);
        setIsProcessing(true);

        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) throw new Error('Session expired.');

            const { data, error } = await supabase.functions.invoke('unified-ai', {
                body: { sessionId, message: text },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            handleAiResponse(data);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'unknown error';
            console.error('[ActiveTraining] Chat Error:', err);
            handleAiResponse({
                buyer_response: `Connection issue: ${errMsg}.`,
                evaluation: { confidence: 0.5, clarity: 0.5, objection_handling: 0.5, rapport: 0.5, overall_score: 50 },
                coaching_feedback: "Error connecting to AI engine.",
                missed_opportunities: [],
                strengths: [],
                next_objection_type: "None",
                updated_state: { objection_stage: "None", buyer_temperature: 0.5, closing_probability: 0.1 },
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveMemory = async (text: string, msgIdx: number) => {
        try {
            await supabase.functions.invoke('coach-memory-save', {
                body: { memory_text: text, memory_type: 'fact', source_session_id: sessionId ?? undefined },
            });
            setSavedNoteIndices(prev => new Set(prev).add(msgIdx));
        } catch { /* non-critical */ }
    };

    // ── handleAiResponse (unchanged logic + objection tracking) ────────────
    const handleAiResponse = (data: UnifiedAiResponse | string) => {
        let text: string;
        let emotion = "Neutral";
        let analytics: LiveMetrics;

        if (typeof data === 'string') {
            text = data;
            analytics = { user_pace_check: "Optimal", confidence_level: 0.8, current_objection_state: "None" };
        } else {
            text = data.buyer_response || "...";
            analytics = {
                user_pace_check: "Optimal",
                confidence_level: data.evaluation?.confidence || 0.8,
                current_objection_state: data.next_objection_type || "None",
            };
            if (data.updated_state?.buyer_temperature > 0.8) emotion = "Interested";
            else if (data.updated_state?.buyer_temperature < 0.3) emotion = "Skeptical";
        }

        if (typeof data !== 'string') {
            const newProgress = {
                M: Math.round((data.evaluation?.confidence         || 0) * 100),
                E: Math.round((data.evaluation?.rapport            || 0) * 100),
                D: Math.round((data.evaluation?.clarity            || 0) * 100),
                P: Math.round((data.updated_state?.closing_probability || 0) * 100),
                I: Math.round((data.evaluation?.objection_handling || 0) * 100),
                C: Math.round((data.updated_state?.buyer_temperature   || 0) * 100),
            };
            setMethodologyProgress(newProgress);

            // Track Transfer Gap delta
            const score = Math.round((data.evaluation?.overall_score || 0) * 100);
            setPrevScore(overallScore);
            setOverallScore(score);

            // Track objections in right rail
            if (data.next_objection_type && data.next_objection_type !== 'None') {
                const quality: TrackedObjection['quality'] =
                    (data.evaluation?.objection_handling || 0) >= 0.75 ? 'green' :
                    (data.evaluation?.objection_handling || 0) >= 0.4  ? 'amber' : 'red';
                setTrackedObjections(prev => {
                    const alreadyTracked = prev.some(o => o.text === data.next_objection_type);
                    if (alreadyTracked) return prev;
                    return [...prev, { text: data.next_objection_type, quality }];
                });
            }
        }

        if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
        const coachingNote = typeof data !== 'string' && data.coaching_feedback ? data.coaching_feedback : undefined;

        let i = 0;
        setStreamingText('');
        streamingIntervalRef.current = setInterval(() => {
            setStreamingText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) {
                if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
                setMessages(prev => [...prev, {
                    role: 'ai', text, speaker: 'Buyer', emotion,
                    timestamp: new Date(),
                    ...(coachingNote ? { coachingNote } : {}),
                }]);
                setStreamingText('');
            }
        }, STREAM_CHAR_SPEED_MS);

        setLiveMetrics(analytics);
        speakText(text, voiceGender);
    };

    // ── TTS (unchanged) ─────────────────────────────────────────────────────
    const speakText = async (text: string, gender: 'male' | 'female' = 'male') => {
        if (isMuted) {
            if (!isPausedRef.current) startListening();
            return;
        }
        if (activeTtsRef.current) {
            activeTtsRef.current.audio.pause();
            URL.revokeObjectURL(activeTtsRef.current.url);
            activeTtsRef.current = null;
        }
        setIsSpeaking(true);
        let doneCalled = false;
        const onDone = () => {
            if (doneCalled) return;
            doneCalled = true;
            setIsSpeaking(false);
            if (!isPausedRef.current) startListening();
        };
        setTimeout(onDone, 20000);
        try {
            const { data, error } = await supabase.functions.invoke('tts-generate', {
                body: { text, voice: gender },
                headers: { Accept: 'audio/mpeg' },
            });
            if (error) throw error;
            if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) throw new Error('TTS non-binary');
            const blob = new Blob([data as BlobPart], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            activeTtsRef.current = { audio, url };
            audio.onended = () => { URL.revokeObjectURL(url); activeTtsRef.current = null; onDone(); };
            audio.onerror = () => { URL.revokeObjectURL(url); activeTtsRef.current = null; onDone(); };
            audio.play().catch(() => onDone());
        } catch {
            if ('speechSynthesis' in window) {
                const u = new SpeechSynthesisUtterance(text);
                u.onend = onDone; u.onerror = onDone;
                window.speechSynthesis.speak(u);
            } else { onDone(); }
        }
    };

    // ── handleEndSession (unchanged + scorecard trigger) ───────────────────
    const handleEndSession = async () => {
        sessionEndedRef.current = true;
        stopListening();
        if (activeTtsRef.current) {
            activeTtsRef.current.audio.pause();
            URL.revokeObjectURL(activeTtsRef.current.url);
            activeTtsRef.current = null;
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        setIsProcessing(true);

        let audioUrl: string | null = null;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            await new Promise<void>(resolve => {
                mediaRecorderRef.current!.onstop = () => resolve();
                mediaRecorderRef.current!.stop();
            });
            setIsRecordingAudio(false);
            if (audioChunksRef.current.length > 0 && sessionId) {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const { data: uploadData } = await supabase.storage
                    .from('recordings')
                    .upload(`sessions/${sessionId}.webm`, blob, { upsert: true, contentType: 'audio/webm' });
                if (uploadData) {
                    const { data: publicUrl } = supabase.storage
                        .from('recordings').getPublicUrl(`sessions/${sessionId}.webm`);
                    audioUrl = publicUrl.publicUrl;
                }
            }
        }

        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) throw new Error('Session expired.');
            const { data, error } = await supabase.functions.invoke('training-api', {
                body: { action: 'complete', sessionId, messages: messages.map(m => ({ role: m.role, text: m.text })), audioUrl },
            });
            if (error) throw error;
            if (isPostHogEnabled) {
                posthog.capture('training_session_completed', {
                    session_id: sessionId, message_count: messages.length, pitch_id: data.pitchId ?? null,
                });
            }
            // Show inline scorecard instead of navigating immediately
            setFinalPitchId(data.pitchId);
            setShowScorecard(true);
        } catch {
            navigate('/dashboard');
        } finally {
            setIsProcessing(false);
        }
    };

    // ── Derived values ───────────────────────────────────────────────────────
    const transferGapDelta = overallScore - prevScore;

    // Persona from session state
    const sessionState = sessionData?.session_state as Record<string, unknown> | null;
    const dealCtx = sessionState?.dealContext as Record<string, string> | null;
    const personaName    = dealCtx?.prospectName  || '';
    const personaTitle   = sessionData?.persona_category || '';
    const personaCompany = dealCtx?.prospectCompany || '';

    // Collect coaching flags for scorecard
    const coachingFlags = messages
        .filter(m => m.role === 'ai' && m.coachingNote)
        .map(m => m.coachingNote!);

    // ── Loading / error states ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="h-screen w-full bg-bg-canvas flex flex-col items-center justify-center text-text-primary"
                 style={{ background: '#0a0a0b' }}>
                <div className="relative">
                    <div className="w-16 h-16 border-2 border-[#2a2a2e] border-t-accent animate-spin" />
                </div>
                <div className="mt-6 text-center">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em]">Initialising</h2>
                    <p className="text-[11px] text-text-muted mt-1 tracking-wide">Loading session data…</p>
                </div>
            </div>
        );
    }

    if (!sessionData) {
        return (
            <div className="h-screen w-full bg-bg-canvas flex flex-col items-center justify-center text-text-primary px-6">
                <div className="max-w-sm w-full p-8 bg-bg-surface border border-[#2a2a2e] text-center">
                    <Info className="text-red-400 w-8 h-8 mx-auto mb-4" />
                    <h2 className="text-lg font-black uppercase tracking-wide mb-2">Session Not Found</h2>
                    <p className="text-sm text-text-muted mb-6">
                        The session ID may be invalid or expired.
                    </p>
                    {fetchError && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono text-left">
                            {fetchError}<br />
                            <span className="opacity-50">ID: {sessionId || 'NONE'}</span>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-3 bg-accent text-white text-xs font-black uppercase tracking-widest"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden text-text-primary"
             style={{ background: '#0a0a0b' }}>

            {/* Post-call scorecard overlay */}
            {showScorecard && (
                <PostCallScorecard
                    meddic={methodologyProgress}
                    overallScore={overallScore}
                    transferGapDelta={transferGapDelta}
                    coachingFlags={coachingFlags}
                    pitchId={finalPitchId}
                    onTrainAgain={() => navigate('/training')}
                />
            )}

            {/* Battle Card overlay */}
            <AnimatePresence>
                {liveMetrics?.current_objection_state && liveMetrics.current_objection_state !== 'None' && (
                    <BattleCard
                        objection={liveMetrics.current_objection_state}
                        response={playbookObjections[liveMetrics.current_objection_state] || "Consult your playbook for the best response."}
                        onDismiss={() => setLiveMetrics(prev => prev ? { ...prev, current_objection_state: 'None' } : null)}
                    />
                )}
            </AnimatePresence>

            {/* Top bar */}
            <SimulationTopBar
                duration={duration}
                formatTime={formatTime}
                personaName={personaName}
                personaTitle={personaTitle}
                personaCompany={personaCompany}
                transferGapScore={overallScore}
                transferGapDelta={transferGapDelta}
                isPaused={isPaused}
            />

            {/* Main content: conversation + intel panel */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left: Conversation */}
                <div className="flex-1 overflow-hidden">
                    <ConversationPanel
                        messages={messages}
                        streamingText={streamingText}
                        transcript={transcript}
                        silenceProgress={silenceProgress}
                        isProcessing={isProcessing}
                        personaName={personaName}
                        personaTitle={personaTitle}
                        personaCompany={personaCompany}
                        savedNoteIndices={savedNoteIndices}
                        onSaveNote={handleSaveMemory}
                        hasSpeechRecognition={hasSpeechRecognition}
                        textInputValue={textInputValue}
                        onTextInput={setTextInputValue}
                        onTextSend={handleSend}
                        isSpeaking={isSpeaking}
                    />
                </div>

                {/* Right: Intel panel (desktop only) */}
                <div className="hidden lg:flex w-64 xl:w-72 shrink-0">
                    <IntelPanel
                        meddic={methodologyProgress}
                        objections={trackedObjections}
                    />
                </div>
            </div>

            {/* Voice controls strip (speech mode) */}
            {hasSpeechRecognition && (
                <div className="shrink-0 flex items-center justify-center gap-3 px-5 py-2 border-t border-[#2a2a2e] bg-bg-surface">
                    {/* Pause/Resume */}
                    <button
                        type="button"
                        onClick={() => setIsPaused(p => !p)}
                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 border transition-colors ${
                            isPaused
                                ? 'border-amber-400/60 text-amber-400'
                                : 'border-[#2a2a2e] text-text-muted hover:border-accent/40'
                        }`}
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>

                    {/* Mic toggle */}
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 border transition-colors ${
                            isListening
                                ? 'border-accent text-accent bg-accent/10'
                                : 'border-[#2a2a2e] text-text-muted hover:border-accent/40'
                        }`}
                    >
                        {isListening ? 'Listening…' : 'Speak'}
                    </button>

                    {/* Mute TTS */}
                    <button
                        type="button"
                        onClick={() => setIsMuted(m => !m)}
                        className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 border transition-colors ${
                            isMuted
                                ? 'border-[#2a2a2e] text-text-muted/40'
                                : 'border-[#2a2a2e] text-text-muted hover:border-accent/40'
                        }`}
                    >
                        {isMuted ? 'Unmute AI' : 'Mute AI'}
                    </button>

                    {/* Voice gender */}
                    <div className="flex border border-[#2a2a2e]">
                        {(['male', 'female'] as const).map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setVoiceGender(g)}
                                className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-colors ${
                                    voiceGender === g
                                        ? 'bg-accent/20 text-accent'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom bar */}
            <EndSimulationBar
                onEnd={handleEndSession}
                isProcessing={isProcessing}
                showIntelToggle={true}
                onIntelToggle={() => setIntelDrawerOpen(true)}
            />

            {/* Mobile intel drawer */}
            <IntelDrawer
                open={intelDrawerOpen}
                onClose={() => setIntelDrawerOpen(false)}
                meddic={methodologyProgress}
                objections={trackedObjections}
            />
        </div>
    );
}
