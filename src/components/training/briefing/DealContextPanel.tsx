interface DealContext {
    prospectName: string;
    prospectCompany: string;
    icpTier: 'A' | 'B' | 'C' | '';
    dealStage: string;
    estimatedArr: string;
}

interface DealContextPanelProps {
    value: DealContext;
    onChange: (v: DealContext) => void;
}

const DEAL_STAGES = ['Awareness', 'Discovery', 'Evaluation', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const ICP_TIERS: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

export default function DealContextPanel({ value, onChange }: DealContextPanelProps) {
    const set = (k: keyof DealContext, v: string) => onChange({ ...value, [k]: v });

    return (
        <div className="bg-bg-surface border border-[#2a2a2e] p-5 flex flex-col gap-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                Deal Context
            </h2>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                        Prospect Name
                    </label>
                    <input
                        type="text"
                        value={value.prospectName}
                        onChange={e => set('prospectName', e.target.value)}
                        placeholder="e.g. Jordan Walsh"
                        className="input-os text-sm py-2"
                    />
                </div>
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                        Company
                    </label>
                    <input
                        type="text"
                        value={value.prospectCompany}
                        onChange={e => set('prospectCompany', e.target.value)}
                        placeholder="e.g. Meridian Capital"
                        className="input-os text-sm py-2"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                        ICP Tier
                    </label>
                    <div className="flex gap-1">
                        {ICP_TIERS.map(tier => (
                            <button
                                key={tier}
                                type="button"
                                onClick={() => set('icpTier', value.icpTier === tier ? '' : tier)}
                                className={`flex-1 py-2 text-xs font-black border transition-colors ${
                                    value.icpTier === tier
                                        ? 'bg-accent text-white border-accent'
                                        : 'bg-bg-canvas border-[#2a2a2e] text-text-muted hover:border-accent/40'
                                }`}
                            >
                                {tier}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                        Deal Stage
                    </label>
                    <select
                        value={value.dealStage}
                        onChange={e => set('dealStage', e.target.value)}
                        className="input-os text-sm py-2"
                    >
                        <option value="">Select stage</option>
                        {DEAL_STAGES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                        Est. ARR
                    </label>
                    <input
                        type="text"
                        value={value.estimatedArr}
                        onChange={e => set('estimatedArr', e.target.value)}
                        placeholder="e.g. £120k"
                        className="input-os text-sm py-2"
                    />
                </div>
            </div>

            {(value.prospectName || value.prospectCompany) && (
                <div className="flex items-center gap-3 pt-1 border-t border-[#2a2a2e]">
                    <div className="w-1.5 h-1.5 bg-green-500 shrink-0" />
                    <span className="text-[10px] text-text-muted font-mono">
                        {[value.prospectName, value.prospectCompany].filter(Boolean).join(' — ')}
                        {value.icpTier && ` · ICP ${value.icpTier}`}
                        {value.dealStage && ` · ${value.dealStage}`}
                        {value.estimatedArr && ` · ${value.estimatedArr}`}
                    </span>
                </div>
            )}
        </div>
    );
}

export type { DealContext };
