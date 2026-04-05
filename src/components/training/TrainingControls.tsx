import KineticBox from './KineticBox';
import { Play, Pause, Mic, ShieldOff, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrainingControlsProps {
    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;
    toggleListening: () => void;
    isListening: boolean;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
    handleEndSession: () => void;
}

export default function TrainingControls({
    isPaused,
    setIsPaused,
    toggleListening,
    isListening,
    isMuted,
    setIsMuted,
    handleEndSession
}: TrainingControlsProps) {
    return (
        <KineticBox className="!py-3 !px-8">
            <div className="flex items-center gap-10">
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`p-4 transition-all ${isPaused ? 'bg-status-warning/20 text-status-warning' : 'bg-white/5 text-text-muted hover:text-white'}`}
                >
                    {isPaused ? <Play className="fill-current w-5 h-5" /> : <Pause className="fill-current w-5 h-5" />}
                </button>
                <button
                    onClick={toggleListening}
                    className={`p-6 rounded-full transition-all shadow-2xl relative ${isListening ? 'bg-accent text-white scale-110' : 'bg-bg-surface border border-white/10 text-text-muted hover:border-accent'}`}
                >
                    <Mic className="w-8 h-8" />
                    {isListening && (
                        <motion.div
                            className="absolute inset-0 bg-accent/30 rounded-full blur-xl -z-10"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        />
                    )}
                </button>
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 transition-all ${isMuted ? 'bg-accent-critical/20 text-accent-critical' : 'bg-white/5 text-text-muted hover:text-white'}`}
                >
                    {isMuted ? <ShieldOff className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </button>
                <div className="h-8 w-px bg-white/10" />
                <button
                    onClick={handleEndSession}
                    className="px-6 py-3 bg-accent-critical/10 border border-accent-critical/30 text-[10px] font-black text-accent-critical uppercase tracking-widest hover:bg-accent-critical/20 transition-all"
                >
                    End Call
                </button>
            </div>
        </KineticBox>
    );
}
