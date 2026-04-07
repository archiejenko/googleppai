import TransferGapIndicator from './TransferGapIndicator';

interface SimulationTopBarProps {
    duration: number;
    formatTime: (s: number) => string;
    personaName?: string;
    personaTitle?: string;
    personaCompany?: string;
    transferGapScore: number;
    transferGapDelta: number;
    isPaused: boolean;
}

export default function SimulationTopBar({
    duration,
    formatTime,
    personaName,
    personaTitle,
    personaCompany,
    transferGapScore,
    transferGapDelta,
    isPaused,
}: SimulationTopBarProps) {
    return (
        <header className="flex items-center justify-between px-5 py-3 bg-bg-surface border-b border-[#2a2a2e] shrink-0">
            {/* Left: brand + active persona */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 ${isPaused ? 'bg-text-muted' : 'bg-accent animate-pulse'}`} />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted">OAST</span>
                </div>
                {personaName && (
                    <>
                        <div className="w-px h-4 bg-[#2a2a2e]" />
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-[10px] font-black text-text-primary">{personaName}</span>
                            {(personaTitle || personaCompany) && (
                                <span className="text-[10px] text-text-muted">
                                    — {[personaTitle, personaCompany].filter(Boolean).join(', ')}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Right: Transfer Gap + Timer */}
            <div className="flex items-center gap-5">
                <TransferGapIndicator score={transferGapScore} delta={transferGapDelta} />
                <div className="w-px h-4 bg-[#2a2a2e]" />
                <span className="text-sm font-mono font-black tabular-nums text-text-primary">
                    {formatTime(duration)}
                </span>
            </div>
        </header>
    );
}
