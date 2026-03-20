import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useCorrelationStats } from '../../hooks/useWinLoss'
import TierGate from '../../components/shared/TierGate'

const ACCENT = '#ff6b6b'
const MUTED = 'rgb(30 41 59)'

interface CorrelationInsightCardProps {
    userId?: string
    delay?: number
}

function StatTile({ label, value, sublabel, color }: { label: string; value: string | number; sublabel?: string; color?: string }) {
    return (
        <div className="bg-bg-raised border border-border p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">{label}</p>
            <p className={`text-2xl font-black ${color || 'text-text-primary'}`}>{value}</p>
            {sublabel && <p className="text-[10px] text-text-muted">{sublabel}</p>}
        </div>
    )
}

function InsightContent({ userId, days }: { userId: string; days: number }) {
    const { data: stats, isLoading } = useCorrelationStats(userId, days)

    if (isLoading) {
        return <div className="h-40 animate-pulse bg-bg-raised border border-border" />
    }

    if (!stats || stats.totalDeals === 0) {
        return (
            <div className="py-8 text-center space-y-2">
                <BarChart2 className="w-6 h-6 text-text-muted mx-auto" />
                <p className="text-sm text-text-secondary">No deal outcomes logged yet.</p>
                <p className="text-xs text-text-muted">Log won and lost deals to see your training ROI here.</p>
            </div>
        )
    }

    const delta = stats.winRateDelta
    const deltaColor = delta > 0 ? 'text-status-success' : delta < 0 ? 'text-status-danger' : 'text-text-muted'

    const chartData = [
        { label: 'Unprepped', winRate: stats.unpreppedWinRate, count: stats.unpreppedCount },
        { label: 'Prepped', winRate: stats.preppedWinRate, count: stats.preppedCount },
    ]

    return (
        <div className="space-y-5">
            {/* Headline stat */}
            {Math.abs(delta) >= 5 && (
                <div className="bg-bg-raised border border-border p-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-accent flex-shrink-0" />
                    <p className="text-sm text-text-primary">
                        Reps who completed deal-linked training had{' '}
                        <span className={`font-black ${deltaColor}`}>
                            {delta > 0 ? '+' : ''}{delta}%
                        </span>{' '}
                        higher win rate
                    </p>
                </div>
            )}

            {/* Win rate tiles */}
            <div className="grid grid-cols-2 gap-3">
                <StatTile
                    label="Win Rate (Prepped)"
                    value={`${stats.preppedWinRate}%`}
                    sublabel={`${stats.preppedCount} deals`}
                    color="text-status-success"
                />
                <StatTile
                    label="Win Rate (Unprepped)"
                    value={`${stats.unpreppedWinRate}%`}
                    sublabel={`${stats.unpreppedCount} deals`}
                    color="text-text-secondary"
                />
            </div>

            {/* Bar chart */}
            <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={48} margin={{ top: 4, right: 0, left: -20, bottom: 4 }}>
                        <XAxis
                            dataKey="label"
                            tick={{ fill: 'rgb(100 116 139)', fontSize: 10, fontFamily: 'Oswald' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'rgb(100 116 139)', fontSize: 10, fontFamily: 'Oswald' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 100]}
                            tickFormatter={v => `${v}%`}
                        />
                        <Tooltip
                            contentStyle={{ background: 'rgb(15 23 42)', border: '1px solid rgb(30 41 59)', borderRadius: 0, fontFamily: 'Oswald' }}
                            labelStyle={{ color: 'rgb(248 250 252)', fontSize: 11 }}
                            itemStyle={{ color: 'rgb(148 163 184)', fontSize: 10 }}
                            formatter={(v: any) => [`${v}%`, 'Win Rate']}
                        />
                        <Bar dataKey="winRate">
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={i === 1 ? ACCENT : MUTED} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-text-muted">
                {stats.totalDeals} deal{stats.totalDeals !== 1 ? 's' : ''} logged · last {days} days
            </p>
        </div>
    )
}

export default function CorrelationInsightCard({ userId, delay = 0 }: CorrelationInsightCardProps) {
    const [days, setDays] = useState(30)

    if (!userId) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30, delay }}
            className="card-os border border-border overflow-hidden"
        >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Training → Revenue Correlation</p>
                </div>
                <div className="flex border border-border">
                    {[30, 60, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-2 py-1 text-[10px] uppercase tracking-widest transition-all ${days === d ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-raised'}`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-5">
                <TierGate>
                    <InsightContent userId={userId} days={days} />
                </TierGate>
            </div>
        </motion.div>
    )
}
