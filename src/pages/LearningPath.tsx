import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Lock, CheckCircle2, PlayCircle, Star, Clock } from 'lucide-react';
import KineticButton from '../components/kinetic/KineticButton';
import KineticCard from '../components/kinetic/KineticCard';
import NyroTextReveal from '../components/kinetic/NyroTextReveal';

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

export default function LearningPath() {
    const navigate = useNavigate();
    const [modules, setModules] = useState<LearningModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const { user } = useAuth();

    const { scrollYProgress } = useScroll();
    const scaleY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

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

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-bg-canvas">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-border-default border-t-accent"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center py-32 px-6 bg-bg-canvas min-h-screen relative overflow-hidden text-text-primary">
            {/* Animated SVG Path Line */}
            <div className="absolute top-[300px] left-1/2 -translate-x-1/2 w-1 bottom-40 pointer-events-none z-0">
                <div className="w-full h-full bg-border-default/20 rounded-full" />
                <motion.div
                    className="absolute top-0 w-full bg-gradient-to-b from-accent to-accent-secondary rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    style={{ height: '100%', scaleY, originY: 0 }}
                />
            </div>

            <div className="text-center mb-32 relative z-10 max-w-2xl">
                <NyroTextReveal
                    text="Your Sales Journey"
                    className="text-4xl md:text-5xl font-bold mb-6 justify-center"
                />
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-text-secondary text-lg font-light leading-relaxed"
                >
                    Master each level to unlock higher XP and Elite scenarios. Follow the roadmap to become an OAST Elite Closer.
                </motion.p>
            </div>

            <div className="flex flex-col items-center w-full max-w-4xl space-y-32 relative z-10 pb-40">
                {modules.map((module, index) => {
                    const progress = module.userProgress[0];
                    const isCompleted = progress?.status === 'completed';
                    const isCurrent = !isCompleted && (index === 0 || (index > 0 && modules[index - 1].userProgress[0]?.status === 'completed'));
                    const isLocked = !isCompleted && !isCurrent;

                    return (
                        <div key={module.id} className="relative flex flex-col items-center w-full">
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ margin: "-100px" }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                className="w-full flex flex-col items-center"
                            >
                                <KineticCard
                                    className={`
                                        p-10 w-72 md:w-96 text-center
                                        ${isCurrent ? 'ring-2 ring-accent border-accent/20' : ''}
                                        ${isLocked ? 'opacity-50 grayscale' : ''}
                                    `}
                                >
                                    <div className="mb-6 flex justify-center">
                                        {isCompleted ? (
                                            <div className="w-14 h-14 bg-status-success/10 rounded-2xl flex items-center justify-center">
                                                <CheckCircle2 className="text-status-success w-8 h-8" />
                                            </div>
                                        ) : isCurrent ? (
                                            <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center">
                                                <PlayCircle className="text-accent w-8 h-8 animate-pulse" />
                                            </div>
                                        ) : (
                                            <div className="w-14 h-14 bg-bg-canvas/50 rounded-2xl flex items-center justify-center">
                                                <Lock className="text-text-muted w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    <span className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-3 block ${isCurrent ? 'text-accent' : 'text-text-muted'}`}>
                                        Level {index + 1}: {module.difficulty}
                                    </span>

                                    <h4 className="font-bold text-2xl mb-4 leading-tight text-text-primary">{module.title}</h4>

                                    <div className="flex items-center justify-center gap-3 px-5 py-2.5 bg-bg-canvas/50 rounded-full border border-border-default mb-6">
                                        <Star className={`w-4 h-4 ${isCompleted ? 'text-status-warning fill-status-warning' : 'text-text-muted'}`} />
                                        <span className={`text-xs font-bold tracking-tight ${isCurrent ? 'text-accent' : 'text-text-primary'}`}>{module.xpReward} XP REWARD</span>
                                    </div>

                                    <p className="text-text-secondary text-xs font-light leading-relaxed mb-8 px-4">
                                        {module.description}
                                    </p>

                                    {!isLocked && (
                                        <KineticButton
                                            variant={isCurrent ? "primary" : "outline"}
                                            onClick={() => handleStartModule(module.id)}
                                            className="w-full py-4 text-sm font-bold"
                                        >
                                            {isCompleted ? 'Review Content' : 'Enter Scenario'}
                                        </KineticButton>
                                    )}
                                </KineticCard>
                            </motion.div>
                        </div>
                    );
                })}
            </div>

            {/* Activity Timeline */}
            {activity.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-4xl mt-20 relative z-10"
                >
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-text-muted mb-4 text-center">
                        Recent Activity
                    </p>
                    <div className="space-y-2">
                        {activity.map(item => {
                            const score = item.metadata?.score as number | undefined;
                            return (
                                <div key={item.id} className="flex items-start gap-3 p-3 bg-bg-surface border border-border/40">
                                    <Clock className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-text-secondary truncate">{item.metadata?.description as string || item.activity_type}</p>
                                        <p className="text-[10px] text-text-muted mt-0.5">{relativeTime(item.created_at)}</p>
                                    </div>
                                    {score !== undefined && (
                                        <span
                                            className="text-xs font-black px-2 py-0.5 flex-shrink-0"
                                            style={{
                                                color: score >= 70 ? '#22c55e' : '#f59e0b',
                                                background: score >= 70 ? '#22c55e18' : '#f59e0b18',
                                            }}
                                        >
                                            {score}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
