import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricTileProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    trendLabel?: string;
    isPositive?: boolean;
}

export default function MetricTile({ label, value, icon: Icon, trend, trendLabel, isPositive = true }: MetricTileProps) {
    return (
        <div className="card-os p-5 flex flex-col justify-between h-full hover:border-[rgb(var(--border-subtle))] group">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--accent-primary))] transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <div className={`flex items-center text-xs font-medium ${isPositive ? 'text-status-success' : 'text-status-danger'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {trend}%
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-3xl font-display font-bold text-[rgb(var(--text-primary))] mb-1">
                    {value}
                </h3>
                <p className="text-sm text-[rgb(var(--text-muted))] flex items-center justify-between">
                    {label}
                    {trendLabel && <span className="opacity-60 text-xs">{trendLabel}</span>}
                </p>
            </div>
        </div>
    );
}
