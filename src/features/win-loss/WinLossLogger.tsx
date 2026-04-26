import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, Minus, X, Loader2, DollarSign, BarChart2, Target, Clock, PieChart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDealOutcomes, useAddDealOutcome } from '../../hooks/useWinLoss'
import CorrelationInsightCard from './CorrelationInsightCard'
import { toast } from 'sonner'

type Outcome = 'won' | 'lost' | 'no_decision'

const OUTCOME_CONFIG: Record<Outcome, { label: string; icon: typeof TrendingUp; color: string; bg: string; pillClass: string }> = {
    won: { label: 'Won', icon: TrendingUp, color: 'text-[#4ADE80]', bg: 'bg-[rgba(74,222,128,0.12)] border-[rgba(74,222,128,0.4)]', pillClass: 'pill pill-green' },
    lost: { label: 'Lost', icon: TrendingDown, color: 'text-[#FF6B6B]', bg: 'bg-[rgba(255,107,107,0.12)] border-[rgba(255,107,107,0.4)]', pillClass: 'pill pill-coral' },
    no_decision: { label: 'No Decision', icon: Minus, color: 'text-[rgb(var(--text-muted))]', bg: 'bg-[rgb(var(--bg-surface-raised))] border-[rgb(var(--border-default))]', pillClass: 'pill pill-amber' },
}

const FILTER_OPTIONS = ['Last 30 Days', 'Last 90 Days', 'This Quarter', 'All Time'] as const

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
    const { label, icon: Icon, pillClass } = OUTCOME_CONFIG[outcome]
    return (
        <span className={`${pillClass} inline-flex items-center gap-1 text-[10px] uppercase tracking-widest`}>
            <Icon className="w-3 h-3" />
            {label}
        </span>
    )
}

