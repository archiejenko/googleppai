interface ObjectivePanelProps {
    value: string;
    onChange: (v: string) => void;
}

export default function ObjectivePanel({ value, onChange }: ObjectivePanelProps) {
    return (
        <div className="bg-bg-surface border border-[#2a2a2e] p-5 flex flex-col gap-4 h-full">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                Call Objective
            </h2>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="e.g. Qualify budget authority and confirm executive sponsor before next stage"
                rows={4}
                className="input-os text-sm resize-none flex-1 leading-relaxed"
            />
            {value.trim() && (
                <div className="flex items-start gap-2 pt-1 border-t border-[#2a2a2e]">
                    <div className="w-1.5 h-1.5 bg-accent shrink-0 mt-1" />
                    <p className="text-[10px] text-text-muted leading-relaxed">{value}</p>
                </div>
            )}
        </div>
    );
}
