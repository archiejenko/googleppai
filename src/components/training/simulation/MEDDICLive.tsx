const MEDDIC_KEYS = [
    { key: 'M', label: 'Metrics' },
    { key: 'E', label: 'Econ. Buyer' },
    { key: 'D', label: 'Decision Criteria' },
    { key: 'P', label: 'Decision Process' },
    { key: 'I', label: 'Identify Pain' },
    { key: 'C', label: 'Champion' },
] as const;

interface MEDDICLiveProps {
    progress: Record<string, number>;
}

function statusDot(pct: number) {
    if (pct >= 75) return 'bg-green-500';
    if (pct >= 40) return 'bg-amber-400';
    return 'bg-red-500';
}

function statusText(pct: number): string {
    if (pct >= 75) return 'known';
    if (pct >= 40) return 'partial';
    return 'unknown';
}

export default function MEDDICLive({ progress }: MEDDICLiveProps) {
    return (
        <div>
            <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-text-muted mb-3">
                MEDDIC Status
            </h3>
            <div className="space-y-2">
                {MEDDIC_KEYS.map(({ key, label }) => {
                    const pct = progress[key] ?? 0;
                    return (
                        <div key={key} className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-accent w-3 shrink-0">{key}</span>
                            <div className={`w-1.5 h-1.5 shrink-0 ${statusDot(pct)}`} />
                            <span className="text-[10px] text-text-secondary flex-1 truncate">{label}</span>
                            <span className="text-[9px] font-mono tabular-nums text-text-muted">{pct}%</span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 pt-3 border-t border-[#2a2a2e]">
                <div className="flex items-center justify-between text-[9px] text-text-muted">
                    <span>Coverage</span>
                    <span className="font-mono tabular-nums">
                        {Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / 6)}%
                    </span>
                </div>
                <div className="mt-1.5 h-0.5 bg-[#2a2a2e]">
                    <div
                        className="h-full bg-accent transition-all duration-700"
                        style={{ width: `${Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / 6)}%` }}
                    />
                </div>
            </div>
            <div className="sr-only">
                {MEDDIC_KEYS.map(({ key, label }) => `${label}: ${statusText(progress[key] ?? 0)}`).join(', ')}
            </div>
        </div>
    );
}
