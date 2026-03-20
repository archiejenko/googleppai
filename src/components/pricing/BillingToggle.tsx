interface BillingToggleProps {
    value: 'monthly' | 'annual';
    onChange: (value: 'monthly' | 'annual') => void;
}

export default function BillingToggle({ value, onChange }: BillingToggleProps) {
    const isAnnual = value === 'annual';

    return (
        <div className="flex items-center justify-center">
            <div className="flex bg-transparent border border-white/20 p-1">
                <button
                    onClick={() => onChange('monthly')}
                    className={`px-6 py-2 text-sm tracking-widest uppercase transition-colors ${
                        !isAnnual
                            ? 'bg-[rgb(var(--accent-primary))] text-[#0a0e1a] font-bold'
                            : 'bg-transparent text-[rgb(var(--text-muted))] hover:text-white'
                    }`}
                    style={{ borderRadius: 0 }}
                >
                    Monthly
                </button>
                <button
                    onClick={() => onChange('annual')}
                    className={`px-6 py-2 text-sm tracking-widest uppercase flex items-center gap-2 transition-colors ${
                        isAnnual
                            ? 'bg-[rgb(var(--accent-primary))] text-[#0a0e1a] font-bold'
                            : 'bg-transparent text-[rgb(var(--text-muted))] hover:text-white'
                    }`}
                    style={{ borderRadius: 0 }}
                >
                    Annual
                    {isAnnual ? (
                        <span
                            className="text-[10px] px-1.5 py-0.5 bg-[#0a0e1a]/20 text-[#0a0e1a] tracking-widest font-black"
                            style={{ borderRadius: 0 }}
                        >
                            SAVE 15%
                        </span>
                    ) : (
                        <span
                            className="text-[10px] px-1.5 py-0.5 bg-white/10 text-[rgb(var(--text-primary))] tracking-widest"
                            style={{ borderRadius: 0 }}
                        >
                            SAVE 15%
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
