import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import KineticCard from '../kinetic/KineticCard';

interface MetricTileProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    trendLabel?: string;
    isPositive?: boolean;
    delay?: number;
}

export default function MetricTile({ label, value, icon: Icon, trend, trendLabel, isPositive = true, delay = 0 }: MetricTileProps) {
    return (
        <KineticCard delay={delay} className="p-6 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-bg-canvas text-text-secondary group-hover:text-accent transition-colors duration-300">
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <div className={`flex items-center text-xs font-bold tracking-tight ${isPositive ? 'text-status-success' : 'text-status-danger'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {trend}%
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">
                    {value}
                </h3>
                <div className="text-xs text-text-muted flex items-center justify-between font-medium">
                    <span className="uppercase tracking-[0.1em]">{label}</span>
                    {trendLabel && <span className="opacity-60">{trendLabel}</span>}
                </div>
            </div>
        </KineticCard>
    );
}
