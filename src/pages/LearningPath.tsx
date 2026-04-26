import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

interface ActivityItem {
    id: string;
    activity_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

function relativeTime(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

interface LearningModule {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: number;
    xpReward: number;
    skills: string[];
    prerequisites: string[];
    scenarioType: string;
    industry: string | null;
    order: number;
    userProgress: Array<{
        status: string;
        progress: number;
        score: number | null;
    }>;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Score colour: green >= 80, amber 60-79, coral < 60 */
function scoreColor(pct: number): string {
    if (pct >= 80) return '#4ADE80';
    if (pct >= 60) return '#FBBF24';
    return '#FF6B6B';
}

function scorePillClass(pct: number): string {
    if (pct >= 80) return 'pill pill-green';
    if (pct >= 60) return 'pill pill-amber';
    return 'pill pill-coral';
}

/** Map a difficulty or level index to a roadmap level colour */
function levelBorderColor(idx: number): string {
    if (idx <= 0) return '#4a5567'; // muted
    if (idx <= 2) return '#FBBF24'; // amber
    return '#4ADE80'; // green
}

/* ── Roadmap levels (static structure matching mockup) ───────────── */
const roadmapLevels = [
    { num: 1, name: 'Onboarding', desc: 'Introduction to core sales methodology, product knowledge, and platform familiarisation.', criteria: 'Unlock: Complete 5 sessions' },
    { num: 2, name: 'Foundation', desc: 'Build foundational skills in discovery, opening, and basic objection handling.', criteria: 'Unlock: Score 70%+ on all scenarios' },
    { num: 3, name: 'Competent', desc: 'Demonstrate consistent performance across multiple scenario types and handle complex objections.', criteria: 'Unlock: Pass 3 assessed drills with 80%+ avg' },
    { num: 4, name: 'Advanced', desc: 'Advanced negotiation, closing techniques, and ability to coach peers on fundamentals.', criteria: 'Unlock: Master 12 skills & maintain 85%+ for 2 weeks' },
    { num: 5, name: 'Elite', desc: 'Top-tier performer with mastery across all skill areas and minimal transfer gap.', criteria: 'Unlock: 90%+ avg score, <10% transfer gap, 15+ skills mastered' },
];

export default function LearningPath() {
    const navigate = useNavigate();
    const [modules, setModules] = useState<LearningModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        const fetchModules = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('learning_modules')
                    .select('*, userProgress:user_progress(*)')
                    .order('order', { ascending: true });

                if (error) throw error;

                const mappedModules = data.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    difficulty: m.difficulty,
                    estimatedTime: m.estimated_time,
                    xpReward: m.xp_reward,
                    skills: m.skills || [],
                    prerequisites: m.prerequisites || [],
                    scenarioType: m.scenario_type,
                    industry: m.industry,
                    order: m.order,
                    userProgress: m.userProgress.map((p: any) => ({
                        status: p.status,
                        progress: p.progress,
                        score: p.score
                    }))
                }));

