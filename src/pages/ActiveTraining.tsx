import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Info, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { posthog, isPostHogEnabled } from '../lib/posthog';


// Modular Components
import NeuralOrb from '../components/training/NeuralOrb';
import { AIVoiceInput } from '../components/ui/ai-voice-input';
import GrowthRadar from '../components/training/GrowthRadar';
import BuyingCommittee, { type PersonaType } from '../components/training/BuyingCommittee';
import KineticBox from '../components/training/KineticBox';
import TrainingHeader from '../components/training/TrainingHeader';
import PerformanceMetrics from '../components/training/PerformanceMetrics';
import SessionBriefing from '../components/training/SessionBriefing';
import TrainingControls from '../components/training/TrainingControls';
import SkillTrajectory from '../components/training/SkillTrajectory';
import BattleCard from '../components/training/BattleCard';

// Timing constants — defined after all imports
const SILENCE_TIMEOUT_MS = 2200;   // Pause after speech before auto-send
const STREAM_CHAR_SPEED_MS = 25;   // ms per character for AI response typewriter effect
const TIMER_TICK_MS = 1000;        // Session duration counter interval

const hasSpeechRecognition = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

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

export default function ActiveTraining() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');

    const [sessionData, setSessionData] = useState<SessionData | null>(null);

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [duration, setDuration] = useState(0);
    const [methodologyProgress, setMethodologyProgress] = useState<Record<string, number>>({});
    const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
    const [recentDrills, setRecentDrills] = useState<DrillHighlight[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [playbookObjections, setPlaybookObjections] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    // UI Mode State
    const [viewMode, setViewMode] = useState<'focus' | 'command'>('focus');
    const [isMuted, setIsMuted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male');
    const [activePersona, setActivePersona] = useState<PersonaType>('Executive');
    const [personaSentiments, setPersonaSentiments] = useState<Record<PersonaType, 'Curious' | 'Skeptical' | 'Impressed' | 'Neutral'>>({
        Executive: 'Neutral', Financial: 'Neutral', Technical: 'Neutral', Operational: 'Neutral'
    });

    // Speech Recognition Refs
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const isListeningRef = useRef(false);
    const isPausedRef = useRef(false);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Refs to avoid stale closures in the one-time speech recognition useEffect
    const transcriptRef = useRef('');
    const handleSendRef = useRef<() => void>(() => {});
    const resetSilenceTimerRef = useRef<() => void>(() => {});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<Message[]>([]);
    const sessionEndedRef = useRef(false);

    // MediaRecorder for optional session audio capture
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [, setIsRecordingAudio] = useState(false);

    // AI Response Stream Effect State
    const [streamingText, setStreamingText] = useState('');
    const [textInputValue, setTextInputValue] = useState('');
    const [silenceProgress, setSilenceProgress] = useState<number | null>(null);
    const silenceProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionStartTimeRef = useRef<number | null>(null);
    const totalUserWordsRef = useRef(0);

    // Keep messagesRef in sync with messages state for safe use in cleanup
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // Keep state refs in sync so recognition callbacks always read current values
    useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { handleSendRef.current = handleSend; }); // no deps: always latest version
    useEffect(() => { resetSilenceTimerRef.current = resetSilenceTimer; }); // no deps: always latest version

    // Auto-save on unmount (navigate-away without clicking End Session)
    useEffect(() => {
        return () => {
            if (!sessionEndedRef.current && messagesRef.current.length > 1 && sessionId) {
                supabase.functions.invoke('training-api', {
                    body: {
                        action: 'complete',
                        sessionId,
                        messages: messagesRef.current.map(m => ({ role: m.role, text: m.text }))
                    }
                });
            }
        };
    }, [sessionId]);

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            if (!isPaused) setDuration(prev => prev + 1);
        }, TIMER_TICK_MS);
        return () => clearInterval(timer);
    }, [isPaused]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch Skills
                const { data: skills } = await supabase.from('user_skills').select('*').eq('user_id', user.id);
                if (skills) setUserSkills(skills);

                // Fetch Recent Drills (from pitches)
                const { data: pitches } = await supabase.from('pitches').select('id, score, created_at, training_sessions(scenario)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3);
                if (pitches) {
                    setRecentDrills(pitches.map(p => ({
                        id: p.id,
                        title: (p.training_sessions as { scenario: string | null }[] | null)?.[0]?.scenario || 'Practice',
                        score: p.score,
                        completed_at: p.created_at
                    })));
                }

                // Fetch Session Info
                if (sessionId) {
                    const { data: sessionDataFetch, error: sessionFetchError } = await supabase
                        .from('training_sessions')
                        .select('*')
                        .eq('id', sessionId)
                        .maybeSingle();

                    if (sessionFetchError) {
                        console.error('[ActiveTraining] DB Fetch Error:', sessionFetchError);
                        setFetchError(sessionFetchError.message);
                    }

                    if (sessionDataFetch) {
                        setSessionData(sessionDataFetch);
                        setFetchError(null);

                        // Fetch Playbook objections
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('team_id')
                            .eq('id', user.id)
                            .single();

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
                        setSessionData(null);
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

    // Initial AI Greeting logic
    useEffect(() => {
        const triggerGreeting = async () => {
            if (!loading && messages.length === 0 && sessionData && sessionId) {
                setIsProcessing(true);
                try {
                    const { data, error } = await supabase.functions.invoke('unified-ai', {
                        body: { sessionId, message: '__START_SIMULATION__', history: [] }
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
                } catch (err: unknown) {
                    console.error('Failed to trigger initial greeting:', err);
                    handleAiResponse({
                        buyer_response: "Hello? Is someone there?",
                        evaluation: { confidence: 0.8, overall_score: 80, clarity: 0.8, objection_handling: 0.8, rapport: 0.8 },
                        coaching_feedback: '',
                        missed_opportunities: [],
                        strengths: [],
                        next_objection_type: "None",
                        updated_state: { objection_stage: "None", buyer_temperature: 0.5, closing_probability: 0.1 }
                    });
                } finally {
                    setIsProcessing(false);
                }
            }
        };

        triggerGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, messages.length, sessionData, sessionId]);

    // Initialize Speech — created ONCE so callbacks always reference the same instance.
    // State is read via refs (isListeningRef / isPausedRef) to avoid stale closures.
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
            console.error('[SR] recognition error:', e.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            if (isListeningRef.current && !isPausedRef.current) {
                try { recognition.start(); }
                catch (e) { console.error('[SR] restart failed:', e); }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            try { recognition.abort(); } catch { /* ignore */ }
        };
    }, []); // one-time init — callbacks use refs for live state

    // Resume speech recognition when tab regains focus (browser stops it on tab hide)
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

        // Start MediaRecorder on first listen if available and not already recording
        if (!mediaRecorderRef.current && typeof MediaRecorder !== 'undefined') {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const mr = new MediaRecorder(stream);
                mediaRecorderRef.current = mr;
                audioChunksRef.current = [];
                mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
                mr.start(1000);
                setIsRecordingAudio(true);
            }).catch(() => { /* mic permission denied — recording opt-in, silently skip */ });
        }
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) recognitionRef.current.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    const handleSend = async () => {
        const text = (transcript || textInputValue).trim();
        if (!text) return;

        // WPM tracking for real pace calculation
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

        // Inject real pace into next liveMetrics update
        setLiveMetrics(prev => prev ? { ...prev, user_pace_check: computedPace } : null);

        const userMsg: Message = { role: 'user', text, timestamp: new Date() };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);
        setIsProcessing(true);

        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) throw new Error('Session expired.');

            const { data, error } = await supabase.functions.invoke('unified-ai', {
                body: { sessionId, message: text }
            });

            if (error) throw error;
            // Detect server-side errors returned as JSON body with HTTP 200/500
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
                updated_state: { objection_stage: "None", buyer_temperature: 0.5, closing_probability: 0.1 }
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
    const [savedNoteIndices, setSavedNoteIndices] = useState<Set<number>>(new Set());
    const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleSaveMemory = async (text: string, msgIdx: number) => {
        try {
            await supabase.functions.invoke('coach-memory-save', {
                body: { memory_text: text, memory_type: 'fact', source_session_id: sessionId ?? undefined },
            });
            setSavedNoteIndices(prev => new Set(prev).add(msgIdx));
        } catch {
            // non-critical — silently ignore
        }
    };

    const handleAiResponse = (data: UnifiedAiResponse | string) => {
        let text: string;
        const speaker = "Buyer";
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
                current_objection_state: data.next_objection_type || "None"
            };
            // Map objection stage to emotion maybe?
            if (data.updated_state?.buyer_temperature > 0.8) emotion = "Interested";
            else if (data.updated_state?.buyer_temperature < 0.3) emotion = "Skeptical";
        }

        // Methodology progress from evaluation scores
        if (typeof data !== 'string') {
            setMethodologyProgress({
                M: Math.round((data.evaluation?.confidence         || 0) * 100),
                E: Math.round((data.evaluation?.rapport            || 0) * 100),
                D: Math.round((data.evaluation?.clarity            || 0) * 100),
                P: Math.round((data.updated_state?.closing_probability || 0) * 100),
                I: Math.round((data.evaluation?.objection_handling || 0) * 100),
                C: Math.round((data.updated_state?.buyer_temperature   || 0) * 100),
            });
        }

        // Persona from session data (not hardcoded)
        const VALID_PERSONAS: PersonaType[] = ['Executive', 'Financial', 'Technical', 'Operational'];
        const sessionPersona = sessionData?.persona_category as PersonaType;
        const currentPersona = VALID_PERSONAS.includes(sessionPersona) ? sessionPersona : 'Executive';
        setActivePersona(currentPersona);
        setPersonaSentiments(prev => ({ ...prev, [currentPersona]: emotion }));

        // Clear existing stream
        if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);

        const coachingNote = typeof data !== 'string' && data.coaching_feedback ? data.coaching_feedback : undefined;

        let i = 0;
        setStreamingText("");

        streamingIntervalRef.current = setInterval(() => {
            setStreamingText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) {
                if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
                setMessages(prev => [...prev, {
                    role: 'ai', text: text, speaker: speaker,
                    emotion: emotion, timestamp: new Date(),
                    ...(coachingNote ? { coachingNote } : {}),
                }]);
                setStreamingText("");
            }
        }, STREAM_CHAR_SPEED_MS);

        setLiveMetrics(analytics);
        speakText(text, voiceGender);
    };

    const activeTtsRef = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);

    const speakText = async (text: string, gender: 'male' | 'female' = 'male') => {
        if (isMuted) {
            if (!isPausedRef.current) startListening();
            return;
        }

        // Cancel any in-progress TTS
        if (activeTtsRef.current) {
            activeTtsRef.current.audio.pause();
            URL.revokeObjectURL(activeTtsRef.current.url);
            activeTtsRef.current = null;
        }

        setIsSpeaking(true);

        // Guards against onDone being called twice and against isSpeaking getting stuck
        let doneCalled = false;

        const onDone = () => {
            if (doneCalled) return;
            doneCalled = true;
            setIsSpeaking(false);
            if (!isPausedRef.current) startListening();
        };

        // Safety valve: if nothing calls onDone within 20 s, unstick the mic
        // doneCalled prevents double-execution if audio ends before the timer fires
        setTimeout(onDone, 20000);

        try {
            const { data, error } = await supabase.functions.invoke('tts-generate', {
                body: { text, voice: gender },
                headers: { Accept: 'audio/mpeg' },
            });
            if (error) throw error;

            // Validate that we received binary audio, not a JSON error object
            if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) {
                throw new Error('TTS returned non-binary response');
            }

            const blob = new Blob([data as BlobPart], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            activeTtsRef.current = { audio, url };
            audio.onended = () => {
                URL.revokeObjectURL(url);
                activeTtsRef.current = null;
                onDone();
            };
            audio.onerror = () => {
                console.error('[TTS] Audio playback error');
                URL.revokeObjectURL(url);
                activeTtsRef.current = null;
                onDone();
            };
            audio.play().catch(() => onDone()); // play() promise rejection also unblocks
        } catch (e) {
            console.error('[TTS] Error, falling back to speechSynthesis:', e);
            // Fallback to browser speechSynthesis
            if ('speechSynthesis' in window) {
                const u = new SpeechSynthesisUtterance(text);
                u.onend = onDone;
                u.onerror = onDone;
                window.speechSynthesis.speak(u);
            } else {
                onDone();
            }
        }
    };

    const handleEndSession = async () => {
        sessionEndedRef.current = true;
        stopListening();
        // Cancel any active TTS
        if (activeTtsRef.current) {
            activeTtsRef.current.audio.pause();
            URL.revokeObjectURL(activeTtsRef.current.url);
            activeTtsRef.current = null;
        }
        window.speechSynthesis.cancel();
        setIsProcessing(true);

        // Stop MediaRecorder and collect audio
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
                        .from('recordings')
                        .getPublicUrl(`sessions/${sessionId}.webm`);
                    audioUrl = publicUrl.publicUrl;
                }
            }
        }

        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) throw new Error('Session expired.');
            const { data, error } = await supabase.functions.invoke('training-api', {
                body: { action: 'complete', sessionId, messages: messages.map(m => ({ role: m.role, text: m.text })), audioUrl }
            });
            if (error) throw error;
            if (isPostHogEnabled) {
                posthog.capture('training_session_completed', {
                    session_id: sessionId,
                    message_count: messages.length,
                    pitch_id: data.pitchId ?? null,
                });
            }
            if (data.pitchId) navigate(`/pitch/${data.pitchId}`);
            else navigate('/dashboard');
        } catch {
            navigate('/dashboard');
        } finally {
            setIsProcessing(false);
        }
    };

    const visualizerState = isSpeaking ? 'speaking' : isProcessing ? 'processing' : isListening ? 'listening' : 'idle';

    if (loading) {
        return (
            <div className="h-screen w-full bg-bg-canvas flex flex-col items-center justify-center text-text-primary">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-accent/10 rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <h2 className="text-xl font-bold tracking-widest uppercase mb-2">Initialising Command Centre</h2>
                    <p className="text-text-muted text-sm font-light">Establishing Neural Link & Fetching Session Data...</p>
                </div>
            </div>
        );
    }

    if (!sessionData) {
        return (
            <div className="h-screen w-full bg-bg-canvas flex flex-col items-center justify-center text-text-primary px-6">
                <div className="max-w-md w-full p-8 bg-bg-surface/40 backdrop-blur-2xl border border-white/10 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-status-danger/10 flex items-center justify-center mx-auto mb-6">
                        <Info className="text-status-danger w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Command Link Failure</h2>
                    <p className="text-text-secondary mb-8 leading-relaxed">
                        We couldn't establish a neural link for this session. The Session ID might be invalid or expired.
                    </p>
                    {fetchError && (
                        <div className="mb-8 p-4 bg-status-danger/10 border border-status-danger/20 text-sm text-status-danger font-mono">
                            Error: {fetchError}
                            <div className="mt-1 opacity-50">ID: {sessionId || 'NONE'}</div>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-4 bg-accent hover:bg-accent-secondary text-white font-bold transition-all"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-bg-canvas flex flex-col overflow-hidden relative text-text-primary transition-all duration-700">
            {/* Ambient Background Glow */}
            <motion.div
                className={`absolute inset-0 pointer-events-none z-0 transition-all duration-1000 opacity-20
                    ${(liveMetrics?.confidence_level || 0) > 0.8 ? 'bg-status-success/10' : (liveMetrics?.confidence_level || 0) < 0.4 ? 'bg-status-danger/10' : 'bg-accent/5'}
                `}
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ repeat: Infinity, duration: 8 }}
            />

            <TrainingHeader
                duration={duration}
                formatTime={formatTime}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            {/* Battle Card Overlay */}
            <AnimatePresence>
                {liveMetrics?.current_objection_state && liveMetrics.current_objection_state !== 'None' && (
                    <BattleCard
                        objection={liveMetrics.current_objection_state}
                        response={playbookObjections[liveMetrics.current_objection_state] || "Consult your playbook for the best response."}
                        onDismiss={() => setLiveMetrics(prev => prev ? { ...prev, current_objection_state: 'None' } : null)}
                    />
                )}
            </AnimatePresence>

            {/* Main Command Center Layout */}
            <main className="flex-1 w-full p-10 pt-28 relative z-10 grid grid-cols-12 grid-rows-6 gap-6 h-screen overflow-hidden">
                <AnimatePresence mode="wait">
                    {viewMode === 'focus' ? (
                        <>
                            {/* Widget 1: Session Briefing (Top Left) */}
                            <div className="col-span-3 row-span-2">
                                <SessionBriefing activePersona={activePersona} sessionData={sessionData} />
                            </div>

                            {/* Widget 2: Live Scoring (Top Right) */}
                            <div className="col-span-3 col-start-10 row-span-2">
                                <PerformanceMetrics liveMetrics={liveMetrics ? {
                                    confidence_level: liveMetrics.confidence_level,
                                    user_pace_check: liveMetrics.user_pace_check
                                } : null} />
                            </div>

                            {/* Center: Transcription HUD & Neural Orb */}
                            <div className="col-span-6 col-start-4 row-span-4 flex flex-col items-center justify-center relative">
                                {/* Transcription HUD (High Visibility) */}
                                <div className="absolute top-0 w-full text-center px-12 z-20 pointer-events-none">
                                    <AnimatePresence mode="wait">
                                        {(streamingText || transcript) && (
                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-bg-canvas/60 backdrop-blur-md p-6 border border-white/5 inline-block">
                                                <p className="text-2xl font-light text-white leading-tight tracking-tight max-w-2xl mx-auto">
                                                    {streamingText || transcript}
                                                </p>
                                                {/* Silence countdown bar */}
                                                {silenceProgress !== null && transcript && (
                                                    <div className="mt-3 w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-accent/70 transition-none"
                                                            style={{ width: `${silenceProgress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Widget 3: Neural Orb + Voice Input (Central) */}
                                <div className="flex flex-col items-center">
                                    <div className="p-8">
                                        <NeuralOrb state={visualizerState} intensity={isListening ? 0.3 : isSpeaking ? 0.7 : 0} />
                                    </div>
                                    {hasSpeechRecognition && (
                                        <AIVoiceInput
                                            onStart={startListening}
                                            onStop={() => stopListening()}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Widget 4: Progress Dashboard (Bottom Left) */}
                            <div className="col-span-3 row-span-2 row-start-5">
                                <SkillTrajectory userSkills={userSkills} recentDrills={recentDrills} />
                            </div>

                            {/* Widget 5: Command Center Controls (Bottom Center) */}
                            <div className="col-span-6 col-start-4 row-span-1 row-start-6 flex flex-col items-center justify-center gap-2">
                                {!hasSpeechRecognition && (
                                    <div className="w-full flex items-center gap-2 px-4">
                                        <input
                                            type="text"
                                            value={textInputValue}
                                            onChange={e => setTextInputValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                            placeholder="Type your response and press Enter..."
                                            className="flex-1 bg-bg-surface/40 border border-white/20 text-white text-sm px-4 py-2 focus:outline-none focus:border-accent/60 placeholder-white/30"
                                            disabled={isProcessing || isSpeaking}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!textInputValue.trim() || isProcessing || isSpeaking}
                                            className="px-4 py-2 bg-accent text-white text-xs font-black uppercase tracking-widest disabled:opacity-30"
                                        >
                                            Send
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <TrainingControls
                                        isPaused={isPaused}
                                        setIsPaused={setIsPaused}
                                        toggleListening={hasSpeechRecognition ? toggleListening : () => {}}
                                        isListening={isListening}
                                        isMuted={isMuted}
                                        setIsMuted={setIsMuted}
                                        handleEndSession={handleEndSession}
                                    />
                                    {/* Voice Gender Toggle */}
                                    <div className="flex items-center border border-white/20" title="Buyer voice">
                                        <button
                                            onClick={() => setVoiceGender('male')}
                                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                                                voiceGender === 'male'
                                                    ? 'bg-accent text-bg-canvas'
                                                    : 'bg-transparent text-accent border-r border-white/20 hover:bg-accent/10'
                                            }`}
                                        >
                                            Male
                                        </button>
                                        <button
                                            onClick={() => setVoiceGender('female')}
                                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                                                voiceGender === 'female'
                                                    ? 'bg-accent text-bg-canvas'
                                                    : 'bg-transparent text-accent hover:bg-accent/10'
                                            }`}
                                        >
                                            Female
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Methodology Sidebar (Right) */}
                            <div className="col-span-3 col-start-10 row-span-2 row-start-5">
                                <KineticBox title="Neural Loop Similarity" icon={Zap}>
                                    <div className="h-full flex flex-col justify-center gap-4">
                                        <div className="flex flex-wrap gap-2">
                                            {['M', 'E', 'D', 'P', 'I', 'C'].map(p => (
                                                <div key={p} className="flex-1 min-w-[30%] flex flex-col items-center p-3 bg-white/5 border border-white/5 group hover:border-accent/30 transition-all">
                                                    <span className="text-xs font-black text-accent mb-1">{p}</span>
                                                    <span className="text-sm font-bold">{methodologyProgress[p] || 0}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </KineticBox>
                            </div>
                        </>
                    ) : (
                        /* Command Center Logs Mode (Legacy Support / Details) */
                        <motion.div key="command" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="col-span-12 row-span-6 flex gap-6">
                            <div className="flex-1 bg-bg-surface/20 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col">
                                <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((msg, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[9px] font-black tracking-widest text-text-muted uppercase">{msg.role === 'user' ? 'Representative' : msg.speaker}</span>
                                                </div>
                                                <div className={`p-5 text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-bg-surface/50 border border-white/10 text-text-primary'}`}>
                                                    {msg.text}
                                                </div>
                                                {msg.role === 'ai' && msg.coachingNote && (
                                                    <div className="max-w-[80%] mt-1 px-3 py-2 bg-accent/5 border-l-2 border-accent/40 text-xs text-text-secondary italic flex items-start gap-2">
                                                        <span className="flex-1 leading-relaxed">{msg.coachingNote}</span>
                                                        <button
                                                            onClick={() => handleSaveMemory(msg.coachingNote!, i)}
                                                            disabled={savedNoteIndices.has(i)}
                                                            className="shrink-0 text-[9px] font-black uppercase tracking-wider text-text-muted hover:text-accent disabled:text-green-400 disabled:cursor-default transition-colors"
                                                        >
                                                            {savedNoteIndices.has(i) ? '✓ Saved' : 'Save'}
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            <div className="w-[400px] flex flex-col gap-6">
                                <BuyingCommittee activePersona={activePersona} sentiment={personaSentiments} />
                                <div className="p-8 bg-bg-surface/30 border border-white/10 flex-1 flex flex-col items-center justify-center">
                                    <GrowthRadar data={methodologyProgress} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Status Ticker */}
            <footer className="fixed bottom-0 w-full py-2 px-10 bg-bg-canvas/80 backdrop-blur-md border-t border-white/5 flex justify-between items-center z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${visualizerState === 'listening' ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
                        <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.3em]">
                            {visualizerState === 'listening' ? 'Uplink Active' : 'Uplink Standby'}
                        </span>
                    </div>
                </div>
                <div className="text-[8px] font-black text-text-muted/40 uppercase tracking-[0.5em]">
                    Neural Simulation Engine v4.0.1 // OAST Professional
                </div>
            </footer>
        </div>
    );
}
