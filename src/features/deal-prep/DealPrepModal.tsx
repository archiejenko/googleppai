import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Briefcase, Loader2, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGenerateDealPersona, useUpdateDealOutcome } from '../../hooks/useDealSessions'
import TierGate from '../../components/shared/TierGate'
import { toast } from 'sonner'

type Stage = 'discovery' | 'proposal' | 'negotiation' | 'closing'
type ModalState = 'idle' | 'generating' | 'error' | 'ready' | 'prompting_outcome'

interface DealPrepModalProps {
    open: boolean
    onClose: () => void
    dealSessionIdOnReturn?: string | null
}

const STAGES: { value: Stage; label: string }[] = [
    { value: 'discovery', label: 'Discovery' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closing', label: 'Closing' },
]

const OUTCOMES = [
    { value: 'won', label: 'Won', color: 'text-status-success border-status-success/40 hover:bg-status-success/10' },
    { value: 'lost', label: 'Lost', color: 'text-status-danger border-status-danger/40 hover:bg-status-danger/10' },
    { value: 'no_decision', label: 'No Decision', color: 'text-text-secondary border-border hover:bg-bg-raised' },
    { value: 'still_active', label: 'Still Active', color: 'text-accent border-accent/40 hover:bg-accent/10' },
] as const

export default function DealPrepModal({ open, onClose }: DealPrepModalProps) {
    const navigate = useNavigate()
    const generatePersona = useGenerateDealPersona()
    const updateOutcome = useUpdateDealOutcome()

    const [state, setState] = useState<ModalState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [dealSessionId, setDealSessionId] = useState<string | null>(null)

    // Form fields
    const [dealName, setDealName] = useState('')
    const [prospectName, setProspectName] = useState('')
    const [prospectTitle, setProspectTitle] = useState('')
    const [prospectCompany, setProspectCompany] = useState('')
    const [stage, setStage] = useState<Stage>('discovery')
    const [objectionInput, setObjectionInput] = useState('')
    const [objections, setObjections] = useState<string[]>([])

    const handleAddObjection = () => {
        const trimmed = objectionInput.trim()
        if (trimmed && !objections.includes(trimmed)) {
            setObjections(prev => [...prev, trimmed])
            setObjectionInput('')
        }
    }

    const handleRemoveObjection = (obj: string) => {
        setObjections(prev => prev.filter(o => o !== obj))
    }

    const handleGenerate = async () => {
        if (!prospectName.trim() || !prospectCompany.trim()) {
            toast.error('Prospect name and company are required')
            return
        }
        setState('generating')
        setErrorMsg('')

        try {
            const result = await generatePersona.mutateAsync({
                prospect_name: prospectName,
                prospect_title: prospectTitle,
                prospect_company: prospectCompany,
                known_objections: objections,
                stage,
                deal_name: dealName,
            })

            setDealSessionId(result.deal_session_id)
            setState('ready')

            // Navigate to active training with deal context
            onClose()
            navigate(`/active-training?dealSessionId=${result.deal_session_id}&personaPrompt=${encodeURIComponent(result.persona_prompt)}&suggestedFocus=${encodeURIComponent(result.suggested_focus)}&dealMode=1`)
        } catch (err: any) {
            setState('error')
            setErrorMsg(err.message || 'Failed to generate persona. Please try again.')
        }
    }

    const handleOutcome = async (outcome: 'won' | 'lost' | 'no_decision' | 'still_active') => {
        if (!dealSessionId) return
        try {
            await updateOutcome.mutateAsync({ dealSessionId, outcome })
            toast.success(`Deal marked as ${outcome.replace('_', ' ')}`)
            setState('idle')
            onClose()
        } catch {
            toast.error('Failed to save outcome')
        }
    }

    const handleClose = () => {
        if (state === 'generating') return
        setState('idle')
        setErrorMsg('')
        onClose()
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4"
                    >
                        <div className="card-os border border-border w-full max-w-lg pointer-events-auto overflow-hidden">
                            {/* Title bar */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-accent" />
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Deal-Linked Prep</p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    disabled={state === 'generating'}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-bg-raised transition-colors disabled:opacity-40"
                                >
                                    <X className="w-4 h-4 text-text-muted" />
                                </button>
                            </div>

                            <TierGate>
                                <div className="p-6 space-y-4">

                                    {/* Outcome prompt (post-session) */}
                                    {state === 'prompting_outcome' && (
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-base text-text-primary">How did the real call go?</h3>
                                                <p className="text-xs text-text-muted mt-1">Log the outcome to track your training ROI.</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {OUTCOMES.map(({ value, label, color }) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => handleOutcome(value)}
                                                        className={`py-3 border text-sm font-black uppercase tracking-widest transition-all ${color}`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Error state */}
                                    {state === 'error' && (
                                        <div className="bg-status-danger/10 border border-status-danger/30 p-4 flex items-start gap-3">
                                            <AlertTriangle className="w-4 h-4 text-status-danger flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-status-danger">{errorMsg}</p>
                                                <button
                                                    onClick={() => setState('idle')}
                                                    className="text-xs text-accent mt-2 underline underline-offset-2"
                                                >
                                                    Try again
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Form (idle or error) */}
                                    {(state === 'idle' || state === 'error') && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Deal Name</label>
                                                    <input
                                                        className="input-os w-full text-sm"
                                                        placeholder="e.g. Acme Corp — Q2"
                                                        value={dealName}
                                                        onChange={e => setDealName(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Stage *</label>
                                                    <select
                                                        className="input-os w-full text-sm"
                                                        value={stage}
                                                        onChange={e => setStage(e.target.value as Stage)}
                                                    >
                                                        {STAGES.map(s => (
                                                            <option key={s.value} value={s.value}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Prospect Name *</label>
                                                <input
                                                    className="input-os w-full text-sm"
                                                    placeholder="e.g. Sarah Chen"
                                                    value={prospectName}
                                                    onChange={e => setProspectName(e.target.value)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Title</label>
                                                    <input
                                                        className="input-os w-full text-sm"
                                                        placeholder="e.g. VP Sales"
                                                        value={prospectTitle}
                                                        onChange={e => setProspectTitle(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Company *</label>
                                                    <input
                                                        className="input-os w-full text-sm"
                                                        placeholder="e.g. Acme Corp"
                                                        value={prospectCompany}
                                                        onChange={e => setProspectCompany(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Known Objections</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        className="input-os flex-1 text-sm"
                                                        placeholder="e.g. Too expensive..."
                                                        value={objectionInput}
                                                        onChange={e => setObjectionInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddObjection()}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddObjection}
                                                        className="btn-ghost px-3 text-xs"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                                {objections.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {objections.map(obj => (
                                                            <span key={obj} className="flex items-center gap-1 text-xs bg-bg-raised border border-border px-2 py-0.5">
                                                                {obj}
                                                                <button onClick={() => handleRemoveObjection(obj)} className="text-text-muted hover:text-accent">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={handleGenerate}
                                                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                                            >
                                                Generate Deal Persona
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Generating state */}
                                    {state === 'generating' && (
                                        <div className="flex flex-col items-center py-8 gap-4">
                                            <Loader2 className="w-8 h-8 text-accent animate-spin" />
                                            <div className="text-center">
                                                <p className="text-sm text-text-primary">Generating persona...</p>
                                                <p className="text-xs text-text-muted mt-1">Analysing prospect context and rep profile</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TierGate>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// Helper component for triggering outcome logging after session
export function DealOutcomePrompt({
    dealSessionId,
    onDismiss,
}: {
    dealSessionId: string
    onDismiss: () => void
}) {
    const updateOutcome = useUpdateDealOutcome()

    const handleOutcome = async (outcome: 'won' | 'lost' | 'no_decision' | 'still_active') => {
        await updateOutcome.mutateAsync({ dealSessionId, outcome })
        toast.success(`Deal marked as ${outcome.replace('_', ' ')}`)
        onDismiss()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-os border border-accent/30 p-5 space-y-3"
        >
            <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-accent" />
                <p className="text-sm text-text-primary">How did the real call go?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {OUTCOMES.map(({ value, label, color }) => (
                    <button
                        key={value}
                        onClick={() => handleOutcome(value)}
                        className={`py-2 border text-xs font-black uppercase tracking-widest transition-all ${color}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <button onClick={onDismiss} className="text-xs text-text-muted underline underline-offset-2">
                Skip
            </button>
        </motion.div>
    )
}
