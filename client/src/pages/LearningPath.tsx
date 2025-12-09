import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
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

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const response = await api.get('/learning/modules');
                setModules(response.data);
            } catch (error) {
                console.error('Failed to fetch learning modules', error);
            } finally {
                setLoading(false);
            }
        };
        fetchModules();
    }, []);

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
            return <Lock className="h-5 w-5 text-gray-400" />;
        }
        if (progress.status === 'completed') {
            return <CheckCircle className="h-5 w-5 text-green-400" />;
        }
        return <TrendingUp className="h-5 w-5 text-yellow-400" />;
    };

    const handleStartModule = async (moduleId: string) => {
        try {
            await api.post(`/learning/modules/${moduleId}/start`);
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
                    <div className="absolute inset-0 bg-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-purple-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-extrabold text-white mb-2">
                        Learning Path
                    </h1>
                    <p className="text-gray-300 text-lg">
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
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {module.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                                    {module.description}
                                </p>

                                {/* Meta Info */}
                                <div className="flex items-center gap-4 mb-4 text-sm text-gray-300">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{module.estimatedTime} min</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Award className="h-4 w-4 text-yellow-400" />
                                        <span>{module.xpReward} XP</span>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div className="mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        {module.skills.slice(0, 3).map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {module.skills.length > 3 && (
                                            <span className="px-2 py-1 bg-white/5 border border-white/20 rounded text-xs text-gray-300">
                                                +{module.skills.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {isInProgress && progress && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                                            <span>Progress</span>
                                            <span>{progress.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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
                                            ? 'bg-white/5 text-gray-400 cursor-not-allowed'
                                            : isCompleted
                                                ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                                                : isInProgress
                                                    ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30'
                                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105'
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
                        <BookOpen className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No modules available</h3>
                        <p className="text-gray-300">Check back later for new learning content!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
