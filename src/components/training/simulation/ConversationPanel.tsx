import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PersonaBadge from './PersonaBadge';
import CoachingTicker from './CoachingTicker';

interface Message {
    role: 'user' | 'ai';
    text: string;
    speaker?: string;
    coachingNote?: string;
    timestamp: Date;
}

interface ConversationPanelProps {
    messages: Message[];
    streamingText: string;
    transcript: string;
    silenceProgress: number | null;
    isProcessing: boolean;
    personaName?: string;
    personaTitle?: string;
    personaCompany?: string;
    savedNoteIndices: Set<number>;
    onSaveNote: (text: string, idx: number) => void;
    // Text input fallback (no speech recognition)
    hasSpeechRecognition: boolean;
    textInputValue: string;
    onTextInput: (v: string) => void;
    onTextSend: () => void;
    isSpeaking: boolean;
}

export default function ConversationPanel({
    messages,
    streamingText,
    transcript,
    silenceProgress,
    isProcessing,
    personaName,
    personaTitle,
    personaCompany,
    savedNoteIndices,
    onSaveNote,
    hasSpeechRecognition,
    textInputValue,
    onTextInput,
    onTextSend,
    isSpeaking,
}: ConversationPanelProps) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, streamingText]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Transcript / live speech HUD */}
            <AnimatePresence>
                {(streamingText || transcript) && (
                    <motion.div
                        key="hud"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="shrink-0 px-5 py-3 border-b border-[#2a2a2e] bg-bg-canvas"
                    >
                        <p className="text-sm text-text-primary leading-relaxed">
                            {streamingText || transcript}
                        </p>
                        {silenceProgress !== null && transcript && (
                            <div className="mt-2 h-0.5 bg-[#2a2a2e]">
                                <div
                                    className="h-full bg-accent/60 transition-none"
                                    style={{ width: `${silenceProgress}%` }}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                <AnimatePresence mode="popLayout">
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 16 : -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            {/* Persona header for AI turns */}
                            {msg.role === 'ai' && (
                                <div className="mb-1.5">
                                    <PersonaBadge
                                        name={personaName || msg.speaker || 'Buyer'}
                                        title={personaTitle || ''}
                                        company={personaCompany}
                                    />
                                </div>
                            )}

                            {/* Rep label */}
                            {msg.role === 'user' && (
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                                    You
                                </span>
                            )}

                            {/* Bubble */}
                            <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                                msg.role === 'user'
                                    ? 'bg-accent/10 border border-accent/30 text-text-primary'
                                    : 'bg-bg-surface border border-[#2a2a2e] text-text-primary'
                            }`}>
                                {msg.text}
                            </div>

                            {/* Coaching ticker beneath AI turns */}
                            {msg.role === 'ai' && msg.coachingNote && (
                                <div className="max-w-[80%] w-full mt-0">
                                    <CoachingTicker
                                        note={msg.coachingNote}
                                        saved={savedNoteIndices.has(i)}
                                        onSave={() => onSaveNote(msg.coachingNote!, i)}
                                    />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Streaming / processing indicator */}
                {(isProcessing && !streamingText) && (
                    <div className="flex items-start gap-3">
                        <div className="flex items-center gap-1 px-4 py-3 bg-bg-surface border border-[#2a2a2e]">
                            <span className="w-1 h-1 bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                <div ref={endRef} />
            </div>

            {/* Text input fallback */}
            {!hasSpeechRecognition && (
                <div className="shrink-0 border-t border-[#2a2a2e] px-4 py-3 flex gap-2">
                    <input
                        type="text"
                        value={textInputValue}
                        onChange={e => onTextInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onTextSend(); } }}
                        placeholder="Type your response and press Enter…"
                        className="flex-1 bg-bg-canvas border border-[#2a2a2e] text-text-primary text-sm px-4 py-2 focus:outline-none focus:border-accent/50 placeholder-text-muted/50 transition-colors"
                        disabled={isProcessing || isSpeaking}
                    />
                    <button
                        onClick={onTextSend}
                        disabled={!textInputValue.trim() || isProcessing || isSpeaking}
                        className="px-5 py-2 bg-accent text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-30 transition-opacity"
                    >
                        Send
                    </button>
                </div>
            )}
        </div>
    );
}
