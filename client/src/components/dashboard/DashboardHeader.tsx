import { Play, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
    userName?: string;
}

export default function DashboardHeader({ userName = "Archie" }: DashboardHeaderProps) {
    return (
        <div className="relative mb-8 p-6 rounded-[var(--radius-lg)] bg-[rgb(var(--bg-surface-raised))] overflow-hidden border border-[rgb(var(--border-default))] group">

            {/* Background Gradient & Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--accent-primary)/0.05)] to-transparent opacity-50" />

            {/* Aceternity Signature: Animated Border/Divider */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgb(var(--accent-primary))] to-transparent opacity-50" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgb(var(--accent-primary)/0.1)] border border-[rgb(var(--accent-primary)/0.2)] mb-3">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--accent-primary))] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgb(var(--accent-primary))]"></span>
                        </span>
                        <span className="text-xs font-medium text-[rgb(var(--accent-primary))] uppercase tracking-wider">Live Coaching</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">
                        Welcome back, {userName}
                    </h1>
                    <p className="text-[rgb(var(--text-muted))] max-w-xl">
                        You're on a <span className="text-[rgb(var(--text-primary))] font-medium">3-day streak</span>. Complete your daily drill to maintain momentum.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/analysis" className="btn-ghost">
                        Review Stats
                    </Link>
                    <Link to="/active-training" className="btn-primary flex items-center gap-2">
                        <Play className="w-4 h-4 fill-current" />
                        Start Session
                    </Link>
                </div>
            </div>
        </div>
    );
}
