import { TrendingUp, TrendingDown, Zap, BarChart3, Target } from 'lucide-react';
import KineticCard from '../kinetic/KineticCard';
import { motion } from 'framer-motion';

interface MomentumData {
    sessions_this_week: number;
    momentum_score: number;
    trend: 'up' | 'down';
    score_diff: number;
    streak_count: number;
    skill_level_up?: boolean;
}

interface PerformanceMomentumProps {
    data: MomentumData;
    delay?: number;
}

export default function PerformanceMomentum({ data, delay = 0 }: PerformanceMomentumProps) {
    const isPositive = data.trend === 'up';

    return (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#FF6B6B] fill-current" />
                    <h3 className="card-title !mb-0">Performance Momentum</h3>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${isPositive ? 'pill-green' : 'pill-coral'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{Math.round(data.score_diff)}% vs LW
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg">
                    <div className="stat-label">Weekly Volume</div>
                    <div className="stat-value text-[rgb(var(--text-primary))] text-xl">
                        {data.sessions_this_week}
                        <span className="text-[10px] text-[rgb(var(--text-muted))] font-normal ml-1">sessions</span>
                    </div>
                </div>
                <div className="p-3 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg relative overflow-hidden">
                    <div className="stat-label">Active Streak</div>
                    <div className="stat-value text-[rgb(var(--text-primary))] text-xl">
                        {data.streak_count}
                        <span className="text-[10px] text-[rgb(var(--text-muted))] font-normal ml-1">days</span>
                    </div>
                    {data.streak_count >= 3 && (
                        <div className="absolute top-1 right-1">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <Zap className="w-3 h-3 text-[#FBBF24] fill-[#FBBF24] opacity-50" />
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="stat-label !mb-0">Skill Progress</span>
                    <span className="text-[#FF6B6B] font-semibold">82% to Level Up</span>
                </div>
                <div className="h-bar">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '82%' }}
                        transition={{ duration: 1, delay: delay + 0.5 }}
                        className="h-bar-fill"
                        style={{ background: '#FF6B6B' }}
                    />
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 p-2 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-lg flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 text-[rgb(var(--text-muted))]" />
                        <span className="text-[10px] text-[rgb(var(--text-secondary))]">Beating personal best in Discovery</span>
                    </div>
                    {data.skill_level_up && (
                        <div className="flex items-center gap-1 text-[#4ADE80] font-bold text-[10px] font-display animate-pulse">
                            <Target className="w-3 h-3" />
                            LEVEL UP!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
