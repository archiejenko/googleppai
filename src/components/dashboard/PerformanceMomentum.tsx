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
        <KineticCard delay={delay} className="p-6 h-full flex flex-col justify-between bg-gradient-to-br from-[rgb(var(--bg-surface-raised))] to-[rgb(var(--bg-surface))]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[rgb(var(--accent-primary)/0.1)] text-[rgb(var(--accent-primary))]">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <h3 className="font-display font-bold text-[rgb(var(--text-primary))]">Performance Momentum</h3>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPositive ? 'bg-status-success/10 text-status-success' : 'bg-status-danger/10 text-status-danger'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{Math.round(data.score_diff)}% vs LW
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))]">
                    <div className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Weekly Volume</div>
                    <div className="text-2xl font-bold text-[rgb(var(--text-primary))] flex items-baseline gap-2">
                        {data.sessions_this_week}
                        <span className="text-xs text-[rgb(var(--text-muted))] font-medium">Sessions</span>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] relative overflow-hidden">
                    <div className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-1">Active Streak</div>
                    <div className="text-2xl font-bold text-[rgb(var(--text-primary))] flex items-baseline gap-2">
                        {data.streak_count}
                        <span className="text-xs text-[rgb(var(--text-muted))] font-medium">Days</span>
                    </div>
                    {data.streak_count >= 3 && (
                        <div className="absolute top-0 right-0 p-1">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <Zap className="w-3 h-3 text-amber-500 fill-amber-500 opacity-50" />
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-[rgb(var(--text-muted))] font-bold uppercase tracking-tighter">Skill Progress</span>
                    <span className="text-[rgb(var(--accent-primary))] font-bold">82% to Level Up</span>
                </div>
                <div className="h-2 w-full bg-[rgb(var(--bg-canvas))] rounded-full overflow-hidden border border-[rgb(var(--border-subtle))]">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '82%' }}
                        transition={{ duration: 1, delay: delay + 0.5 }}
                        className="h-full bg-gradient-to-r from-[rgb(var(--accent-primary))] to-[rgb(var(--accent-secondary))]"
                    />
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 p-2 rounded-lg bg-[rgb(var(--bg-canvas)/0.5)] border border-[rgb(var(--border-subtle))] flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 text-[rgb(var(--text-muted))]" />
                        <span className="text-[10px] text-[rgb(var(--text-secondary))] font-medium">Beating personal best in Discovery</span>
                    </div>
                    {data.skill_level_up && (
                        <div className="flex items-center gap-1 text-status-success font-bold text-[10px] animate-pulse">
                            <Target className="w-3 h-3" />
                            LEVEL UP!
                        </div>
                    )}
                </div>
            </div>
        </KineticCard>
    );
}
