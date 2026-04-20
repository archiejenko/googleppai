import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTier } from '../../context/TierContext';
import { supabase } from '../../utils/supabase';

interface CoachingRecommendation {
    title: string;
    detail: string;
    drill_type: string;
    priority: number;
}

interface RepCoachingProfile {
    user_id: string;
    primary_gap: string;
    top_recommendation: string;
    recommendations: CoachingRecommendation[];
    delivery_gap_score: number | null;
    readiness_gap_score: number | null;
}

interface RepRow {
    userId: string;
    name: string;
    coaching: RepCoachingProfile | null;
    deliveryGap: number | null;
    readinessGap: number | null;
}

const GAP_BADGE_COLORS: Record<string, string> = {
    delivery: 'text-status-warning',
    readiness: 'text-status-error',
    both: 'text-status-error',
    none: 'text-status-success',
};

export default function ManagerCoachingView() {
    const { isAdmin } = useAuth();
    const { org } = useTier();
    const [reps, setReps] = useState<RepRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalRep, setModalRep] = useState<RepRow | null>(null);
    const [dispatching, setDispatching] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin || !org?.id) return;
        (async () => {
            setLoading(true);

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('org_id', org.id);

            if (!profiles || profiles.length === 0) {
                setLoading(false);
                return;
            }

            const userIds = profiles.map(p => p.id);

            const { data: coachingRows } = await supabase
                .from('rep_coaching_profiles')
                .select('*')
                .in('user_id', userIds)
                .order('generated_at', { ascending: false });

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: gapRows } = await supabase
                .from('transfer_gap_scores')
                .select('user_id, delivery_gap_score, readiness_gap_score')
                .in('user_id', userIds)
                .gte('computed_at', thirtyDaysAgo)
                .order('computed_at', { ascending: false });

            const coachingMap = new Map<string, RepCoachingProfile>();
            for (const row of coachingRows ?? []) {
                if (!coachingMap.has(row.user_id)) {
                    coachingMap.set(row.user_id, row as RepCoachingProfile);
                }
            }

            const gapMap = new Map<string, { delivery: number | null; readiness: number | null }>();
            for (const row of gapRows ?? []) {
                if (!gapMap.has(row.user_id)) {
                    gapMap.set(row.user_id, {
                        delivery: row.delivery_gap_score,
                        readiness: row.readiness_gap_score,
                    });
                }
            }

            const rows: RepRow[] = profiles.map(p => ({
                userId: p.id,
                name: p.full_name || p.email || p.id.slice(0, 8),
                coaching: coachingMap.get(p.id) ?? null,
                deliveryGap: gapMap.get(p.id)?.delivery ?? null,
                readinessGap: gapMap.get(p.id)?.readiness ?? null,
            }));

            setReps(rows);
            setLoading(false);
        })();
    }, [isAdmin, org?.id]);

    if (!isAdmin) return null;

    const assignDrill = async (rep: RepRow, rec: CoachingRecommendation) => {
        setDispatching(rec.title);
        try {
            await supabase.from('dispatched_drills').insert({
                user_id: rep.userId,
                focus_area: rec.drill_type,
                drill_type: rec.drill_type,
                weakness_identified: rec.detail,
                context: `Assigned by manager: ${rec.title}`,
                difficulty: 'medium',
            });
        } catch (e) {
            console.error('[ManagerCoaching] drill dispatch error:', e);
        } finally {
            setDispatching(null);
        }
    };

    return (
        <div className="card-os border border-border p-6 space-y-5">
            <h2 className="font-display text-lg text-text-primary uppercase tracking-wider">Team Coaching Overview</h2>

            {loading && <div className="h-32 bg-bg-raised animate-pulse" />}

            {!loading && reps.length === 0 && (
                <p className="text-sm text-text-muted">No team members found.</p>
            )}

            {!loading && reps.length > 0 && (
                <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_80px_auto_60px_60px_80px] gap-2 text-[10px] uppercase tracking-widest text-text-muted border-b border-border pb-2">
                        <span>Rep</span>
                        <span>Gap</span>
                        <span>Top Recommendation</span>
                        <span className="text-right">Del.</span>
                        <span className="text-right">Ready.</span>
                        <span />
                    </div>
                    {reps.map(rep => (
                        <div key={rep.userId} className="grid grid-cols-[1fr_80px_auto_60px_60px_80px] gap-2 items-center text-sm border-b border-border py-2">
                            <span className="text-text-primary truncate">{rep.name}</span>
                            <span className={`text-[10px] uppercase tracking-widest ${GAP_BADGE_COLORS[rep.coaching?.primary_gap ?? 'none'] ?? 'text-text-muted'}`}>
                                {rep.coaching?.primary_gap ?? 'n/a'}
                            </span>
                            <span className="text-xs text-text-muted truncate" title={rep.coaching?.top_recommendation ?? ''}>
                                {rep.coaching?.top_recommendation
                                    ? rep.coaching.top_recommendation.slice(0, 80) + (rep.coaching.top_recommendation.length > 80 ? '...' : '')
                                    : 'No coaching profile'}
                            </span>
                            <span className="text-right font-mono text-xs text-text-primary">
                                {rep.deliveryGap !== null ? Math.round(rep.deliveryGap) : '-'}
                            </span>
                            <span className="text-right font-mono text-xs text-text-primary">
                                {rep.readinessGap !== null ? Math.round(rep.readinessGap) : '-'}
                            </span>
                            <button
                                onClick={() => setModalRep(rep)}
                                disabled={!rep.coaching?.recommendations?.length}
                                className="btn-ghost text-[10px] uppercase tracking-widest px-2 py-1 disabled:opacity-30"
                            >
                                Assign Drill
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {modalRep && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="card-os border border-border p-6 space-y-4 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm text-text-primary">Assign drill to {modalRep.name}</h3>
                            <button onClick={() => setModalRep(null)} className="text-text-muted hover:text-text-primary">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(modalRep.coaching?.recommendations ?? []).slice(0, 3).map((rec, i) => (
                                <div key={i} className="card-os border border-border p-4 space-y-2">
                                    <p className="text-sm text-text-primary">{rec.title}</p>
                                    <p className="text-xs text-text-muted">{rec.detail}</p>
                                    <button
                                        onClick={() => assignDrill(modalRep, rec)}
                                        disabled={dispatching === rec.title}
                                        className="btn-ghost text-[10px] uppercase tracking-widest px-3 py-1.5 border border-accent text-accent"
                                    >
                                        {dispatching === rec.title ? 'Assigning...' : 'Assign'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