                setModules(mappedModules);
            } catch (error) {
                console.error('Failed to fetch learning modules', error);
            } finally {
                setLoading(false);
            }
        };
        fetchModules();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('user_activity_log')
            .select('id, activity_type, metadata, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
            .then(({ data }) => { if (data) setActivity(data as ActivityItem[]); });
    }, [user]);

    const handleStartModule = (moduleId: string) => {
        navigate(`/training?moduleId=${moduleId}`);
    };

    /* ── Derived stats ────────────────────────────────────────────── */
    const completedCount = modules.filter(m => m.userProgress[0]?.status === 'completed').length;
    const totalCount = modules.length;
    const avgProgress = totalCount > 0
        ? Math.round(modules.reduce((sum, m) => sum + (m.userProgress[0]?.progress ?? 0), 0) / totalCount)
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-[rgb(var(--bg-canvas))]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[rgb(var(--border-default))] border-t-[#FF6B6B]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex justify-between items-start mb-5">
                <div>
                    <div className="page-kicker">Core</div>
                    <div className="page-title">Journey</div>
                    <div className="page-desc">Rep progression, milestones, and level advancement</div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Modules Complete</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">{completedCount}/{totalCount}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Avg Progress</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">{avgProgress}%</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Milestones Hit</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">{completedCount}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Activity Events</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">{activity.length}</div>
                </div>
            </div>

            {/* Journey Roadmap */}
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 mb-4">
                <div className="card-title">Journey Roadmap</div>

                {roadmapLevels.map((level, idx) => (
                    <div key={level.num}>
                        <div
                            className="flex items-stretch gap-3.5 p-3.5 bg-[#0a0e14] border border-[rgb(var(--border-default))] rounded-lg"
                            style={{ borderLeft: `3px solid ${levelBorderColor(idx)}` }}
                        >
                            <div className="font-display text-[22px] font-bold text-[rgb(var(--text-primary))] min-w-[28px] flex items-center justify-center">
                                {level.num}
                            </div>
                            <div className="flex-1">
                                <div className="font-display text-[13px] font-semibold uppercase tracking-[0.05em] text-[rgb(var(--text-primary))] mb-0.5">
                                    {level.name}
                                </div>
                                <div className="text-[11px] text-[rgb(var(--text-secondary))] mb-1 leading-[1.4]">
                                    {level.desc}
                                </div>
                                <div className="text-[10px] text-[rgb(var(--text-muted))] font-mono">
                                    {level.criteria}
                                </div>
                            </div>
                        </div>
                        {idx < roadmapLevels.length - 1 && (
                            <div className="flex justify-center h-5">
                                <div className="w-px h-full bg-[rgb(var(--border-default))]" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Module Progress Table */}
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 mb-4">
                <div className="card-title">Module Progress</div>
                {modules.length === 0 ? (
                    <p className="text-[12px] text-[rgb(var(--text-muted))]">No modules yet</p>
                ) : (
                    <table className="table-os">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Module</th>
                                <th>Difficulty</th>
                                <th>Progress</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {modules.map((mod, idx) => {
                                const prog = mod.userProgress[0];
                                const isCompleted = prog?.status === 'completed';
                                const isCurrent = !isCompleted && (idx === 0 || modules[idx - 1].userProgress[0]?.status === 'completed');
                                const isLocked = !isCompleted && !isCurrent;
                                const pct = prog?.progress ?? 0;
                                const score = prog?.score ?? null;

                                return (
                                    <tr key={mod.id} className={isLocked ? 'opacity-50' : ''}>
                                        <td className="font-display text-[12px] font-semibold text-[rgb(var(--text-secondary))]">
                                            {idx + 1}
                                        </td>
                                        <td>
                                            <div className="text-[rgb(var(--text-primary))] font-medium">{mod.title}</div>
                                            <div className="text-[10px] text-[rgb(var(--text-muted))]">{mod.scenarioType}</div>
                                        </td>
                                        <td className="font-display text-[12px] font-semibold text-[rgb(var(--text-secondary))]">
                                            {mod.difficulty}
                                        </td>
                                        <td style={{ minWidth: 120 }}>
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-1.5 rounded-[3px] bg-[rgb(var(--border-default))] flex-1 min-w-[80px]">
                                                    <div
                                                        className="h-full rounded-[3px]"
                                                        style={{ width: `${pct}%`, background: scoreColor(pct) }}
                                                    />
                                                </div>
                                                <span className="font-mono text-[10px] text-[rgb(var(--text-muted))] min-w-[28px]">{pct}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {score !== null ? (
                                                <span className={scorePillClass(score)}>{score}%</span>
                                            ) : (
                                                <span className="text-[rgb(var(--text-muted))] text-xs">&mdash;</span>
                                            )}
                                        </td>
                                        <td>
                                            {isCompleted && <span className="pill pill-green">Complete</span>}
                                            {isCurrent && <span className="pill pill-amber">In Progress</span>}
                                            {isLocked && <span className="text-[rgb(var(--text-muted))] text-[11px]">Locked</span>}
                                        </td>
                                        <td>
                                            {!isLocked && (
                                                <button
                                                    onClick={() => handleStartModule(mod.id)}
                                                    className="text-[12px] font-semibold text-[#FF6B6B] underline cursor-pointer hover:opacity-80"
                                                >
                                                    {isCompleted ? 'Review' : 'Start'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Recent Activity / Milestones */}
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                <div className="card-title">Recent Milestones</div>
                {activity.length === 0 ? (
                    <p className="text-[12px] text-[rgb(var(--text-muted))]">No activity yet</p>
                ) : (
                    activity.map((item) => {
                        const score = item.metadata?.score as number | undefined;
                        return (
                            <div key={item.id} className="flex gap-2.5 py-2.5 border-b border-[rgb(var(--border-default))] last:border-b-0">
                                <div
                                    className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                                    style={{ background: score !== undefined ? scoreColor(score) : '#60A5FA' }}
                                />
                                <div className="flex-1">
                                    <div className="text-[12px] text-[rgb(var(--text-secondary))]">
                                        {item.metadata?.description as string || item.activity_type}
                                        {score !== undefined && (
                                            <span className={`ml-2 ${scorePillClass(score)}`}>{score}%</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-[rgb(var(--text-muted))] font-mono">
                                        {relativeTime(item.created_at)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
