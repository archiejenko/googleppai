interface ConfidenceRatingProps {
    value: number | null;
    onChange: (v: number) => void;
}

const LABELS: Record<number, string> = {
    1: 'Underprepared',
    2: 'Needs Work',
    3: 'Ready',
    4: 'Confident',
    5: 'Peak State',
};

export default function ConfidenceRating({ value, onChange }: ConfidenceRatingProps) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted shrink-0">
                Confidence
            </span>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        className={`w-9 h-9 text-sm font-black border transition-all ${
                            value === n
                                ? 'bg-accent text-white border-accent'
                                : value !== null && n <= value
                                ? 'bg-accent/20 border-accent/40 text-accent'
                                : 'bg-bg-canvas border-[#2a2a2e] text-text-muted hover:border-accent/40 hover:text-text-primary'
                        }`}
                    >
                        {n}
                    </button>
                ))}
            </div>
            {value !== null && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                    {LABELS[value]}
                </span>
            )}
        </div>
    );
}
