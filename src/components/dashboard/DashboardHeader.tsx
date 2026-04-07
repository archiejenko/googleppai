import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
    userName?: string;
    streakCount?: number;
}

export default function DashboardHeader({ userName, streakCount }: DashboardHeaderProps) {
    const streak = streakCount ?? 0;

    return (
        <div className="card-os p-6 border border-border-default">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/30 bg-accent/10 mb-3">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full bg-accent opacity-75" />
                            <span className="relative inline-flex h-2 w-2 bg-accent" />
                        </span>
                        <span className="text-xs text-accent uppercase tracking-wider">Live Coaching</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary mb-2">
                        Welcome back, {userName || 'User'}
                    </h1>
                    <p className="text-text-muted max-w-xl text-sm">
                        {streak > 0 ? (
                            <>You're on a <span className="text-text-primary font-bold">{streak}-day streak</span>. Complete your daily drill to maintain momentum.</>
                        ) : (
                            <>Complete your daily drill to start building your streak.</>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/analytics" className="btn-ghost">
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
