import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, AlertTriangle, HelpCircle, Eye, Loader2, Copy, Check } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { useTier } from '../../context/TierContext'
import TierGate from '../../components/shared/TierGate'
import { toast } from 'sonner'

type DrawerState = 'idle' | 'loading' | 'error' | 'result'

interface Brief {
    likely_objections: string[]
    discovery_questions: string[]
    personal_watchout: string
    prep_session_id?: string
}

interface PreCallPrepDrawerProps {
    open: boolean
    onClose: () => void
}

async function generateBrief(params: {
    prospect_name: string
    prospect_title?: string
    prospect_company: string
    call_purpose?: string
}): Promise<Brief> {
    const { data: { session } } = await supabase.auth.getSession()
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-precall-brief`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify(params),
            signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Failed to generate brief')
        }
        return res.json()
    } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.')
        throw err
    }
}

export default function PreCallPrepDrawer({ open, onClose }: PreCallPrepDrawerProps) {
    const { isRevIntel } = useTier()
    const [state, setState] = useState<DrawerState>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [brief, setBrief] = useState<Brief | null>(null)
    const [copied, setCopied] = useState(false)

    // Form
    const [prospectName, setProspectName] = useState('')
    const [prospectTitle, setProspectTitle] = useState('')
    const [prospectCompany, setProspectCompany] = useState('')
    const [callPurpose, setCallPurpose] = useState('')

    const handleGenerate = async () => {
        if (!prospectName.trim() || !prospectCompany.trim()) {
            toast.error('Prospect name and company are required')
            return
        }
        setState('loading')
        setErrorMsg('')

        try {
            const result = await generateBrief({
                prospect_name: prospectName,
                prospect_title: prospectTitle,
                prospect_company: prospectCompany,
                call_purpose: callPurpose,
            })
            setBrief(result)
            setState('result')
        } catch (err: any) {
            setState('error')
            setErrorMsg(err.message || 'Something went wrong. Please try again.')
        }
    }

    const handleCopyLink = () => {
        if (!brief?.prep_session_id) return
        const url = `${window.location.origin}/prep/${brief.prep_session_id}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success('Brief link copied')
    }

    const handleReset = () => {
        setState('idle')
        setErrorMsg('')
        setBrief(null)
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                        className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-bg-surface border-l border-border z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-accent" />
                                <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted">Pre-Call Prep</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] text-text-muted border border-border px-1.5 py-0.5 uppercase tracking-widest hidden sm:block">
                                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Shift+P
                                </span>
                                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-bg-raised transition-colors">
                                    <X className="w-4 h-4 text-text-muted" />
                                </button>
                            </div>
                        </div>

                        {/* Tier gate */}
                        {!isRevIntel ? (
                            <div className="flex-1 flex items-center justify-center p-6">
                                <TierGate>
                                    <div className="min-h-[400px]" />
                                </TierGate>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                <AnimatePresence mode="wait">

                                    {/* Form */}
                                    {(state === 'idle' || state === 'error') && (
                                        <motion.div
                                            key="form"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="p-6 space-y-4"
                                        >
                                            {state === 'error' && (
                                                <div className="bg-status-danger/10 border border-status-danger/30 p-3 flex items-start gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-status-danger flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-status-danger">{errorMsg}</p>
                                                        <button onClick={() => setState('idle')} className="text-xs text-accent mt-1 underline underline-offset-2">
                                                            Try again
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

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
                                                <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Call Purpose</label>
                                                <input
                                                    className="input-os w-full text-sm"
                                                    placeholder="e.g. Discovery call, renewal discussion..."
                                                    value={callPurpose}
                                                    onChange={e => setCallPurpose(e.target.value)}
                                                />
                                            </div>

                                            <button
                                                onClick={handleGenerate}
                                                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                                            >
                                                <Phone className="w-4 h-4" />
                                                Generate Brief
                                            </button>

                                            <p className="text-[10px] text-text-muted text-center">
                                                Personalised using your Rep DNA profile · under 10 seconds
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Loading */}
                                    {state === 'loading' && (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center justify-center h-64 gap-4 p-6"
                                        >
                                            <Loader2 className="w-8 h-8 text-accent animate-spin" />
                                            <div className="text-center">
                                                <p className="text-sm text-text-primary">Analysing prospect<span className="animate-pulse">...</span></p>
                                                <p className="text-xs text-text-muted mt-1">Building your personalised brief</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Result */}
                                    {state === 'result' && brief && (
                                        <motion.div
                                            key="result"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="p-6 space-y-5"
                                        >
                                            <div>
                                                <p className="text-xs text-text-secondary">
                                                    Brief for <span className="text-text-primary font-black">{prospectName}</span>
                                                    {prospectTitle && <span className="text-text-muted"> · {prospectTitle}</span>}
                                                    {' at '}
                                                    <span className="text-text-primary">{prospectCompany}</span>
                                                </p>
                                            </div>

                                            {/* Likely Objections */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted flex items-center gap-1.5">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Likely Objections
                                                </p>
                                                <div className="space-y-1.5">
                                                    {brief.likely_objections.map((obj, i) => (
                                                        <div key={i} className="border border-border/60 border-l-2 border-l-accent/60 pl-3 py-2 pr-3 text-sm text-text-secondary bg-bg-raised/50">
                                                            {obj}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Discovery Questions */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted flex items-center gap-1.5">
                                                    <HelpCircle className="w-3 h-3" />
                                                    Discovery Questions
                                                </p>
                                                <div className="space-y-1.5">
                                                    {brief.discovery_questions.map((q, i) => (
                                                        <div key={i} className="border border-border/60 border-l-2 border-l-status-success/60 pl-3 py-2 pr-3 text-sm text-text-secondary bg-bg-raised/50">
                                                            {q}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Personal Watchout */}
                                            <div className="space-y-2">
                                                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted flex items-center gap-1.5">
                                                    <Eye className="w-3 h-3" />
                                                    Your Watchout
                                                </p>
                                                <div className="border border-accent/30 bg-accent/5 p-3 text-sm text-text-primary leading-relaxed">
                                                    {brief.personal_watchout}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-3 pt-2 border-t border-border/40">
                                                <button
                                                    onClick={handleCopyLink}
                                                    disabled={!brief.prep_session_id}
                                                    className="flex-1 btn-ghost flex items-center justify-center gap-2 text-xs disabled:opacity-40"
                                                >
                                                    {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                                                    Share Link
                                                </button>
                                                <button onClick={handleReset} className="flex-1 btn-ghost text-xs">
                                                    New Brief
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
