import { useState } from 'react';

interface EndSimulationBarProps {
    onEnd: () => void;
    isProcessing: boolean;
    // Mobile intel toggle
    onIntelToggle?: () => void;
    showIntelToggle?: boolean;
}

export default function EndSimulationBar({
    onEnd,
    isProcessing,
    onIntelToggle,
    showIntelToggle,
}: EndSimulationBarProps) {
    const [confirming, setConfirming] = useState(false);

    const handleClick = () => {
        if (confirming) {
            setConfirming(false);
            onEnd();
        } else {
            setConfirming(true);
            // Auto-reset confirm after 4s
            setTimeout(() => setConfirming(false), 4000);
        }
    };

    return (
        <footer className="shrink-0 flex items-center justify-between px-5 py-3 bg-bg-surface border-t border-[#2a2a2e]">
            <div className="flex items-center gap-3">
                {showIntelToggle && (
                    <button
                        type="button"
                        onClick={onIntelToggle}
                        className="text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 border border-[#2a2a2e] text-text-muted hover:border-accent/40 hover:text-text-primary transition-colors"
                    >
                        Intel
                    </button>
                )}
            </div>

            <button
                type="button"
                onClick={handleClick}
                disabled={isProcessing}
                className={`text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2.5 border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirming
                        ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                        : 'bg-transparent border-red-500/40 text-red-400/60 hover:border-red-500 hover:text-red-400 hover:bg-red-500/5'
                }`}
            >
                {confirming ? 'Confirm End' : 'End Simulation'}
            </button>
        </footer>
    );
}
