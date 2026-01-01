import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, Clock, MessageSquare } from 'lucide-react';
import { supabase } from '../utils/supabase';
import AudioVisualizer from '../components/training/AudioVisualizer';

interface Message {
    role: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

export default function ActiveTraining() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const navigate = useNavigate();

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [duration, setDuration] = useState(0);

    // Speech Recognition Refs
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Initial greeting
    useEffect(() => {
        if (!sessionId) {
            handleAiResponse("Hello! I'm your practice partner. What topic are we covering today?");
            // In a real app we'd fetch the session topic here
        }
    }, [sessionId]);

    // Initialize Speech (Same logic as before, minimized for brevity in this rewrite but keeping core)
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event: any) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) final += event.results[i][0].transcript;
                    else interim += event.results[i][0].transcript;
                }
                if (final) {
                    setTranscript(prev => prev + ' ' + final);
                    resetSilenceTimer();
                }
            };

            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => { if (isListening) try { recognitionRef.current.start(); } catch { } };
        }
    }, [isListening]);

    const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            if (transcript.trim().length > 0) handleSend();
        }, 2500);
    };

    const toggleListening = () => isListening ? stopListening() : startListening();

    const startListening = () => {
        setIsListening(true);
        try { recognitionRef.current.start(); } catch { }
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) recognitionRef.current.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    const handleSend = async () => {
        const text = transcript.trim();
        if (!text) return;
        setTranscript('');
        stopListening();

        const newMsgs = [...messages, { role: 'user', text, timestamp: new Date() } as Message];
        setMessages(newMsgs);
        setIsProcessing(true);

        // Mock AI call if no Supabase implementation yet
        // For now, assume Supabase function works as per previous logic
        try {
            const { data, error } = await supabase.functions.invoke('chat-ai', {
                body: { sessionId, message: text, history: newMsgs.map(m => ({ role: m.role, text: m.text })) }
            });
            if (error) throw error;
            handleAiResponse(data.response);
        } catch (e) {
            console.error(e);
            handleAiResponse("I'm having trouble connecting right now, but let's continue.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAiResponse = (text: string) => {
        setMessages(prev => [...prev, { role: 'ai', text, timestamp: new Date() }]);
        speakText(text);
    };

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            setIsSpeaking(true);
            const u = new SpeechSynthesisUtterance(text);
            u.onend = () => { setIsSpeaking(false); startListening(); };
            window.speechSynthesis.speak(u);
        }
    };

    const handleEndSession = async () => {
        stopListening();
        window.speechSynthesis.cancel();
        // Determine pitchID or navigate
        navigate('/dashboard'); // Should go to analysis in real flow
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const visualizerState = isSpeaking ? 'speaking' : isProcessing ? 'processing' : isListening ? 'listening' : 'idle';

    return (
        <div className="h-screen w-full bg-[rgb(var(--bg-canvas))] flex flex-col overflow-hidden relative">

            {/* Focus Header */}
            <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[rgb(var(--accent-primary))] flex items-center justify-center font-display font-bold text-white">O</div>
                </div>

                {/* Live Metrics Pill */}
                <div className="hidden md:flex items-center gap-6 px-4 py-2 bg-[rgb(var(--bg-surface)/0.5)] backdrop-blur-md rounded-full border border-[rgb(var(--border-subtle))]">
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))]">
                        <Clock className="w-4 h-4" />
                        <span className="font-mono text-[rgb(var(--text-primary))]">{formatTime(duration)}</span>
                    </div>
                    <div className="w-px h-4 bg-[rgb(var(--border-subtle))]" />
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))]">
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-mono text-[rgb(var(--text-primary))]">{messages.length} turns</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handleEndSession} className="hidden md:block btn-ghost text-status-danger hover:bg-status-danger/10 hover:text-status-danger">
                        End Session
                    </button>
                    <button className="md:hidden p-2 text-[rgb(var(--text-muted))]">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content: Chat & Visualizer Split */}
            <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col">

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto px-6 py-24 space-y-6">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-lg p-5 rounded-2xl text-base leading-relaxed animate-in-up 
                                ${msg.role === 'user'
                                    ? 'bg-[rgb(var(--accent-primary))] text-white rounded-br-sm shadow-lg shadow-[rgb(var(--accent-primary)/0.2)]'
                                    : 'bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] rounded-bl-sm'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {transcript && (
                        <div className="flex justify-end">
                            <div className="max-w-lg p-5 rounded-2xl bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-subtle))] text-[rgb(var(--text-muted))] italic">
                                {transcript}...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Bottom Controls Area */}
                <div className="p-6 bg-gradient-to-t from-[rgb(var(--bg-canvas))] via-[rgb(var(--bg-canvas))] to-transparent">
                    <div className="max-w-xl mx-auto flex flex-col items-center gap-8">

                        <AudioVisualizer state={visualizerState} />

                        <div className="flex items-center gap-6">
                            <button
                                onClick={toggleListening}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                                ${isListening
                                        ? 'bg-status-danger text-white scale-110'
                                        : 'bg-[rgb(var(--accent-primary))] text-white hover:scale-105'
                                    }`}
                            >
                                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>
                        </div>

                        <p className="text-[rgb(var(--text-muted))] text-sm font-medium">
                            {visualizerState === 'listening' ? 'Listening...' :
                                visualizerState === 'processing' ? 'Thinking...' :
                                    visualizerState === 'speaking' ? 'Speaking...' :
                                        'Tap microphone to start'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
