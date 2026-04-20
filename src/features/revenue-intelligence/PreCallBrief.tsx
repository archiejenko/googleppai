import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

interface CoachingRecommendation {
    title: string;
    detail: string;
    drill_type: string;
    priority: number;
}

interface CoachingProfile {
    primary_gap: string;
    top_recommendation: string;
    recommendations: CoachingRecommendation[];
    delivery_gap_score: number | null;
    readiness_gap_score: number | null;
}

interface TransferGapScores {
    talk_ratio_training: number | null;
    talk_ratio_live: number | null;
    discovery_training: number | null;
    discovery_live: number | null;
    delivery_gap_score: number | null;
    readiness_gap_score: number | null;
}

interface PreCallBriefProps {
    userId: string;
    upcomingCallContext?: string;
}

const BEHAVIOUR_MAP: Record<string, string> = {
    discovery: 'closed questions in the first 5 minutes',
    talk_ratio: 'speaking more than 60% of the call',
    objection_handling: 'not pausing after objections',
};

interface DimensionDelta {
    dimension: string;
    training: number;
    live: number;
    delta: number;
    behaviourHint: string;
}

export default function PreCallBrief({ userId, upcomingCallContext }: PreCallBriefProps) {
    const [callouts, setCallouts] = useState<DimensionDelta[]>([]);
    const [loading, setLoading] = useState(true);
    const [empty, setEmpty] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);

            const { data: coachingRows } = await supabase
                .from('rep_coaching_profiles')
                .select('*')
                .eq('user_id', userId)
                .order('generated_at', { ascending: false })
                .limit(1);

            const coaching = coachingRows?.[0] as CoachingProfile | undefined;

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: gapRows } = await supabase
                .from('transfer_gap_scores')
                .select('talk_ratio_training, talk_ratio_live, discovery_training, discovery_live, delivery_gap_score, readiness_gap_score')
                .eq('user_id', userId)
                .gte('computed_at', thirtyDaysAgo)
                .order('computed_at', { ascending: false })
                .limit(1);

            const gap = gapRows?.[0] as TransferGapScores | undefined;

            if (!gap && !coaching) {
                setEmpty(true);
                setLoading(false);
                return;
            }

            const dimensions: DimensionDelta[] = [];

            if (gap) {
                const pairs: Array<{ dimension: string; training: number | null; live: number | null }> = [
                    { dimension: 'Talk Ratio', training: gap.talk_ratio_training, live: gap.talk_ratio_live },
                    { dimension: 'Discovery', training: gap.discovery_training, live: gap.discovery_live },
                ];

                for (const p of pairs) {
                    if (p.training !== null && p.live !== null) {
                        dimensions.push({
                            dimension: p.dimension,
                            training: p.training,
                            live: p.live,
                            delta: p.training - p.live,
                            behaviourHint: '',
                        });
                    }
                }
            }

            dimensions.sort((a, b) => b.delta - a.delta);
            const top3 = dimensions.slice(0, 3);

            for (const d of top3) {
                const dimKey = d.dimension.toLowerCase().replace(/\s+/g, '_');
                if (coaching?.recommendations) {
                    const matchingRec = coaching.recommendations.find(
                        r => r.drill_type === dimKey || r.title.toLowerCase().includes(dimKey.replace('_', ' ')),
                    );
                    if (matchingRec) {
                        d.behaviourHint = matchingRec.detail;
                        continue;
                    }
                }
                d.behaviourHint = BEHAVIOUR_MAP[dimKey] ?? 'inconsistent execution compared to training';
            }

            if (top3.length === 0) {
                setEmpty(true);
            } else {
                setCallouts(top3);
            }
            setLoading(false);
        })();
    }, [userId]);

    if (loading) return <div className="h-16 bg-bg-raised animate-pulse" />;

    if (empty) {
        return (
            <p className="text-sm text-text-muted">
                Complete at least 3 training sessions and 3 live calls to generate your pre-call brief.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-display text-lg text-text-primary uppercase tracking-wider">Pre-Call Brief</h3>
                <p className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Based on your Transfer Gap data</p>
            </div>

            {upcomingCallContext && (
                <p className="text-sm text-accent">Preparing for: {upcomingCallContext}</p>
            )}

            <div className="space-y-3">
                {callouts.map(c => (
                    <div key={c.dimension} className="card-os border border-border p-4 space-y-1">
                        <p className="text-sm text-text-primary">{c.dimension}</p>
                        <p className="text-xs text-text-muted">
                            Your {c.dimension.toLowerCase()} scores {Math.round(c.training)} in training but {Math.round(c.live)} on live calls. Watch for {c.behaviourHint}.
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
