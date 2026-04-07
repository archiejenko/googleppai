interface TransferGapIndicatorProps {
    score: number;
    delta: number;
}

export default function TransferGapIndicator({ score, delta }: TransferGapIndicatorProps) {
    const scoreColor = score >= 75 ? 'text-green-400' : score >= 55 ? 'text-amber-400' : 'text-red-400';
    const deltaColor = delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-text-muted';
    const deltaSign  = delta > 0 ? '+' : '';

    return (
        <div className="flex items-center gap-2" title="Transfer Gap — live score delta vs benchmark">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">TG</div>
            <span className={`text-base font-mono font-black tabular-nums ${scoreColor}`}>
                {score}
            </span>
            {delta !== 0 && (
                <span className={`text-[11px] font-mono font-black tabular-nums ${deltaColor}`}>
                    {deltaSign}{delta}
                </span>
            )}
        </div>
    );
}
