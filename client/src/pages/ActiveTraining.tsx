import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, ArrowLeft, VolumeX } from 'lucide-react';
import { supabase } from '../utils/supabase';

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
    const [isSpeaking, setIsSpeaking] = useState(false); // TTS state

    // Speech Recognition Reference
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial greeting
    useEffect(() => {
        if (!sessionId) {
            navigate('/training');
            return;
        }
        // Fetch session details or just start with a generic greeting
        handleAiResponse("Hello! I'm ready to practice. I'll act as your prospect. How would you like to start?");
    }, [sessionId]);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US'; // Make dynamic later

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => prev + ' ' + finalTranscript);
                    // Reset silence timer on final result
                    resetSilenceTimer();
                } else if (interimTranscript) {
                    // Just showing interim visuals if needed, or update transcript live
                    // For smoother UX, maybe we just show interim in a separate view?
                    // For now let's just use what we have.
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                if (isListening) {
                    // unexpected stop, restart
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        setIsListening(false);
                    }
                }
            };
        } else {
            alert('Speech recognition not supported in this browser. Please use Chrome.');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [isListening]);

    const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        // Auto-send after 2.5 seconds of silence if transcript exists
        silenceTimerRef.current = setTimeout(() => {
            if (transcript.trim().length > 0) {
                handleSend();
            }
        }, 2500);
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const startListening = () => {
        setIsListening(true);
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error(e);
        }
    };

    const stopListening = () => {
        setIsListening(false);
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    const handleSend = async () => {
        if (!transcript.trim()) return;

        const userMessage = transcript.trim();
        setTranscript('');
        stopListening(); // Stop listening while processing

        // Add user message to UI
        const newMessages = [...messages, { role: 'user', text: userMessage, timestamp: new Date() } as Message];
        setMessages(newMessages);
        setIsProcessing(true);

        try {
            const { data, error } = await supabase.functions.invoke('chat-ai', {
                body: {
                    sessionId,
                    message: userMessage,
                    history: newMessages.map(m => ({ role: m.role, text: m.text }))
                }
            });

            if (error) throw error;

            handleAiResponse(data.response);

        } catch (error) {
            console.error('Failed to get AI response', error);
            // Handle error state
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAiResponse = (text: string) => {
        setMessages(prev => [...prev, { role: 'ai', text: text, timestamp: new Date() }]);
        speakText(text);
    };

    const speakText = (text: string) => {
        if ('speechSynthesis' in window) {
            setIsSpeaking(true);
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => {
                setIsSpeaking(false);
                // Auto-start listening again after AI finishes?
                // Maybe better to let user toggle, but for "conversational" flow:
                startListening();
            };
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleEndSession = async () => {
        if (confirm('Are you sure you want to end this session?')) {
            stopListening();
            window.speechSynthesis.cancel();

            try {
                // Call complete session with messages to analyze
                const { data, error } = await supabase.functions.invoke('training-api', {
                    body: {
                        action: 'complete',
                        sessionId,
                        messages
                    }
                });

                if (error) throw error;

                const { pitchId } = data;

                if (pitchId) {
                    navigate(`/pitch/${pitchId}`);
                } else {
                    // Fallback if no pitch created (e.g. empty session)
                    navigate('/training');
                }
            } catch (error) {
                console.error('Failed to complete session', error);
                alert('Failed to save session. Please try again.');
            }
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, transcript]);

    return (
        <div className="min-h-screen gradient-dark-bg flex flex-col">
            {/* Header */}
            <header className="glass-bg border-b border-border-color sticky top-0 z-10 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('/training')} className="text-theme-muted hover:text-theme-primary transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold text-theme-primary">Active Training Session</h1>
                    <button
                        onClick={handleEndSession}
                        className="px-4 py-2 bg-[rgba(var(--error),0.1)] text-[rgb(var(--error))] hover:bg-[rgba(var(--error),0.2)] rounded-lg text-sm font-medium transition-colors"
                    >
                        End Session
                    </button>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32">
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-theme-accent text-white rounded-br-none'
                                    : 'bg-theme-tertiary text-theme-primary border border-border-color rounded-bl-none'
                                    }`}
                            >
                                <p className="text-lg leading-relaxed">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {transcript && (
                        <div className="flex justify-end">
                            <div className="max-w-[80%] p-4 rounded-2xl bg-theme-accent/50 text-white/80 rounded-br-none italic animate-pulse">
                                <p>{transcript}...</p>
                            </div>
                        </div>
                    )}
                    {isProcessing && (
                        <div className="flex justify-start">
                            <div className="bg-theme-tertiary p-4 rounded-2xl rounded-bl-none flex gap-2">
                                <span className="w-2 h-2 bg-theme-muted rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-theme-muted rounded-full animate-bounce stagger-1"></span>
                                <span className="w-2 h-2 bg-theme-muted rounded-full animate-bounce stagger-2"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Controls */}
            <div className="fixed bottom-0 left-0 right-0 p-6 glass-bg border-t border-border-color backdrop-blur-lg">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <button
                        onClick={toggleListening}
                        className={`flex-1 h-16 rounded-full flex items-center justify-center gap-3 text-xl font-bold transition-all ${isListening
                            ? 'bg-[rgb(var(--error))] text-white shadow-lg shadow-[rgba(var(--error),0.2)] animate-pulse'
                            : 'bg-theme-accent text-white shadow-lg shadow-[rgba(var(--accent-primary),0.2)] hover:scale-105'
                            }`}
                    >
                        {isListening ? (
                            <>
                                <MicOff className="h-6 w-6" />
                                Listening...
                            </>
                        ) : (
                            <>
                                <Mic className="h-6 w-6" />
                                {messages.length === 0 ? 'Start Conversation' : 'Resume & Speak'}
                            </>
                        )}
                    </button>
                    {isSpeaking && (
                        <button
                            onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }}
                            className="h-16 w-16 rounded-full bg-theme-tertiary border border-border-color flex items-center justify-center text-theme-primary hover:bg-theme-secondary transition-colors"
                        >
                            <VolumeX className="h-6 w-6" />
                        </button>
                    )}
                </div>
                <div className="text-center mt-4 text-theme-muted text-sm">
                    {isListening ? 'Speak naturally. I will respond when you pause.' : 'Press the microphone to speak.'}
                </div>
            </div>
        </div>
    );
}
