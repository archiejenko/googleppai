import { motion } from 'framer-motion'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, User } from 'lucide-react'
import { useRepDNA } from '../../hooks/useRepDNA'

interface RepDNACardProps {
    userId?: string
    delay?: number
}

function SkeletonBar({ width }: { width: string }) {
    return <div className={`h-3 bg-bg-raised animate-pulse ${width}`} />
}

export default function RepDNACard({ userId, delay = 0 }: RepDNACardProps) {
    const { data: profile, isLoading } = useRepDNA(userId)

    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 30, delay }}
                className="card-os border border-border p-5 space-y-4"
            >
                <SkeletonBar width="w-32" />
                <SkeletonBar width="w-full" />
                <SkeletonBar width="w-3/4" />
                <SkeletonBar width="w-full" />
            </motion.div>
        )
    }

    if (!profile) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 30, delay }}
                className="card-os border border-border p-5 flex items-center gap-4"
            >
                <div className="w-10 h-10 flex items-center justify-center bg-bg-raised border border-border flex-shrink-0">
                    <User className="w-5 h-5 text-text-muted" />
                </div>
                <div>
                    <p className="text-xs text-text-muted uppercase tracking-[0.2em]">Rep DNA</p>
                    <p className="text-sm text-text-secondary mt-0.5">
                        Complete your first session to build your profile.
                    </p>
                </div>
            </motion.div>
        )
    }

    // Talk/listen ratio
    const talkPct = Math.round(profile.talk_ratio * 100)
    const listenPct = 100 - talkPct
    const talkColor = talkPct > 65 ? 'bg-status-danger' : talkPct < 35 ? 'bg-status-warning' : 'bg-accent'

    // Top 3 weak filler phrases
    const topFillers = Object.entries(profile.filler_phrase_hits || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)

    // Objection win rates
    const objectionRates = Object.entries(profile.objection_win_rates || {})
        .sort(([, a], [, b]) => (a as number) - (b as number))
        .slice(0, 4)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30, delay }}
            className="card-os border border-border p-5 space-y-5"
        >
            {/* Header */}
            <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Rep DNA</p>
                <p className="text-xs text-text-muted mt-0.5">
                    Based on last 20 sessions
                </p>
            </div>

            {/* Talk / Listen Ratio */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.15em] text-text-secondary">Talk / Listen</p>
                    <p className="text-xs text-text-muted">
                        <span className="text-accent font-black">{talkPct}%</span> talk · {listenPct}% listen
                    </p>
                </div>
                <div className="w-full h-2 bg-bg-raised flex overflow-hidden">
                    <div
                        className={`h-full transition-all duration-700 ${talkColor}`}
                        style={{ width: `${talkPct}%` }}
                    />
                    <div
                        className="h-full bg-bg-raised flex-1"
                    />
                </div>
                {talkPct > 65 && (
                    <p className="text-[10px] text-status-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        You're talking too much — create more space for the buyer
                    </p>
                )}
            </div>

            {/* Top Weak Patterns */}
            {topFillers.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.15em] text-text-secondary">Filler Patterns</p>
                    <div className="space-y-1">
                        {topFillers.map(([phrase, count]) => (
                            <div key={phrase} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                                <span className="text-xs text-text-secondary">
                                    <span className="text-accent">"{phrase}"</span>
                                </span>
                                <span className="text-[10px] text-text-muted">{count as number}× detected</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Objection Win Rates */}
            {objectionRates.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-[0.15em] text-text-secondary">Objection Win Rates</p>
                    <div className="space-y-2">
                        {objectionRates.map(([type, rate]) => {
                            const pct = rate as number
                            const Icon = pct >= 70 ? TrendingUp : pct <= 40 ? TrendingDown : Minus
                            const color = pct >= 70 ? 'text-status-success' : pct <= 40 ? 'text-status-danger' : 'text-status-warning'
                            return (
                                <div key={type} className="flex items-center gap-2">
                                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
                                    <span className="text-xs text-text-secondary flex-1 truncate capitalize">
                                        {type.replace(/[_-]/g, ' ').replace('SK ', '')}
                                    </span>
                                    <div className="w-16 h-1.5 bg-bg-raised flex-shrink-0">
                                        <div
                                            className={`h-full transition-all duration-700 ${pct >= 70 ? 'bg-status-success' : pct <= 40 ? 'bg-status-danger' : 'bg-status-warning'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-black w-8 text-right ${color}`}>{pct}%</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Discovery depth */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted">Discovery Depth</p>
                <p className="text-sm font-black text-text-primary">{Math.round(profile.discovery_depth_avg)}<span className="text-text-muted text-xs">/100</span></p>
            </div>
        </motion.div>
    )
}
