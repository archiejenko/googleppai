export type MEDDICKey = 'Metrics' | 'EconomicBuyer' | 'DecisionCriteria' | 'DecisionProcess' | 'IdentifyPain' | 'Champion';
export type MEDDICStatus = 'known' | 'partial' | 'unknown';
export type MEDDICReadinessState = Record<MEDDICKey, MEDDICStatus>;

const MEDDIC_ITEMS: { key: MEDDICKey; label: string; abbr: string }[] = [
    { key: 'Metrics',          label: 'Metrics',           abbr: 'M' },
    { key: 'EconomicBuyer',    label: 'Economic Buyer',    abbr: 'E' },
    { key: 'DecisionCriteria', label: 'Decision Criteria', abbr: 'D' },
    { key: 'DecisionProcess',  label: 'Decision Process',  abbr: 'D' },
    { key: 'IdentifyPain',     label: 'Identify Pain',     abbr: 'I' },
    { key: 'Champion',         label: 'Champion',          abbr: 'C' },
];

const STATUS_CYCLE: MEDDICStatus[] = ['unknown', 'partial', 'known'];

const STATUS_STYLES: Record<MEDDICStatus, { dot: string; label: string; text: string }> = {
    known:   { dot: 'bg-green-500',  label: 'Known',   text: 'text-green-400' },
    partial: { dot: 'bg-amber-400',  label: 'Partial', text: 'text-amber-400' },
    unknown: { dot: 'bg-red-500',    label: 'Unknown', text: 'text-red-400' },
};

interface MEDDICReadinessProps {
    value: MEDDICReadinessState;
    onChange: (v: MEDDICReadinessState) => void;
}

export default function MEDDICReadiness({ value, onChange }: MEDDICReadinessProps) {
    const cycle = (key: MEDDICKey) => {
        const current = value[key];
        const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
        onChange({ ...value, [key]: next });
    };

    return (
        <div className="bg-bg-surface border border-[#2a2a2e] p-5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-4">
                MEDDIC Readiness
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MEDDIC_ITEMS.map(({ key, label, abbr }) => {
                    const status = value[key];
                    const s = STATUS_STYLES[status];
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => cycle(key)}
                            className="flex items-center gap-2.5 px-3 py-2.5 bg-bg-canvas border border-[#2a2a2e] hover:border-[#3a3a3e] transition-colors text-left group"
                            title="Click to cycle: unknown → partial → known"
                        >
                            <span className="text-[10px] font-black text-accent w-3 shrink-0">{abbr}</span>
                            <div className={`w-1.5 h-1.5 shrink-0 ${s.dot}`} />
                            <span className="text-xs font-black text-text-secondary flex-1 truncate">{label}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${s.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                {s.label}
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="text-[9px] text-text-muted mt-3 tracking-wide">
                Click each field to cycle status — <span className="text-red-400">red</span> = unknown · <span className="text-amber-400">amber</span> = partial · <span className="text-green-400">green</span> = known
            </p>
        </div>
    );
}
