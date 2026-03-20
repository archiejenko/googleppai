import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, Minus, X, Loader2, DollarSign } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDealOutcomes, useAddDealOutcome } from '../../hooks/useWinLoss'
import CorrelationInsightCard from './CorrelationInsightCard'
import { toast } from 'sonner'

type Outcome = 'won' | 'lost' | 'no_decision'

const OUTCOME_CONFIG: Record<Outcome, { label: string; icon: typeof TrendingUp; color: string; bg: string }> = {
    won: { label: 'Won', icon: TrendingUp, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/40' },
    lost: { label: 'Lost', icon: TrendingDown, color: 'text-status-danger', bg: 'bg-status-danger/10 border-status-danger/40' },
    no_decision: { label: 'No Decision', icon: Minus, color: 'text-text-muted', bg: 'bg-bg-raised border-border' },
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
    const { label, icon: Icon, color } = OUTCOME_CONFIG[outcome]
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest ${color}`}>
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
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-bg-surface border-l border-border z-40 flex flex-col"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Log Deal Outcome</p>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center hover:bg-bg-raised">
                    <X className="w-4 h-4 text-text-muted" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Deal Name *</label>
                    <input
                        className="input-os w-full text-sm"
                        placeholder="e.g. Acme Corp — Q2 expansion"
                        value={dealName}
                        onChange={e => setDealName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-2">Outcome *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(OUTCOME_CONFIG) as [Outcome, typeof OUTCOME_CONFIG[Outcome]][]).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setOutcome(key)}
                                className={`py-3 border text-xs font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${outcome === key ? cfg.bg : 'border-border text-text-muted hover:bg-bg-raised'}`}
                            >
                                <cfg.icon className={`w-4 h-4 ${outcome === key ? cfg.color : ''}`} />
                                {cfg.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Deal Value (£)
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
                        <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Close Date</label>
                        <input
                            type="date"
                            className="input-os w-full text-sm"
                            value={closeDate}
                            onChange={e => setCloseDate(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Notes</label>
                    <textarea
                        className="input-os w-full h-20 resize-none text-sm"
                        placeholder="What tipped the deal? Key learnings..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="p-5 border-t border-border">
                <button
                    onClick={handleSubmit}
                    disabled={!dealName.trim() || !outcome || addOutcome.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
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
        <div className="pb-12 space-y-8 relative">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">Win / Loss</h1>
                    <p className="text-sm text-text-muted mt-0.5">Track outcomes and measure training ROI</p>
                </div>
                <button
                    onClick={() => setShowPanel(true)}
                    className="btn-primary flex items-center gap-2 text-xs"
                >
                    <Plus className="w-4 h-4" />
                    Log Outcome
                </button>
            </div>

            {/* Outcomes table */}
            <div className="card-os border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border/40">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Recent Outcomes</p>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    </div>
                )}

                {!isLoading && outcomes.length === 0 && (
                    <div className="py-10 text-center space-y-2">
                        <TrendingUp className="w-6 h-6 text-text-muted mx-auto" />
                        <p className="text-sm text-text-secondary">No outcomes logged yet.</p>
                        <p className="text-xs text-text-muted">Start logging to build your ROI picture.</p>
                    </div>
                )}

                {!isLoading && outcomes.length > 0 && (
                    <div className="divide-y divide-border/40">
                        {outcomes.map((outcome, i) => (
                            <motion.div
                                key={outcome.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-4 px-5 py-3 hover:bg-bg-raised transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary truncate">{outcome.deal_name}</p>
                                    {outcome.notes && (
                                        <p className="text-xs text-text-muted truncate mt-0.5">{outcome.notes}</p>
                                    )}
                                </div>
                                <OutcomeBadge outcome={outcome.outcome} />
                                <p className="text-sm text-text-secondary font-black w-20 text-right">
                                    {formatValue(outcome.deal_value)}
                                </p>
                                <p className="text-xs text-text-muted w-20 text-right">
                                    {formatDate(outcome.close_date)}
                                </p>
                            </motion.div>
                        ))}
                    </div>
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
