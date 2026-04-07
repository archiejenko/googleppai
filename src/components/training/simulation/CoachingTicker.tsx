interface CoachingTickerProps {
    note: string;
    onSave?: () => void;
    saved?: boolean;
}

export default function CoachingTicker({ note, onSave, saved }: CoachingTickerProps) {
    if (!note) return null;
    return (
        <div className="flex items-start gap-2 px-3 py-1.5 bg-amber-400/5 border-l-2 border-amber-400/50 mt-1">
            <div className="w-1 h-1 bg-amber-400 shrink-0 mt-1.5" />
            <p className="text-[11px] text-amber-300/80 leading-relaxed flex-1 font-mono">
                {note}
            </p>
            {onSave && (
                <button
                    onClick={onSave}
                    disabled={saved}
                    className="shrink-0 text-[9px] font-black uppercase tracking-wider text-text-muted hover:text-amber-400 disabled:text-green-400 disabled:cursor-default transition-colors"
                >
                    {saved ? '✓' : 'Save'}
                </button>
            )}
        </div>
    );
}
