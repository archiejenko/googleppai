import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, CheckCircle, Clock, ChevronRight, Flame } from 'lucide-react'
import { useDailyDrill, useCompleteDrill } from '../../hooks/useDailyDrill'
import { toast } from 'sonner'

interface DailyDrillWidgetProps {
    userId?: string
    delay?: number
}

// 5×7 heat calendar for last 35 days
function HeatCalendar() {
    // Simple visual: 35 days, greener = more recent completion
    // In production this would query daily_drills history
    const cells = Array.from({ length: 35 }, () => {
        const opacity = Math.random() > 0.4 ? Math.random() * 0.8 + 0.2 : 0
        return opacity
    })

    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">Activity (35d)</p>
            <div className="grid grid-cols-7 gap-0.5">
                {cells.map((opacity, i) => (
                    <div
                        key={i}
                        className="w-3 h-3"
                        style={{
                            background: opacity > 0
                                ? `rgba(34, 197, 94, ${opacity})`
                                : 'rgb(30, 41, 59)'
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

function CountdownTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
    const [remaining, setRemaining] = useState(seconds)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!)
                    onExpire()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [onExpire])

    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    const progress = (remaining / seconds) * 100

    return (
        <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgb(30 41 59)" strokeWidth="3" />
                    <circle
                        cx="24" cy="24" r="20"
                        fill="none"
                        stroke={remaining < 30 ? 'rgb(239 68 68)' : 'rgb(255 107 107)'}
                        strokeWidth="3"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                        className="transition-all duration-1000"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-text-primary">
                    {mins}:{secs.toString().padStart(2, '0')}
                </span>
            </div>
            <div>
                <p className="text-xs text-text-muted">Time remaining</p>
                <p className="text-xs text-accent font-black">
                    {remaining < 30 ? 'HURRY UP' : remaining < 60 ? 'ALMOST DONE' : 'STAY FOCUSED'}
                </p>
            </div>
        </div>
    )
}

export default function DailyDrillWidget({ userId, delay = 0 }: DailyDrillWidgetProps) {
    const { data, isLoading } = useDailyDrill(userId)
    const completeMutation = useCompleteDrill()
    const [state, setState] = useState<'idle' | 'active' | 'submitting'>('idle')
    const [response, setResponse] = useState('')
    const [selfScore, setSelfScore] = useState<number | null>(null)

    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 30, delay }}
                className="card-os border border-border p-5 animate-pulse h-32 bg-bg-raised"
            />
        )
    }

    const streak = data?.current_streak || 0
    const longestStreak = data?.longest_streak || 0

    if (data?.already_completed) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 30, delay }}
                className="card-os border border-border p-5"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Today's Drill</p>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-status-success" />
                            <p className="text-sm text-status-success font-black">COMPLETED</p>
                        </div>
                        {data.drill?.score != null && (
                            <p className="text-xs text-text-muted">Score: <span className="text-text-primary font-black">{data.drill.score}</span></p>
                        )}
                    </div>
                    <div className="text-right space-y-1">
                        <div className="flex items-center gap-1.5 justify-end">
                            <Flame className="w-4 h-4 text-accent" />
                            <span className="text-xl font-black text-accent">{streak}</span>
                        </div>
                        <p className="text-[10px] text-text-muted uppercase tracking-widest">
                            day streak
                        </p>
                        {longestStreak > streak && (
                            <p className="text-[10px] text-text-muted">Best: {longestStreak}</p>
                        )}
                    </div>
                </div>
                <div className="mt-4">
                    <HeatCalendar />
                </div>
            </motion.div>
        )
    }

    const drill = data?.drill
    const scenario = data?.scenario || drill?.target_skill || 'Practice your objection handling in 3 minutes.'

    const handleStartDrill = () => setState('active')

    const handleTimerExpire = () => {
        if (state === 'active') handleSubmit(50)
    }

    const handleSubmit = async (scoreOverride?: number) => {
        if (!drill?.id) return
        setState('submitting')

        const score = scoreOverride ?? selfScore ?? 70
        try {
            await completeMutation.mutateAsync({ drillId: drill.id, score })
            toast.success(`Drill complete! Score: ${score}`)
        } catch {
            toast.error('Failed to submit drill')
            setState('active')
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30, delay }}
            className="card-os border border-border overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Today's Drill</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-accent" />
                    <span className="text-sm font-black text-accent">{streak}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">streak</span>
                </div>
            </div>

            <div className="p-5 space-y-4">
                <AnimatePresence mode="wait">
                    {state === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {drill && (
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
                                        Focus: {drill.target_skill}
                                    </p>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        {scenario}
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-text-muted text-xs">
                                <Clock className="w-3.5 h-3.5" />
                                <span>3 minutes · instant score</span>
                            </div>
                            <button
                                onClick={handleStartDrill}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                Start Drill
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {state === 'active' && (
                        <motion.div
                            key="active"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <CountdownTimer seconds={180} onExpire={handleTimerExpire} />

                            <div className="bg-bg-raised border border-border p-3">
                                <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">Scenario</p>
                                <p className="text-sm text-text-secondary leading-relaxed">{scenario}</p>
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">Your Response</p>
                                <textarea
                                    className="input-os w-full h-20 resize-none text-sm"
                                    placeholder="Type your sales response here..."
                                    value={response}
                                    onChange={e => setResponse(e.target.value)}
                                />
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-2">Self-score</p>
                                <div className="flex gap-2">
                                    {[40, 55, 70, 85, 100].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSelfScore(s)}
                                            className={`flex-1 py-1.5 text-xs font-black border transition-all ${selfScore === s
                                                ? 'bg-accent text-white border-accent'
                                                : 'bg-bg-raised border-border text-text-muted hover:border-accent/40'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => handleSubmit()}
                                disabled={selfScore === null}
                                className="btn-primary w-full disabled:opacity-40"
                            >
                                Submit Drill
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Heat calendar at bottom */}
            {state === 'idle' && (
                <div className="px-5 pb-5">
                    <HeatCalendar />
                </div>
            )}
        </motion.div>
    )
}
