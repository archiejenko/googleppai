import MEDDICLive from './MEDDICLive';
import ObjectionTracker, { type TrackedObjection } from './ObjectionTracker';

interface IntelPanelProps {
    meddic: Record<string, number>;
    objections: TrackedObjection[];
}

export default function IntelPanel({ meddic, objections }: IntelPanelProps) {
    return (
        <div className="flex flex-col h-full bg-bg-surface border-l border-[#2a2a2e] overflow-y-auto">
            <div className="p-4 border-b border-[#2a2a2e]">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted">
                    Live Intel
                </p>
            </div>

            <div className="p-4 border-b border-[#2a2a2e]">
                <MEDDICLive progress={meddic} />
            </div>

            <div className="p-4">
                <ObjectionTracker objections={objections} />
            </div>
        </div>
    );
}
