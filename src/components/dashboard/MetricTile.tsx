import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricTileProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number;
    trendUnit?: string;
    trendLabel?: string;
    isPositive?: boolean;
    delay?: number;
}

export default function MetricTile({ label, value, icon: _, trend, trendUnit = '%', trendLabel, isPositive = true }: MetricTileProps) {
    const showTrend = trend !== undefined && trend !== null;
    const positive = isPositive && (trend ?? 0) >= 0;

    return (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
            <div className="stat-label">{label}</div>
            <div className="flex items-end justify-between mt-1.5">
                <div className="stat-value text-[rgb(var(--text-primary))]">{value}</div>
                {showTrend && (
                    <div className={`flex items-center text-[11px] font-semibold ${positive ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                        {positive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {Math.abs(trend!)}{trendUnit}
                    </div>
                )}
            </div>
            {trendLabel && (
                <div className="text-[10px] text-[rgb(var(--text-muted))] mt-1">{trendLabel}</div>
            )}
        </div>
    );
}
