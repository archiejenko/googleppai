import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
    userName?: string;
    streakCount?: number;
}

export default function DashboardHeader({ userName, streakCount }: DashboardHeaderProps) {
    const streak = streakCount ?? 0;

    return (
        <div>
            <div className="page-kicker">Overview</div>
            <div className="page-title">Dashboard</div>
            <div className="page-desc">
                {streak > 0 ? (
                    <>Welcome back, {userName || 'User'} — <span className="text-[rgb(var(--text-primary))] font-semibold">{streak}-day streak</span></>
                ) : (
                    <>Team performance overview and quick actions</>
                )}
            </div>
        </div>
    );
}
