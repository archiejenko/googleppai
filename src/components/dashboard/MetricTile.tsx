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

export default function MetricTile({ label, value, icon: Icon, trend, trendUnit = '%', trendLabel, isPositive = true }: MetricTileProps) {
    const showTrend = trend !== undefined && trend !== null;
    const positive = isPositive && (trend ?? 0) >= 0;

    return (
        <div className="card-os p-6 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 border border-border-default bg-bg-canvas text-text-secondary">
                    <Icon className="w-5 h-5" />
                </div>
                {showTrend && (
                    <div className={`flex items-center text-xs font-bold tracking-tight ${positive ? 'text-status-success' : 'text-status-danger'}`}>
                        {positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(trend!)}{trendUnit}
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
        </div>
    );
}
