import { motion } from 'framer-motion';
import { Zap, Maximize2, Layout } from 'lucide-react';

interface TrainingHeaderProps {
    duration: number;
    formatTime: (seconds: number) => string;
    viewMode: 'focus' | 'command';
    setViewMode: (mode: 'focus' | 'command') => void;
}

export default function TrainingHeader({ duration, formatTime, viewMode, setViewMode }: TrainingHeaderProps) {
    return (
        <header className="fixed top-0 w-full p-8 flex justify-between items-center z-50 bg-bg-canvas/40 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black uppercase tracking-[0.3em] leading-none">OAST HUD</span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <motion.div
                                className="w-1.5 h-1.5 rounded-full bg-status-success shadow-[0_0_8px_#10b981]"
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase italic">Secure Uplink</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/10">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Active Time</span>
                    <span className="font-mono text-sm font-bold text-accent">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center bg-bg-surface/50 p-1 border border-white/10">
                    <button
                        onClick={() => setViewMode('focus')}
                        className={`px-4 py-2 flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest ${viewMode === 'focus' ? 'bg-accent text-white shadow-lg' : 'text-text-muted'}`}
                    >
                        <Maximize2 className="w-3.5 h-3.5" /> HUD
                    </button>
                    <button
                        onClick={() => setViewMode('command')}
                        className={`px-4 py-2 flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest ${viewMode === 'command' ? 'bg-accent text-white shadow-lg' : 'text-text-muted'}`}
                    >
                        <Layout className="w-3.5 h-3.5" /> Logs
                    </button>
                </div>
            </div>
        </header>
    );
}
