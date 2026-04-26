import { useState } from 'react'
import { Users, RefreshCw, CheckCheck, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useCoachingFlags, useDismissFlag, useRefreshCoachingPrompts } from '../../hooks/useCoachingFlags'
import { toast } from 'sonner'

/* ── Helpers ────────────────────────────────────────────────────── */




function TrendBadge({ trend }: { trend: 'improving' | 'declining' | 'flat' | null }) {
    if (!trend) return null
    const config = {
        improving: { icon: TrendingUp, color: 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80] border-[rgba(74,222,128,0.3)]', label: 'IMPROVING' },
        declining: { icon: TrendingDown, color: 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B] border-[rgba(255,107,107,0.3)]', label: 'DECLINING' },
        flat: { icon: Minus, color: 'bg-[rgba(74,85,103,0.15)] text-[rgb(var(--text-muted))] border-[rgb(var(--border-default))]', label: 'FLAT' },
    }
    const { icon: Icon, color, label } = config[trend]
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-[10px] text-[10px] font-semibold ${color}`}>
            <Icon className="w-2.5 h-2.5" />
            {label}
        </span>
    )
}


export default function ManagerDashboard() {
    const { user, isManager } = useAuth()
    const { data: flags = [], isLoading } = useCoachingFlags(user?.id)
    const dismissFlag = useDismissFlag()
    const refreshPrompts = useRefreshCoachingPrompts()
    const [selectedRepId, setSelectedRepId] = useState<string | null>(null)


    if (!isManager) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <p className="text-[12px] text-[rgb(var(--text-muted))]">Manager access required.</p>
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

    const repEntries = Object.entries(byRep)

    // Selected rep (default to first)
    const activeRepId = selectedRepId || (repEntries.length > 0 ? repEntries[0][0] : null)
    const activeRepFlags = activeRepId ? byRep[activeRepId] || [] : []
    const primaryFlag = activeRepFlags.find(f => f.flag_type === 'coaching_digest') || activeRepFlags[0]
    const rep = primaryFlag?.rep
    const repName = rep?.name || rep?.email || 'Rep'

    const handleRefresh = async () => {
        try {
            const result = await refreshPrompts.mutateAsync()
            toast.success(`Refreshed coaching prompts for ${result.updated} reps`)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to refresh prompts')
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
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex justify-between items-start mb-5">
                <div>
                    <div className="page-title">Coaching</div>
                    <div className="page-desc">Individual rep coaching, skill analysis, and action tracking</div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshPrompts.isPending}
                    className="inline-flex items-center gap-2 text-[11px] font-semibold py-[7px] px-3.5 rounded-lg border border-[rgb(var(--border-subtle))] bg-transparent text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshPrompts.isPending ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-[#FF6B6B] animate-spin" />
                </div>
            )}

            {!isLoading && repEntries.length === 0 && (
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-10 text-center space-y-3">
                    <Users className="w-8 h-8 text-[rgb(var(--text-muted))] mx-auto" />
                    <p className="text-[12px] text-[rgb(var(--text-secondary))]">No coaching flags at the moment.</p>
                    <p className="text-[11px] text-[rgb(var(--text-muted))]">Click Refresh to generate coaching prompts from recent session data.</p>
                </div>
            )}

            {!isLoading && repEntries.length > 0 && (
                <>
                    {/* Rep Selector Pills */}
                    <div className="flex gap-2 mb-5 flex-wrap">
                        {repEntries.map(([repId, repFlags]) => {
                            const pf = repFlags.find(f => f.flag_type === 'coaching_digest') || repFlags[0]
                            const rName = pf?.rep?.name || pf?.rep?.email || 'Rep'
                            const isActive = repId === activeRepId
                            return (
                                <button
                                    key={repId}
                                    onClick={() => setSelectedRepId(repId)}
                                    className={`inline-block py-1.5 px-3.5 rounded-[20px] border text-[11px] font-semibold cursor-pointer transition-all ${
                                        isActive
                                            ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                                            : 'bg-[#0a0e14] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-default))] hover:border-[rgb(var(--border-subtle))] hover:text-[rgb(var(--text-primary))]'
                                    }`}
                                >
                                    {rName}
                                </button>
                            )
                        })}
                    </div>

                    {/* Profile Card */}
                    {primaryFlag && (
                        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 mb-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-lg bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] flex items-center justify-center font-display text-[16px] font-bold text-[#4ADE80]">
                                        {repName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-display text-[18px] font-semibold text-[rgb(var(--text-primary))]">{repName}</div>
                                        {primaryFlag.trend && (
                                            <div className="mt-1">
                                                <TrendBadge trend={primaryFlag.trend} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    {primaryFlag.weakest_skill && (
                                        <div className="bg-[#0a0e14] border border-[rgb(var(--border-default))] rounded-lg py-2.5 px-4 text-center min-w-[90px]">
                                            <div className="font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))] mb-1">Weakest Skill</div>
                                            <div className="font-display text-[20px] font-semibold text-[#FF6B6B] leading-none">
                                                {primaryFlag.weakest_skill.replace(/[_-]/g, ' ')}
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-[#0a0e14] border border-[rgb(var(--border-default))] rounded-lg py-2.5 px-4 text-center min-w-[90px]">
                                        <div className="font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted))] mb-1">Flags</div>
                                        <div className="font-display text-[20px] font-semibold text-[rgb(var(--text-primary))] leading-none">
                                            {activeRepFlags.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Two-column layout */}
                    <div className="grid grid-cols-2 gap-4 mb-4">

                        {/* LEFT COLUMN */}
                        <div className="flex flex-col gap-4">

                            {/* Coaching Flags / Timeline */}
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                <div className="card-title">Coaching Timeline</div>

                                {activeRepFlags.length === 0 ? (
                                    <p className="text-[12px] text-[rgb(var(--text-muted))]">No flags for this rep</p>
                                ) : (
                                    <div className="relative pl-5">
                                        {/* Timeline line */}
                                        <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-[rgb(var(--border-default))]" />

                                        {activeRepFlags.map((flag) => {
                                            const dotColor = flag.flag_type === 'coaching_digest'
                                                ? '#4ADE80'
                                                : flag.flag_type === 'streak_broken'
                                                ? '#FF6B6B'
                                                : '#FBBF24'

                                            return (
                                                <div key={flag.id} className="relative pb-5 last:pb-0">
                                                    {/* Timeline dot */}
                                                    <div
                                                        className="absolute -left-5 top-1 w-2 h-2 rounded-full border-2 border-[rgb(var(--bg-surface-raised))] z-[1]"
                                                        style={{ background: dotColor }}
                                                    />
                                                    <div className="font-mono text-[10px] text-[rgb(var(--text-muted))] mb-0.5">
                                                        {flag.created_at ? new Date(flag.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                                    </div>

                                                    {flag.suggested_topic && (
                                                        <div className="text-[12px] text-[rgb(var(--text-primary))] leading-[1.5] mb-1.5">
                                                            {flag.suggested_topic}
                                                        </div>
                                                    )}

                                                    {flag.detail && (
                                                        <div className="text-[11px] text-[rgb(var(--text-secondary))] leading-[1.4] mb-1.5">
                                                            {flag.detail}
                                                        </div>
                                                    )}

                                                    {/* Tags */}
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {flag.flag_type === 'coaching_digest' && (
                                                            <span className="inline-block px-2 py-0.5 rounded-[10px] text-[10px] font-semibold bg-[rgba(96,165,250,0.12)] text-[#60A5FA]">
                                                                Coaching
                                                            </span>
                                                        )}
                                                        {flag.flag_type === 'streak_broken' && (
                                                            <span className="inline-block px-2 py-0.5 rounded-[10px] text-[10px] font-semibold bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]">
                                                                Streak Broken
                                                            </span>
                                                        )}
                                                        {flag.weakest_skill && (
                                                            <span className="inline-block px-2 py-0.5 rounded-[10px] text-[10px] font-semibold bg-[rgba(251,191,36,0.12)] text-[#FBBF24]">
                                                                {flag.weakest_skill.replace(/[_-]/g, ' ')}
                                                            </span>
                                                        )}
                                                        {flag.trend && (
                                                            <span className={`inline-block px-2 py-0.5 rounded-[10px] text-[10px] font-semibold ${
                                                                flag.trend === 'improving'
                                                                    ? 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80]'
                                                                    : flag.trend === 'declining'
                                                                    ? 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]'
                                                                    : 'bg-[rgba(74,85,103,0.15)] text-[rgb(var(--text-secondary))]'
                                                            }`}>
                                                                {flag.trend === 'improving' ? 'Positive' : flag.trend === 'declining' ? 'Declining' : 'Flat'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                <div className="card-title">Actions</div>

                                {activeRepFlags.map(flag => (
                                    <div key={flag.id} className="p-3 bg-[#0a0e14] border border-[rgb(var(--border-default))] rounded-lg mb-2 last:mb-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-[12px] font-semibold text-[rgb(var(--text-primary))]">
                                                {flag.suggested_topic || flag.detail || `Flag: ${flag.flag_type}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t border-[rgb(var(--border-default))]">
                                            <button
                                                disabled
                                                title="Drill assignment available in a future release"
                                                className="flex-1 text-[11px] font-semibold py-1.5 rounded-md border border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] opacity-30 cursor-not-allowed text-center"
                                            >
                                                Assign Drill
                                            </button>
                                            <button
                                                onClick={() => handleDismiss(flag.id)}
                                                disabled={dismissFlag.isPending}
                                                className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 rounded-md border border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-surface-raised))] transition-all text-center"
                                            >
                                                <CheckCheck className="w-3 h-3" />
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {activeRepFlags.length === 0 && (
                                    <p className="text-[12px] text-[rgb(var(--text-muted))]">No actions for this rep</p>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-4">

                            {/* Skill Overview / Weaknesses */}
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                <div className="card-title">Skill Overview</div>

                                {primaryFlag?.weakest_skill ? (
                                    <div className="space-y-3.5">
                                        {/* Show weakest skill prominently */}
                                        <div className="mb-3.5">
                                            <div className="text-[11px] text-[rgb(var(--text-secondary))] mb-1.5">Weakest Area</div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[11px] text-[rgb(var(--text-secondary))] w-[72px] flex-shrink-0">
                                                    {primaryFlag.weakest_skill.replace(/[_-]/g, ' ')}
                                                </span>
                                                <div className="flex-1 h-1.5 rounded-[3px] bg-[rgb(var(--border-default))]">
                                                    <div className="h-full rounded-[3px] bg-[#FF6B6B]" style={{ width: '40%' }} />
                                                </div>
                                                <span className="font-display text-[11px] font-semibold text-[#FF6B6B] w-8 text-right flex-shrink-0">Low</span>
                                            </div>
                                        </div>

                                        {/* Trend info */}
                                        {primaryFlag.trend && (
                                            <div className="text-[11px] text-[rgb(var(--text-secondary))]">
                                                Overall trend: <TrendBadge trend={primaryFlag.trend} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-[rgb(var(--text-muted))]">No skill data available</p>
                                )}
                            </div>

                            {/* Recommended Next */}
                            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                <div className="card-title">Recommended Next</div>

                                {primaryFlag?.suggested_topic ? (
                                    <>
                                        <div className="p-3 border-l-[3px] border-[#FF6B6B] bg-[#0a0e14] rounded-r-lg mb-2">
                                            <div className="font-display text-[11px] font-semibold uppercase text-[rgb(var(--text-primary))] mb-1">
                                                1:1 Topic
                                            </div>
                                            <div className="text-[11px] text-[rgb(var(--text-secondary))] leading-[1.4]">
                                                {primaryFlag.suggested_topic}
                                            </div>
                                        </div>

                                        {primaryFlag.weakest_skill && (
                                            <div className="p-3 border-l-[3px] border-[#FBBF24] bg-[#0a0e14] rounded-r-lg mb-2">
                                                <div className="font-display text-[11px] font-semibold uppercase text-[rgb(var(--text-primary))] mb-1">
                                                    Skill Focus
                                                </div>
                                                <div className="text-[11px] text-[rgb(var(--text-secondary))] leading-[1.4]">
                                                    Prioritise {primaryFlag.weakest_skill.replace(/[_-]/g, ' ')} drills to address weakest area.
                                                </div>
                                            </div>
                                        )}

                                        {primaryFlag.detail && (
                                            <div className="p-3 border-l-[3px] border-[#4ADE80] bg-[#0a0e14] rounded-r-lg">
                                                <div className="font-display text-[11px] font-semibold uppercase text-[rgb(var(--text-primary))] mb-1">
                                                    Context
                                                </div>
                                                <div className="text-[11px] text-[rgb(var(--text-secondary))] leading-[1.4]">
                                                    {primaryFlag.detail}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[11px] text-[rgb(var(--text-muted))]">No recommendations available. Click Refresh to generate.</p>
                                )}
                            </div>

                            {/* Extra Flags */}
                            {activeRepFlags.filter(f => f.flag_type !== 'coaching_digest').length > 0 && (
                                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                                    <div className="card-title">Alerts</div>
                                    {activeRepFlags.filter(f => f.flag_type !== 'coaching_digest').map(f => (
                                        <div key={f.id} className="flex items-center gap-2 py-2 text-[12px] text-[#FBBF24] border-b border-[rgb(var(--border-default))] last:border-b-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] flex-shrink-0" />
                                            {f.flag_type === 'streak_broken' ? 'Training streak broken' : f.detail}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
