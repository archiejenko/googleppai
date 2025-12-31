import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Clock, Award, TrendingUp, CheckCircle, Lock } from 'lucide-react';

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

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner':
                return 'bg-status-success/20 text-status-success border-status-success/30';
            case 'intermediate':
                return 'bg-status-warning/20 text-status-warning border-status-warning/30';
            case 'advanced':
                return 'bg-status-danger/20 text-status-danger border-status-danger/30';
            default:
                return 'bg-[rgb(var(--text-muted))/20] text-[rgb(var(--text-muted))] border-[rgb(var(--text-muted))/30]';
        }
    };

    const getStatusIcon = (module: LearningModule) => {
        const progress = module.userProgress[0];
        if (!progress || progress.status === 'not_started') {
            return <Lock className="h-5 w-5 text-[rgb(var(--text-muted))]" />;
        }
        if (progress.status === 'completed') {
            return <CheckCircle className="h-5 w-5 text-status-success" />;
        }
        return <TrendingUp className="h-5 w-5 text-status-warning" />;
    };

    const handleStartModule = async (moduleId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: user.id,
                    module_id: moduleId,
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, module_id' })
                .select();

            if (error) throw error;

            navigate(`/training?moduleId=${moduleId}`);
        } catch (error) {
            console.error('Failed to start module', error);
        }
    };

    if (loading) {
        return (
            <div className="layout-shell flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[rgb(var(--border-default))] border-t-[rgb(var(--accent-primary))]"></div>
            </div>
        );
    }

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12 animate-in-up">
                    <h1 className="text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-3">
                        Learning Path
                    </h1>
                    <p className="text-[rgb(var(--text-secondary))] text-lg">
                        Follow curated modules to master sales techniques
                    </p>
                </div>

                {/* Modules Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module, index) => {
                        const progress = module.userProgress[0];
                        const isLocked = module.prerequisites.length > 0 && !progress;
                        const isCompleted = progress?.status === 'completed';
                        const isInProgress = progress?.status === 'in_progress';

                        return (
                            <div
                                key={module.id}
                                className={`card-os p-6 animate-in-up flex flex-col ${isLocked ? 'opacity-60' : ''}`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getDifficultyColor(module.difficulty)}`}>
                                        {module.difficulty}
                                    </div>
                                    {getStatusIcon(module)}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">
                                    {module.title}
                                </h3>

                                {/* Description */}
                                <p className="text-[rgb(var(--text-muted))] text-sm mb-4 line-clamp-2 flex-grow">
                                    {module.description}
                                </p>

                                {/* Meta Info */}
                                <div className="flex items-center gap-4 mb-4 text-sm text-[rgb(var(--text-secondary))]">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{module.estimatedTime} min</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Award className="h-4 w-4 text-status-warning" />
                                        <span>{module.xpReward} XP</span>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div className="mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        {module.skills.slice(0, 3).map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-[rgb(var(--accent-primary)/0.1)] border border-[rgb(var(--accent-primary)/0.2)] rounded text-xs text-[rgb(var(--accent-primary))]"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {module.skills.length > 3 && (
                                            <span className="px-2 py-1 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded text-xs text-[rgb(var(--text-muted))]">
                                                +{module.skills.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {isInProgress && progress && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))] mb-1">
                                            <span>Progress</span>
                                            <span>{progress.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-[rgb(var(--bg-surface-raised))] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[rgb(var(--accent-primary))] transition-all duration-500"
                                                style={{ width: `${progress.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    onClick={() => handleStartModule(module.id)}
                                    disabled={isLocked}
                                    className={`w-full py-2.5 px-4 rounded-[var(--radius-md)] font-medium transition-all ${isLocked
                                        ? 'bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] cursor-not-allowed border border-[rgb(var(--border-default))]'
                                        : isCompleted
                                            ? 'bg-status-success/10 border border-status-success/30 text-status-success hover:bg-status-success/20'
                                            : isInProgress
                                                ? 'bg-status-warning/10 border border-status-warning/30 text-status-warning hover:bg-status-warning/20'
                                                : 'btn-primary'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        {isLocked
                                            ? 'Locked'
                                            : isCompleted
                                                ? 'Review Module'
                                                : isInProgress
                                                    ? 'Continue'
                                                    : 'Start Module'}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {modules.length === 0 && (
                    <div className="card-os text-center py-16">
                        <BookOpen className="h-16 w-16 text-[rgb(var(--text-muted))] mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] mb-2">No modules available</h3>
                        <p className="text-[rgb(var(--text-muted))]">Check back later for new learning content!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
