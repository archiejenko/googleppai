import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, Minus, X, Loader2, DollarSign } from 'lucide-react'
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
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-[rgb(var(--bg-surface))] border-l border-[rgb(var(--border-default))] rounded-l-lg z-40 flex flex-col"
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
                                className={`py-3 border rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${outcome === key ? cfg.bg : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-surface-raised))]'}`}
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
                    className="btn-primary w-full rounded-lg flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {addOutcome.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Log Outcome
                </button>
            </div>
        </motion.div>
    )
}

export default function WinLossLogger() {
    const { user } = useAuth()
    const { data: outcomes = [], isLoading } = useDealOutcomes(user?.id)
    const [showPanel, setShowPanel] = useState(false)

    const formatValue = (v: number | null) =>
        v != null ? `£${v.toLocaleString('en-GB')}` : '—'

    const formatDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'

    return (
        <div className="pb-12 space-y-6 relative">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="page-kicker">Revenue Intelligence</p>
                    <h1 className="page-title">Win / Loss Analysis</h1>
                    <p className="page-desc">AI-analysed deal outcomes with root cause attribution and skill correlation.</p>
                </div>
                <button
                    onClick={() => setShowPanel(true)}
                    className="btn-primary rounded-lg flex items-center gap-2 text-xs"
                >
                    <Plus className="w-4 h-4" />
                    Log Outcome
                </button>
            </div>

            {/* Outcomes table */}
            <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-[rgb(var(--border-default))]">
                    <p className="card-title !mb-0">Recent Deals</p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1">Individual deal outcomes with call scores and loss attribution.</p>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="w-5 h-5 text-[var(--color-coral)] animate-spin" />
                    </div>
                )}

                {!isLoading && outcomes.length === 0 && (
                    <div className="py-10 text-center space-y-2">
                        <TrendingUp className="w-6 h-6 text-[rgb(var(--text-muted))] mx-auto" />
                        <p className="text-sm text-[rgb(var(--text-secondary))]">No outcomes logged yet.</p>
                        <p className="text-xs text-[rgb(var(--text-muted))]">Start logging to build your ROI picture.</p>
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
                                        <div className="font-semibold text-[rgb(var(--text-primary))]">{outcome.deal_name}</div>
                                        {outcome.notes && (
                                            <div className="text-[10px] text-[rgb(var(--text-muted))] truncate max-w-[250px] mt-0.5">{outcome.notes}</div>
                                        )}
                                    </td>
                                    <td><OutcomeBadge outcome={outcome.outcome} /></td>
                                    <td className="font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                        {formatValue(outcome.deal_value)}
                                    </td>
                                    <td className="text-[rgb(var(--text-muted))]">
                                        {formatDate(outcome.close_date)}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Correlation insights (tier gated inside) */}
            <CorrelationInsightCard userId={user?.id} delay={0.2} />

            {/* Log panel */}
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
