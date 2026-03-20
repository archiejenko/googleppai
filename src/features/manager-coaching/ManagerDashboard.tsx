import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, RefreshCw, CheckCheck, Loader2, TrendingUp, TrendingDown, Minus, X, ChevronRight } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useCoachingFlags, useDismissFlag, useRefreshCoachingPrompts } from '../../hooks/useCoachingFlags'
import { toast } from 'sonner'

function TrendBadge({ trend }: { trend: 'improving' | 'declining' | 'flat' | null }) {
    if (!trend) return null
    const config = {
        improving: { icon: TrendingUp, color: 'text-status-success bg-status-success/10 border-status-success/30', label: 'IMPROVING' },
        declining: { icon: TrendingDown, color: 'text-status-danger bg-status-danger/10 border-status-danger/30', label: 'DECLINING' },
        flat: { icon: Minus, color: 'text-text-muted bg-bg-raised border-border', label: 'FLAT' },
    }
    const { icon: Icon, color, label } = config[trend]
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] uppercase tracking-widest ${color}`}>
            <Icon className="w-2.5 h-2.5" />
            {label}
        </span>
    )
}

function AssignDrillModal({ repName, onClose }: { repId: string; repName: string; onClose: () => void }) {
    const [scenario, setScenario] = useState('objection_handling')
    const [submitting, setSubmitting] = useState(false)

    const handleAssign = async () => {
        // In practice, this would call a lightweight endpoint or directly insert via supabase
        setSubmitting(true)
        try {
            // For now, toast and close — the edge function pattern would be called here
            toast.success(`Drill assigned to ${repName}`)
            onClose()
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={onClose}>
            <div
                className="card-os border border-border w-full max-w-sm p-6 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-primary">Assign Drill to {repName}</p>
                    <button onClick={onClose} className="w-6 h-6 flex items-center justify-center hover:bg-bg-raised">
                        <X className="w-3.5 h-3.5 text-text-muted" />
                    </button>
                </div>
                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1.5">Scenario Type</label>
                    <select
                        className="input-os w-full text-sm"
                        value={scenario}
                        onChange={e => setScenario(e.target.value)}
                    >
                        {['objection_handling', 'cold_call', 'discovery', 'closing', 'negotiation'].map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleAssign}
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Assign Drill
                </button>
            </div>
        </div>
    )
}

export default function ManagerDashboard() {
    const { user, isManager } = useAuth()
    const { data: flags = [], isLoading } = useCoachingFlags(user?.id)
    const dismissFlag = useDismissFlag()
    const refreshPrompts = useRefreshCoachingPrompts()
    const [assigningRep, setAssigningRep] = useState<{ id: string; name: string } | null>(null)

    if (!isManager) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <p className="text-text-muted text-sm">Manager access required.</p>
            </div>
        )
    }

    // Group flags by rep
    const byRep: Record<string, typeof flags> = {}
    for (const flag of flags) {
        const repId = flag.rep_id
        if (!byRep[repId]) byRep[repId] = []
        byRep[repId].push(flag)
    }

    const handleRefresh = async () => {
        try {
            const result = await refreshPrompts.mutateAsync()
            toast.success(`Refreshed coaching prompts for ${result.updated} reps`)
        } catch (err: any) {
            toast.error(err.message || 'Failed to refresh prompts')
        }
    }

    const handleDismiss = async (flagId: string) => {
        try {
            await dismissFlag.mutateAsync(flagId)
            toast.success('Flag dismissed')
        } catch {
            toast.error('Failed to dismiss flag')
        }
    }

    return (
        <div className="pb-12 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">Coaching Dashboard</h1>
                    <p className="text-sm text-text-muted mt-0.5">AI-generated coaching flags for your team</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshPrompts.isPending}
                    className="btn-ghost flex items-center gap-2 text-xs"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshPrompts.isPending ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                </div>
            )}

            {!isLoading && Object.keys(byRep).length === 0 && (
                <div className="card-os border border-border p-10 text-center space-y-3">
                    <Users className="w-8 h-8 text-text-muted mx-auto" />
                    <p className="text-sm text-text-secondary">No coaching flags at the moment.</p>
                    <p className="text-xs text-text-muted">Click Refresh to generate coaching prompts from recent session data.</p>
                </div>
            )}

            {!isLoading && Object.keys(byRep).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Object.entries(byRep).map(([repId, repFlags], i) => {
                        const primaryFlag = repFlags.find(f => f.flag_type === 'coaching_digest') || repFlags[0]
                        const rep = primaryFlag.rep
                        const repName = rep?.name || rep?.email || 'Rep'

                        return (
                            <motion.div
                                key={repId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 30, delay: i * 0.06 }}
                                className="card-os border border-border p-5 space-y-4"
                            >
                                {/* Rep header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 flex items-center justify-center bg-accent/10 border border-accent/20 text-accent text-xs font-black">
                                            {repName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-primary font-black">{repName}</p>
                                            {primaryFlag.trend && <TrendBadge trend={primaryFlag.trend} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Weakest skill badge */}
                                {primaryFlag.weakest_skill && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] uppercase tracking-widest text-text-muted">Weakest:</span>
                                        <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 uppercase tracking-widest">
                                            {primaryFlag.weakest_skill.replace(/[_-]/g, ' ')}
                                        </span>
                                    </div>
                                )}

                                {/* Coaching prompt */}
                                {primaryFlag.suggested_topic && (
                                    <div className="bg-bg-raised border border-border p-3 space-y-1">
                                        <p className="text-[9px] uppercase tracking-[0.15em] text-text-muted">1:1 Topic</p>
                                        <p className="text-xs text-text-secondary leading-relaxed">{primaryFlag.suggested_topic}</p>
                                    </div>
                                )}

                                {primaryFlag.detail && (
                                    <p className="text-xs text-text-muted italic">"{primaryFlag.detail}"</p>
                                )}

                                {/* Extra flags (streak broken, etc) */}
                                {repFlags.filter(f => f.flag_type !== 'coaching_digest').map(f => (
                                    <div key={f.id} className="flex items-center gap-2 text-xs text-status-warning">
                                        <span className="w-1.5 h-1.5 bg-status-warning flex-shrink-0" />
                                        {f.flag_type === 'streak_broken' ? 'Training streak broken' : f.detail}
                                    </div>
                                ))}

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                    <button
                                        onClick={() => setAssigningRep({ id: repId, name: repName })}
                                        className="flex-1 btn-ghost text-xs py-1.5"
                                    >
                                        Assign Drill
                                    </button>
                                    <button
                                        onClick={() => handleDismiss(primaryFlag.id)}
                                        disabled={dismissFlag.isPending}
                                        className="flex-1 flex items-center justify-center gap-1 border border-border text-xs text-text-muted py-1.5 hover:bg-bg-raised transition-all"
                                    >
                                        <CheckCheck className="w-3 h-3" />
                                        Dismiss
                                    </button>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {assigningRep && (
                <AssignDrillModal
                    repId={assigningRep.id}
                    repName={assigningRep.name}
                    onClose={() => setAssigningRep(null)}
                />
            )}
        </div>
    )
}