function LogOutcomePanel({ onClose }: { onClose: () => void }) {
    const addOutcome = useAddDealOutcome()
    const [dealName, setDealName] = useState('')
    const [outcome, setOutcome] = useState<Outcome | null>(null)
    const [dealValue, setDealValue] = useState<string>('')
    const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')

    const handleSubmit = async () => {
        if (!dealName.trim() || !outcome) {
            toast.error('Deal name and outcome are required')
            return
        }
        try {
            await addOutcome.mutateAsync({
                deal_name: dealName,
                outcome,
                deal_value: dealValue ? parseFloat(dealValue) : undefined,
                close_date: closeDate,
                notes: notes || undefined,
            })
            toast.success(`${outcome.replace('_', ' ')} logged`)
            onClose()
        } catch (err: any) {
            toast.error(err.message || 'Failed to log outcome')
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-[rgb(var(--bg-surface))] border-l border-[rgb(var(--border-default))] rounded-l-[12px] z-40 flex flex-col"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border-default))]">
                <p className="page-kicker !mb-0">Log Deal Outcome</p>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[rgb(var(--bg-surface-raised))]">
                    <X className="w-4 h-4 text-[rgb(var(--text-muted))]" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="stat-label block mb-1">Deal Name *</label>
                    <input
                        className="input-os w-full text-sm"
                        placeholder="e.g. Acme Corp — Q2 expansion"
                        value={dealName}
                        onChange={e => setDealName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="stat-label block mb-2">Outcome *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(OUTCOME_CONFIG) as [Outcome, typeof OUTCOME_CONFIG[Outcome]][]).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setOutcome(key)}
                                className={`py-3 border rounded-[8px] text-xs font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${outcome === key ? cfg.bg : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-surface-raised))]'}`}
                            >
                                <cfg.icon className={`w-4 h-4 ${outcome === key ? cfg.color : ''}`} />
                                {cfg.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="stat-label block mb-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Deal Value
                        </label>
                        <input
                            type="number"
                            className="input-os w-full text-sm"
                            placeholder="e.g. 25000"
                            value={dealValue}
                            onChange={e => setDealValue(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="stat-label block mb-1">Close Date</label>
                        <input
                            type="date"
                            className="input-os w-full text-sm"
                            value={closeDate}
                            onChange={e => setCloseDate(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="stat-label block mb-1">Notes</label>
                    <textarea
                        className="input-os w-full h-20 resize-none text-sm"
                        placeholder="What tipped the deal? Key learnings..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-5 border-t border-[rgb(var(--border-default))]">
                <button
                    onClick={handleSubmit}
                    disabled={!dealName.trim() || !outcome || addOutcome.isPending}
                    className="btn-primary w-full rounded-[8px] flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {addOutcome.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Log Outcome
                </button>
            </div>
        </motion.div>
    )
}

/* ---------- Empty-state placeholder ---------- */
function EmptySection({ icon: Icon, title, subtitle }: { icon: typeof BarChart2; title: string; subtitle: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <Icon className="w-6 h-6 text-[rgb(var(--text-muted))]" />
            <p className="text-sm text-[rgb(var(--text-secondary))]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{title}</p>
            <p className="text-xs text-[rgb(var(--text-muted))]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>
        </div>
    )
}

/* ---------- Donut SVG (pure CSS, no lib) ---------- */
function DonutChart({ won, lost, noDecision }: { won: number; lost: number; noDecision: number }) {
    const total = won + lost + noDecision
    if (total === 0) return null

    const r = 48
    const circumference = 2 * Math.PI * r

    const wonPct = won / total
    const lostPct = lost / total

    const wonArc = wonPct * circumference
    const lostArc = lostPct * circumference
    const ndArc = (noDecision / total) * circumference

    const wonOffset = 0
    const lostOffset = -wonArc
    const ndOffset = -(wonArc + lostArc)

    const winRate = Math.round((won / total) * 100)

    return (
        <div className="flex items-center gap-5">
            <div className="relative w-[120px] h-[120px] flex-shrink-0">
                <svg viewBox="0 0 120 120" className="w-[120px] h-[120px]" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="none" />
                    {wonArc > 0 && (
                        <circle cx="60" cy="60" r={r} stroke="var(--color-green, #4ADE80)" strokeWidth="14" fill="none"
                            strokeDasharray={`${wonArc} ${circumference - wonArc}`}
                            strokeDashoffset={wonOffset} strokeLinecap="round" />
                    )}
                    {lostArc > 0 && (
                        <circle cx="60" cy="60" r={r} stroke="var(--color-coral, #FF6B6B)" strokeWidth="14" fill="none"
                            strokeDasharray={`${lostArc} ${circumference - lostArc}`}
                            strokeDashoffset={lostOffset} strokeLinecap="round" />
                    )}
                    {ndArc > 0 && (
                        <circle cx="60" cy="60" r={r} stroke="var(--color-amber, #FBBF24)" strokeWidth="14" fill="none"
                            strokeDasharray={`${ndArc} ${circumference - ndArc}`}
                            strokeDashoffset={ndOffset} strokeLinecap="round" />
                    )}
                </svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-[28px] font-semibold text-[#4ADE80]" style={{ fontFamily: "'Oswald', sans-serif" }}>{winRate}%</p>
                    <p className="text-[9px] uppercase tracking-[0.5px] text-[rgb(var(--text-muted))]">Win Rate</p>
                </div>
            </div>

            <div className="flex-1 space-y-2">
                {[
                    { label: 'Won', count: won, color: '#4ADE80' },
                    { label: 'Lost', count: lost, color: '#FF6B6B' },
                    { label: 'No Decision', count: noDecision, color: '#FBBF24' },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                        <span className="flex-1 text-[11px] text-[rgb(var(--text-secondary))]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                        <span className="text-[14px] font-semibold" style={{ fontFamily: "'Oswald', sans-serif", color: item.color }}>{item.count}</span>
                        <span className="w-8 text-right text-[10px] text-[rgb(var(--text-muted))]">{total > 0 ? Math.round((item.count / total) * 100) : 0}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function WinLossLogger() {
    const { user } = useAuth()
    const { data: outcomes = [], isLoading } = useDealOutcomes(user?.id)
    const [showPanel, setShowPanel] = useState(false)
    const [activeFilter, setActiveFilter] = useState<typeof FILTER_OPTIONS[number]>('Last 30 Days')

    /* ---------- Derived stats from real data ---------- */
    const stats = useMemo(() => {
        const won = outcomes.filter(o => o.outcome === 'won')
        const lost = outcomes.filter(o => o.outcome === 'lost')
        const noDecision = outcomes.filter(o => o.outcome === 'no_decision')
        const total = outcomes.length
        const winRate = total > 0 ? Math.round((won.length / total) * 100) : 0
        const wonValue = won.reduce((s, o) => s + (o.deal_value ?? 0), 0)
        const lostValue = lost.reduce((s, o) => s + (o.deal_value ?? 0), 0)
        return { won: won.length, lost: lost.length, noDecision: noDecision.length, total, winRate, wonValue, lostValue }
    }, [outcomes])

    const formatValue = (v: number | null) =>
        v != null ? `£${v.toLocaleString('en-GB')}` : '—'

    const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'

    const formatCurrency = (v: number) =>
        v >= 1000 ? `£${Math.round(v / 1000).toLocaleString('en-GB')}K` : `£${v.toLocaleString('en-GB')}`

    return (
        <div className="pb-12 space-y-5 relative">
            {/* ── Page Header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="page-kicker">Revenue Intelligence</p>
                    <h1 className="page-title">Win / Loss Analysis</h1>
                    <p className="page-desc">AI-analysed deal outcomes with root cause attribution and skill correlation.</p>
                </div>
                <button
                    onClick={() => setShowPanel(true)}
                    className="btn-primary rounded-[8px] flex items-center gap-2 text-xs"
                >
                    <Plus className="w-4 h-4" />
                    Log Outcome
                </button>
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex gap-2">
                {FILTER_OPTIONS.map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`filter-pill ${activeFilter === f ? 'active' : ''}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* ── 5-Stat Row ── */}
            <div className="grid grid-cols-5 gap-3.5">
                {/* Total Deals */}
                <div className="card-os rounded-[12px] p-4">
                    <p className="stat-label">Total Deals</p>
                    <p className="stat-value text-[rgb(var(--text-primary))]">{stats.total}</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">Closed this period</p>
                </div>
                {/* Won */}
                <div className="card-os rounded-[12px] p-4">
                    <p className="stat-label">Won</p>
                    <p className="stat-value text-[#4ADE80]">{stats.won}</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">{stats.wonValue > 0 ? `${formatCurrency(stats.wonValue)} total value` : 'No value logged'}</p>
                </div>
                {/* Lost */}
                <div className="card-os rounded-[12px] p-4">
                    <p className="stat-label">Lost</p>
                    <p className="stat-value text-[#FF6B6B]">{stats.lost}</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">{stats.lostValue > 0 ? `${formatCurrency(stats.lostValue)} lost value` : 'No value logged'}</p>
                </div>
                {/* Win Rate */}
                <div className="card-os rounded-[12px] p-4">
                    <p className="stat-label">Win Rate</p>
                    <p className="stat-value text-[#4ADE80]">{stats.total > 0 ? `${stats.winRate}%` : '—'}</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">Target: 40%</p>
                </div>
                {/* No Decision */}
                <div className="card-os rounded-[12px] p-4">
                    <p className="stat-label">No Decision</p>
                    <p className="stat-value text-[rgb(var(--text-primary))]">{stats.noDecision}</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">Stalled / deferred</p>
                </div>
            </div>

            {/* ── Row: Donut + Loss Reasons ── */}
            <div className="grid grid-cols-2 gap-4">
                {/* Outcome Distribution donut */}
                <div className="card-os rounded-[12px] p-[18px]">
                    <p className="card-title">Outcome Distribution</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mb-3.5">Deal results breakdown for this period.</p>
                    {stats.total > 0 ? (
                        <DonutChart won={stats.won} lost={stats.lost} noDecision={stats.noDecision} />
                    ) : (
                        <EmptySection icon={PieChart} title="No outcomes yet." subtitle="Log deals to see your outcome distribution." />
                    )}
                </div>

                {/* Loss Reasons (horizontal bars) */}
                <div className="card-os rounded-[12px] p-[18px]">
                    <p className="card-title">Loss Reasons</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mb-3.5">AI-classified root cause for each lost deal.</p>
                    {stats.lost > 0 ? (
                        <div className="space-y-2.5">
                            {/* Derive loss reasons from notes on lost deals */}
                            {(() => {
                                const lostDeals = outcomes.filter(o => o.outcome === 'lost')
                                // Group by notes (trimmed), fallback to "Unspecified"
                                const reasonMap = new Map<string, number>()
                                lostDeals.forEach(d => {
                                    const reason = d.notes?.trim() || 'Unspecified'
                                    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1)
                                })
                                const sorted = [...reasonMap.entries()].sort((a, b) => b[1] - a[1])
                                const maxCount = sorted[0]?.[1] ?? 1
                                return sorted.map(([reason, count]) => {
                                    const pct = Math.round((count / lostDeals.length) * 100)
                                    const barW = Math.round((count / maxCount) * 100)
                                    return (
                                        <div key={reason} className="flex items-center gap-2.5">
                                            <span className="w-[110px] text-right text-[11px] text-[rgb(var(--text-secondary))] truncate flex-shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>{reason}</span>
                                            <div className="flex-1 h-5 bg-[rgba(255,255,255,0.03)] rounded overflow-hidden relative">
                                                <div className="h-bar-fill h-full rounded flex items-center pl-2 text-[9px] font-semibold" style={{ width: `${barW}%`, background: '#FF6B6B' }}>
                                                    {barW > 15 ? `${pct}%` : ''}
                                                </div>
                                            </div>
                                            <span className="w-7 text-right text-[11px] font-semibold text-[#FF6B6B]" style={{ fontFamily: "'Oswald', sans-serif" }}>{count}</span>
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    ) : (
                        <EmptySection icon={BarChart2} title="No lost deals." subtitle="Loss reasons will appear here once lost deals are logged." />
                    )}
                </div>
            </div>

            {/* ── Row: Win Patterns + Skill Score (Correlation) ── */}
            <div className="grid grid-cols-2 gap-4">
                {/* Win Patterns */}
                <div className="card-os rounded-[12px] p-[18px]">
                    <p className="card-title">Win Patterns</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mb-3.5">Behaviours that correlate with won deals.</p>
                    {stats.won > 0 ? (
                        <div className="space-y-2">
                            {/* Derive simple pattern observations from won deals */}
                            {(() => {
                                const wonDeals = outcomes.filter(o => o.outcome === 'won')
                                const withNotes = wonDeals.filter(d => d.notes?.trim())
                                if (withNotes.length === 0) {
                                    return (
                                        <EmptySection icon={Target} title="Not enough data." subtitle="Add notes to won deals so AI can identify win patterns." />
                                    )
                                }
                                return withNotes.slice(0, 3).map((deal, i) => (
                                    <div key={deal.id} className="p-3 bg-[rgba(255,255,255,0.02)] border border-[rgb(var(--border-default))] rounded-[8px]">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] font-semibold bg-[rgba(74,222,128,0.12)] text-[#4ADE80]">{i + 1}</span>
                                            <span className="text-[12px] font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{deal.deal_name}</span>
                                        </div>
                                        <p className="text-[11px] text-[rgb(var(--text-secondary))] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{deal.notes}</p>
                                    </div>
                                ))
                            })()}
                        </div>
                    ) : (
                        <EmptySection icon={Target} title="No won deals yet." subtitle="Win patterns will appear once you log successful outcomes." />
                    )}
                </div>

                {/* Skill Score: Won vs Lost — uses CorrelationInsightCard */}
                <CorrelationInsightCard userId={user?.id} delay={0.2} />
            </div>

            {/* ── Full-width Recent Deals Table ── */}
            <div className="card-os rounded-[12px] overflow-hidden">
                <div className="px-[18px] py-[14px] border-b border-[rgb(var(--border-default))]">
                    <p className="card-title !mb-0">Recent Deals</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1">Individual deal outcomes with call scores and loss attribution.</p>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="w-5 h-5 text-[var(--color-coral)] animate-spin" />
                    </div>
                )}

                {!isLoading && outcomes.length === 0 && (
                    <div className="py-10">
                        <EmptySection icon={TrendingUp} title="No outcomes logged yet." subtitle="Start logging to build your ROI picture." />
                    </div>
                )}

                {!isLoading && outcomes.length > 0 && (
                    <table className="table-os">
                        <thead>
                            <tr>
                                <th>Deal</th>
                                <th>Outcome</th>
                                <th>Value</th>
                                <th>Date</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {outcomes.map((outcome, i) => (
                                <motion.tr
                                    key={outcome.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <td>
                                        <div className="font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{outcome.deal_name}</div>
                                    </td>
                                    <td><OutcomeBadge outcome={outcome.outcome} /></td>
                                    <td className="font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                        {formatValue(outcome.deal_value)}
                                    </td>
                                    <td className="text-[rgb(var(--text-muted))]" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                                        {formatDate(outcome.close_date)}
                                    </td>
                                    <td>
                                        {outcome.notes ? (
                                            <span className="text-[11px] text-[rgb(var(--text-muted))] italic truncate max-w-[250px] block" style={{ fontFamily: "'DM Sans', sans-serif" }}>{outcome.notes}</span>
                                        ) : (
                                            <span className="text-[rgb(var(--text-muted))]">—</span>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Log Outcome Panel (slide-over) ── */}
            <AnimatePresence>
                {showPanel && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-30"
                            onClick={() => setShowPanel(false)}
                        />
                        <LogOutcomePanel onClose={() => setShowPanel(false)} />
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
