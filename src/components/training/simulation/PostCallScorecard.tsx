import { useNavigate } from 'react-router-dom';

interface PostCallScorecardProps {
    meddic: Record<string, number>;
    overallScore: number;
    transferGapDelta: number;
    coachingFlags: string[];
    pitchId?: string;
    onTrainAgain: () => void;
}

const MEDDIC_LABELS: Record<string, string> = {
    M: 'Metrics', E: 'Econ. Buyer', D: 'Decision Criteria',
    P: 'Decision Process', I: 'Identify Pain', C: 'Champion',
};

function ScoreBar({ label, pct }: { label: string; pct: number }) {
    const color = pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-500';
    return (
        <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-muted w-28 shrink-0">{label}</span>
            <div className="flex-1 h-1 bg-[#2a2a2e]">
                <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-text-secondary w-8 text-right">{pct}%</span>
        </div>
    );
}

export default function PostCallScorecard({
    meddic,
    overallScore,
    transferGapDelta,
    coachingFlags,
    pitchId,
    onTrainAgain,
}: PostCallScorecardProps) {
    const navigate = useNavigate();
    const deltaColor = transferGapDelta > 0 ? 'text-green-400' : transferGapDelta < 0 ? 'text-red-400' : 'text-text-muted';
    const deltaSign  = transferGapDelta > 0 ? '+' : '';

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0b] flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-lg space-y-8">

                {/* Header */}
                <div className="text-center space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-muted">
                        Session Complete
                    </p>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-text-primary">
                        Debrief
                    </h2>
                </div>

                {/* Overall + Transfer Gap */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-surface border border-[#2a2a2e] p-5 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
                            Overall Score
                        </p>
                        <span className="text-4xl font-mono font-black tabular-nums text-text-primary">
                            {overallScore}
                        </span>
                    </div>
                    <div className="bg-bg-surface border border-[#2a2a2e] p-5 text-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
                            Transfer Gap
                        </p>
                        <span className={`text-4xl font-mono font-black tabular-nums ${deltaColor}`}>
                            {deltaSign}{transferGapDelta}
                        </span>
                    </div>
                </div>

                {/* MEDDIC breakdown */}
                <div className="bg-bg-surface border border-[#2a2a2e] p-5 space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-text-muted">
                        MEDDIC Coverage
                    </h3>
                    {Object.entries(meddic).map(([key, pct]) => (
                        <ScoreBar key={key} label={MEDDIC_LABELS[key] ?? key} pct={pct} />
                    ))}
                </div>

                {/* Top coaching flags */}
                {coachingFlags.length > 0 && (
                    <div className="bg-bg-surface border border-[#2a2a2e] p-5 space-y-2">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-text-muted">
                            Top Coaching Flags
                        </h3>
                        {coachingFlags.slice(0, 3).map((flag, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-amber-400 shrink-0 mt-1" />
                                <p className="text-xs text-text-secondary leading-relaxed">{flag}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {pitchId && (
                        <button
                            onClick={() => navigate(`/pitch/${pitchId}`)}
                            className="flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] bg-accent text-white border border-accent hover:bg-accent/90 transition-colors"
                        >
                            View Full Report
                        </button>
                    )}
                    <button
                        onClick={onTrainAgain}
                        className="flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] bg-transparent text-text-secondary border border-[#2a2a2e] hover:border-accent/40 hover:text-text-primary transition-colors"
                    >
                        Train Again
                    </button>
                </div>

            </div>
        </div>
    );
}
