export interface TrackedObjection {
    text: string;
    quality: 'green' | 'amber' | 'red';
}

interface ObjectionTrackerProps {
    objections: TrackedObjection[];
}

const QUALITY_STYLES: Record<TrackedObjection['quality'], { dot: string; label: string }> = {
    green: { dot: 'bg-green-500', label: 'Handled' },
    amber: { dot: 'bg-amber-400', label: 'Partial' },
    red:   { dot: 'bg-red-500',   label: 'Missed'  },
};

export default function ObjectionTracker({ objections }: ObjectionTrackerProps) {
    return (
        <div>
            <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-text-muted mb-3">
                Objections
            </h3>
            {objections.length === 0 ? (
                <p className="text-[10px] text-text-muted/50 italic">None raised yet</p>
            ) : (
                <div className="space-y-2">
                    {objections.map((obj, i) => {
                        const s = QUALITY_STYLES[obj.quality];
                        return (
                            <div key={i} className="flex items-start gap-2">
                                <div className={`w-1.5 h-1.5 shrink-0 mt-1 ${s.dot}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-text-secondary leading-relaxed truncate">
                                        {obj.text}
                                    </p>
                                    <span className={`text-[9px] font-black uppercase tracking-wider ${
                                        obj.quality === 'green' ? 'text-green-400' :
                                        obj.quality === 'amber' ? 'text-amber-400' : 'text-red-400'
                                    }`}>{s.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
