import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Pin, PinOff, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTier } from '../../context/TierContext'
import { useObjectionLibrary, useAddObjection, usePinObjection } from '../../hooks/useObjectionLibrary'
import TierGate from '../../components/shared/TierGate'
import { toast } from 'sonner'

type Source = 'simulation' | 'real_call' | 'manual'
type ViewMode = 'personal' | 'team'

const SOURCE_CONFIG: Record<Source, { label: string; color: string }> = {
    simulation: { label: 'SIM', color: 'text-accent bg-accent/10 border-accent/20' },
    real_call: { label: 'LIVE', color: 'text-status-success bg-status-success/10 border-status-success/20' },
    manual: { label: 'MANUAL', color: 'text-text-muted bg-bg-raised border-border' },
}

function ScoreChip({ score }: { score: number | null }) {
    if (score == null) return null
    const color = score >= 70 ? 'text-status-success border-status-success/30' : 'text-status-danger border-status-danger/30'
    return (
        <span className={`text-[10px] font-black border px-1.5 py-0.5 ${color}`}>{score}</span>
    )
}

function AddObjectionPanel({ onClose }: { onClose: () => void }) {
    const addObjection = useAddObjection()
    const [objectionText, setObjectionText] = useState('')
    const [handlingResponse, setHandlingResponse] = useState('')
    const [score, setScore] = useState<number | undefined>()
    const [source, setSource] = useState<Source>('manual')
    const [tagInput, setTagInput] = useState('')
    const [tags, setTags] = useState<string[]>([])

    const handleAddTag = () => {
        const t = tagInput.trim().toLowerCase()
        if (t && !tags.includes(t)) { setTags(p => [...p, t]); setTagInput('') }
    }

    const handleSubmit = async () => {
        if (!objectionText.trim()) return
        try {
            await addObjection.mutateAsync({ objection_text: objectionText, handling_response: handlingResponse, score, source, tags })
            toast.success('Objection saved')
            onClose()
        } catch (err: any) {
            toast.error(err.message || 'Failed to save')
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-bg-surface border-l border-border z-40 flex flex-col shadow-brutal shadow-black/40"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Add Objection</p>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center hover:bg-bg-raised">
                    <X className="w-4 h-4 text-text-muted" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Objection *</label>
                    <textarea
                        className="input-os w-full h-20 resize-none text-sm"
                        placeholder="What did the prospect say?"
                        value={objectionText}
                        onChange={e => setObjectionText(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Your Handling Response</label>
                    <textarea
                        className="input-os w-full h-24 resize-none text-sm"
                        placeholder="How did you respond?"
                        value={handlingResponse}
                        onChange={e => setHandlingResponse(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Source</label>
                        <select className="input-os w-full text-sm" value={source} onChange={e => setSource(e.target.value as Source)}>
                            <option value="manual">Manual</option>
                            <option value="real_call">Real Call</option>
                            <option value="simulation">Simulation</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Score (0–100)</label>
                        <input
                            type="number" min={0} max={100}
                            className="input-os w-full text-sm"
                            placeholder="70"
                            value={score ?? ''}
                            onChange={e => setScore(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-text-muted block mb-1">Tags</label>
                    <div className="flex gap-2">
                        <input
                            className="input-os flex-1 text-sm"
                            placeholder="e.g. pricing, timing"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                        />
                        <button onClick={handleAddTag} className="btn-ghost px-3 text-xs">Add</button>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map(t => (
                                <span key={t} className="flex items-center gap-1 text-xs bg-bg-raised border border-border px-2 py-0.5">
                                    {t}
                                    <button onClick={() => setTags(p => p.filter(x => x !== t))} className="text-text-muted hover:text-accent">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="p-5 border-t border-border">
                <button
                    onClick={handleSubmit}
                    disabled={!objectionText.trim() || addObjection.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {addObjection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Save Objection
                </button>
            </div>
        </motion.div>
    )
}

function ObjectionEntryCard({ entry, isManager }: { entry: any; isManager: boolean }) {
    const [expanded, setExpanded] = useState(false)
    const pinMutation = usePinObjection()
    const sourceConfig = SOURCE_CONFIG[entry.source as Source] || SOURCE_CONFIG.manual

    const handlePin = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await pinMutation.mutateAsync({ id: entry.id, pinned: !entry.pinned })
    }

    return (
        <motion.div
            layout
            className={`border bg-bg-surface transition-all ${entry.pinned ? 'border-accent/40' : 'border-border'}`}
        >
            <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => setExpanded(v => !v)}
            >
                {entry.pinned && (
                    <div className="w-0.5 h-full bg-accent absolute left-0 top-0" />
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm text-text-primary leading-relaxed line-clamp-2">{entry.objection_text}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] border px-1.5 py-0.5 uppercase tracking-widest ${sourceConfig.color}`}>
                            {sourceConfig.label}
                        </span>
                        <ScoreChip score={entry.score} />
                        {entry.tags?.map((tag: string) => (
                            <span key={tag} className="text-[9px] text-text-muted bg-bg-raised border border-border px-1 py-0.5">{tag}</span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {isManager && (
                        <button onClick={handlePin} className="w-6 h-6 flex items-center justify-center hover:bg-bg-raised transition-colors">
                            {entry.pinned ? <PinOff className="w-3.5 h-3.5 text-accent" /> : <Pin className="w-3.5 h-3.5 text-text-muted" />}
                        </button>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </div>
            </div>

            <AnimatePresence>
                {expanded && entry.handling_response && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-border/40 pt-3">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1.5">Handling Response</p>
                            <p className="text-sm text-text-secondary leading-relaxed">{entry.handling_response}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

export default function ObjectionLibrary() {
    const { user, isManager } = useAuth()
    const { isRevIntel } = useTier()
    const [viewMode, setViewMode] = useState<ViewMode>('personal')
    const [showAddPanel, setShowAddPanel] = useState(false)
    const { data: entries = [], isLoading, searchQuery, handleSearchChange } = useObjectionLibrary(
        user?.id,
        null, // team_id: in production, fetch from user profile
        viewMode
    )

    const pinnedEntries = entries.filter(e => e.pinned)
    const unpinnedEntries = entries.filter(e => !e.pinned)

    return (
        <div className="pb-12 space-y-6 relative">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">Objection Library</h1>
                    <p className="text-sm text-text-muted mt-0.5">{entries.length} entries</p>
                </div>
                <button
                    onClick={() => setShowAddPanel(true)}
                    className="btn-primary flex items-center gap-2 text-xs"
                >
                    <Plus className="w-4 h-4" />
                    Add Objection
                </button>
            </div>

            {/* Search + view toggle */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <input
                        className="input-os w-full pl-9 text-sm"
                        placeholder="Semantic search objections..."
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                    />
                </div>
                <div className="flex border border-border">
                    <button
                        onClick={() => setViewMode('personal')}
                        className={`px-3 py-2 text-xs uppercase tracking-widest transition-all ${viewMode === 'personal' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-raised'}`}
                    >
                        Mine
                    </button>
                    <button
                        onClick={() => setViewMode('team')}
                        disabled={!isRevIntel}
                        className={`px-3 py-2 text-xs uppercase tracking-widest transition-all ${viewMode === 'team' ? 'bg-accent text-white' : !isRevIntel ? 'text-text-muted opacity-40 cursor-not-allowed' : 'text-text-muted hover:bg-bg-raised'}`}
                    >
                        Team {!isRevIntel && '🔒'}
                    </button>
                </div>
            </div>

            {/* Team view tier gate */}
            {viewMode === 'team' && !isRevIntel && (
                <TierGate>
                    <div className="min-h-[200px]" />
                </TierGate>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                </div>
            )}

            {/* Entries */}
            {!isLoading && (
                <div className="space-y-2">
                    {pinnedEntries.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-accent flex items-center gap-1.5">
                                <Pin className="w-3 h-3" />
                                Field Priority
                            </p>
                            {pinnedEntries.map(e => (
                                <ObjectionEntryCard key={e.id} entry={e} isManager={isManager} />
                            ))}
                        </div>
                    )}

                    {unpinnedEntries.length === 0 && pinnedEntries.length === 0 && (
                        <div className="card-os border border-border p-10 text-center space-y-3">
                            <Search className="w-6 h-6 text-text-muted mx-auto" />
                            <p className="text-sm text-text-secondary">No objections yet.</p>
                            <p className="text-xs text-text-muted">They'll appear here automatically after training sessions, or add them manually.</p>
                        </div>
                    )}

                    {unpinnedEntries.map((e, i) => (
                        <motion.div
                            key={e.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                        >
                            <ObjectionEntryCard entry={e} isManager={isManager} />
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add panel */}
            <AnimatePresence>
                {showAddPanel && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-30"
                            onClick={() => setShowAddPanel(false)}
                        />
                        <AddObjectionPanel onClose={() => setShowAddPanel(false)} />
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
