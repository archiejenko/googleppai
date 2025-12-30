import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const data = [
    { day: 'Mon', score: 65 },
    { day: 'Tue', score: 72 },
    { day: 'Wed', score: 68 },
    { day: 'Thu', score: 75 },
    { day: 'Fri', score: 82 },
    { day: 'Sat', score: 85 },
    { day: 'Sun', score: 88 },
];

export default function TeamDeltaChart() {
    return (
        <div className="card-os p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))]">
                    Performance Trend
                </h3>
                <select className="bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] text-xs rounded-md px-2 py-1 focus:outline-none">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                </select>
            </div>

            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="rgb(var(--accent-primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="rgb(var(--accent-primary))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--border-subtle))" />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgb(var(--bg-surface-raised))',
                                borderColor: 'rgb(var(--border-default))',
                                borderRadius: '12px',
                                color: 'rgb(var(--text-primary))'
                            }}
                            cursor={{ stroke: 'rgb(var(--border-default))', strokeWidth: 1 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="rgb(var(--accent-primary))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
