import { motion } from 'framer-motion';

interface AudioVisualizerProps {
    state: 'idle' | 'listening' | 'processing' | 'speaking';
}

export default function AudioVisualizer({ state }: AudioVisualizerProps) {
    return (
        <div className="relative flex items-center justify-center w-full h-48">
            {/* Base Circle */}
            <div className="w-24 h-24 rounded-full bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] z-10 flex items-center justify-center">
                {state === 'idle' && <div className="w-4 h-4 rounded-full bg-[rgb(var(--text-muted))]" />}
                {state === 'listening' && <div className="w-4 h-4 rounded-full bg-[rgb(var(--accent-primary))]" />}
                {state === 'processing' && (
                    <div className="w-8 h-8 border-4 border-[rgb(var(--accent-primary))] border-t-transparent rounded-full animate-spin" />
                )}
                {state === 'speaking' && (
                    <div className="flex gap-1">
                        <motion.div
                            className="w-1 bg-[rgb(var(--accent-primary))]"
                            animate={{ height: [10, 20, 10] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                        />
                        <motion.div
                            className="w-1 bg-[rgb(var(--accent-primary))]"
                            animate={{ height: [15, 30, 15] }}
                            transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }}
                        />
                        <motion.div
                            className="w-1 bg-[rgb(var(--accent-primary))]"
                            animate={{ height: [10, 25, 10] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        />
                    </div>
                )}
            </div>

            {/* Ripples for Listening */}
            {state === 'listening' && (
                <>
                    <motion.div
                        className="absolute w-24 h-24 rounded-full border border-[rgb(var(--accent-primary)/0.3)]"
                        animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <motion.div
                        className="absolute w-24 h-24 rounded-full border border-[rgb(var(--accent-primary)/0.2)]"
                        animate={{ scale: [1, 1.8], opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                    />
                </>
            )}

            {/* Glow for Speaking */}
            {state === 'speaking' && (
                <motion.div
                    className="absolute w-24 h-24 rounded-full bg-[rgb(var(--accent-primary)/0.2)] blur-xl"
                    animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                />
            )}
        </div>
    );
}
