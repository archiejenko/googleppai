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
                // Fetch modules and user's specific progress
                // Relation is one-to-many, but filtered for this user
                // However, basic filtering in 'select' for nested resource is limited in JS client without exact syntax
                // "user_progress!inner(..)" would filter modules that HAVE progress. We want ALL modules.
                // "user_progress(..)" returns all progress for that module (for all users? No, RLS handles that!).
                // Since RLS is set to "Users can view own progress", simply asking for user_progress will ONLY return THIS user's progress.

                const { data, error } = await supabase
                    .from('learning_modules')
                    .select('*, userProgress:user_progress(*)')
                    .order('order', { ascending: true });

                if (error) throw error;

                // Map snake_case to camelCase and ensure userProgress is an array with mapped props
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
                return 'from-green-500 to-emerald-500';
            case 'intermediate':
                return 'from-yellow-500 to-amber-500';
            case 'advanced':
                return 'from-red-500 to-rose-500';
            default:
                return 'from-gray-500 to-gray-600';
        }
    };

    const getStatusIcon = (module: LearningModule) => {
        const progress = module.userProgress[0];
        if (!progress || progress.status === 'not_started') {
            return <Lock className="h-5 w-5 text-theme-muted" />;
        }
        if (progress.status === 'completed') {
            return <CheckCircle className="h-5 w-5 text-[rgb(var(--success))]" />;
        }
        return <TrendingUp className="h-5 w-5 text-[rgb(var(--warning))]" />;
    };

    const handleStartModule = async (moduleId: string) => {
        if (!user) return;
        try {
            // Upsert progress to 'in_progress' if not exists
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: user.id,
                    module_id: moduleId,
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, module_id' })
                .select(); // to ensure return?

            if (error) throw error;

            // Navigate to training with module context
            navigate(`/training?moduleId=${moduleId}`);
        } catch (error) {
            console.error('Failed to start module', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen gradient-dark-bg flex justify-center items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-[rgb(var(--accent-primary))] rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-[rgba(var(--border-color))] border-t-[rgb(var(--accent-primary))]"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-extrabold text-theme-primary mb-2">
                        Learning Path
                    </h1>
                    <p className="text-theme-muted text-lg">
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
                                className={`glass-card p-6 animate-fade-in-up ${isLocked ? 'opacity-60' : ''}`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${getDifficultyColor(module.difficulty)} text-white`}>
                                        {module.difficulty}
                                    </div>
                                    {getStatusIcon(module)}
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-theme-primary mb-2">
                                    {module.title}
                                </h3>

                                {/* Description */}
                                <p className="text-theme-muted text-sm mb-4 line-clamp-2">
                                    {module.description}
                                </p>

                                {/* Meta Info */}
                                <div className="flex items-center gap-4 mb-4 text-sm text-theme-muted">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{module.estimatedTime} min</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Award className="h-4 w-4 text-[rgb(var(--warning))]" />
                                        <span>{module.xpReward} XP</span>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div className="mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        {module.skills.slice(0, 3).map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-[rgba(var(--accent-primary),0.2)] border border-[rgba(var(--accent-primary),0.3)] rounded text-xs text-theme-accent"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {module.skills.length > 3 && (
                                            <span className="px-2 py-1 bg-[rgba(var(--glass-bg))] border border-[rgba(var(--border-color))] rounded text-xs text-theme-muted">
                                                +{module.skills.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {isInProgress && progress && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-xs text-theme-muted mb-1">
                                            <span>Progress</span>
                                            <span>{progress.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                                                style={{ width: `${progress.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    onClick={() => handleStartModule(module.id)}
                                    disabled={isLocked}
                                    className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${isLocked
                                        ? 'bg-[rgba(var(--glass-bg))] text-theme-muted cursor-not-allowed'
                                        : isCompleted
                                            ? 'bg-[rgba(var(--success),0.2)] border border-[rgba(var(--success),0.3)] text-[rgb(var(--success))] hover:bg-[rgba(var(--success),0.3)]'
                                            : isInProgress
                                                ? 'bg-[rgba(var(--warning),0.2)] border border-[rgba(var(--warning),0.3)] text-[rgb(var(--warning))] hover:bg-[rgba(var(--warning),0.3)]'
                                                : 'btn-gradient'
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
                    <div className="glass-card text-center py-16">
                        <BookOpen className="h-16 w-16 text-theme-accent mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-theme-primary mb-2">No modules available</h3>
                        <p className="text-theme-muted">Check back later for new learning content!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
