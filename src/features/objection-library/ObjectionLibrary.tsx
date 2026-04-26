import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Pin, PinOff, X, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTier } from '../../context/TierContext'
import { useObjectionLibrary, useAddObjection, usePinObjection } from '../../hooks/useObjectionLibrary'
import TierGate from '../../components/shared/TierGate'
import { toast } from 'sonner'

type Source = 'simulation' | 'real_call' | 'manual'
type ViewMode = 'personal' | 'team'

function ScoreChip({ score }: { score: number | null }) {
    if (score == null) return null
    const pillClass = score >= 80 ? 'pill pill-green' : score >= 60 ? 'pill pill-amber' : 'pill pill-coral'
    return (
        <span className={pillClass}>{score}%</span>
    )
}

const CATEGORY_COLORS: Record<string, string> = {
    price: 'bg-[rgba(251,191,36,0.12)] text-[#FBBF24]',
    pricing: 'bg-[rgba(251,191,36,0.12)] text-[#FBBF24]',
    competitor: 'bg-[rgba(96,165,250,0.12)] text-[#60A5FA]',
    timing: 'bg-[rgba(167,139,250,0.12)] text-[#A78BFA]',
    authority: 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]',
    need: 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80]',
}

function CategoryPill({ tag }: { tag: string }) {
    const color = CATEGORY_COLORS[tag.toLowerCase()] || 'bg-[rgba(74,85,103,0.15)] text-[#7d8a98]'
    return (
        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${color}`}>
            {tag}
        </span>
    )
}

function getScoreColor(score: number | null): string {
    if (score == null) return '#7d8a98'
    if (score >= 80) return '#4ADE80'
    if (score >= 60) return '#FBBF24'
    return '#FF6B6B'
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
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-[rgb(var(--bg-surface-raised))] border-l border-[rgb(var(--border-default))] z-40 flex flex-col shadow-xl"
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border-default))]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#4a5567]">Add Objection</p>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgb(var(--bg-surface-raised))]">
                    <X className="w-4 h-4 text-[#4a5567]" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-[#4a5567] block mb-1">Objection *</label>
                    <textarea
                        className="input-os w-full h-20 resize-none text-sm"
                        placeholder="What did the prospect say?"
                        value={objectionText}
                        onChange={e => setObjectionText(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] text-[#4a5567] block mb-1">Your Handling Response</label>
                    <textarea
                        className="input-os w-full h-24 resize-none text-sm"
                        placeholder="How did you respond?"
                        value={handlingResponse}
                        onChange={e => setHandlingResponse(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-[#4a5567] block mb-1">Source</label>
                        <select className="input-os w-full text-sm" value={source} onChange={e => setSource(e.target.value as Source)}>
                            <option value="manual">Manual</option>
                            <option value="real_call">Real Call</option>
                            <option value="simulation">Simulation</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase tracking-[0.15em] text-[#4a5567] block mb-1">Score (0--100)</label>
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
                    <label className="text-[10px] uppercase tracking-[0.15em] text-[#4a5567] block mb-1">Tags</label>
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
                                <span key={t} className="flex items-center gap-1 text-xs bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded px-2 py-0.5">
                                    {t}
                                    <button onClick={() => setTags(p => p.filter(x => x !== t))} className="text-[#4a5567] hover:text-[#FF6B6B]">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="p-5 border-t border-[rgb(var(--border-default))]">
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
    const pinMutation = usePinObjection()
    const scoreColor = getScoreColor(entry.score)
    const scoreVal = entry.score ?? 0
    const primaryTag = entry.tags?.[0] || null

    const handlePin = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await pinMutation.mutateAsync({ id: entry.id, pinned: !entry.pinned })
    }

    return (
        <motion.div
            layout
            className={`bg-[rgb(var(--bg-surface-raised))] border rounded-lg p-5 flex flex-col gap-3 ${entry.pinned ? 'border-[#FF6B6B]/40' : 'border-[rgb(var(--border-default))]'}`}
        >
            {/* Quote */}
            <p className="text-[13px] italic text-[rgb(var(--text-primary))] leading-relaxed">
                &ldquo;{entry.objection_text}&rdquo;
            </p>

            {/* Category pill + pin */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {primaryTag && <CategoryPill tag={primaryTag} />}
                    {entry.tags?.slice(1).map((tag: string) => (
                        <CategoryPill key={tag} tag={tag} />
                    ))}
                </div>
                {isManager && (
                    <button onClick={handlePin} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                        {entry.pinned ? <PinOff className="w-3.5 h-3.5 text-[#FF6B6B]" /> : <Pin className="w-3.5 h-3.5 text-[#4a5567]" />}
                    </button>
                )}
            </div>

            {/* Stats row with bar */}
            {entry.score != null && (
                <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                        <div className="h-bar">
                            <div className="h-bar-fill" style={{ width: `${scoreVal}%`, background: scoreColor }} />
                        </div>
                    </div>
                    <span className="font-['Oswald'] text-xs font-semibold whitespace-nowrap" style={{ color: scoreColor }}>
                        {scoreVal}%
                    </span>
                </div>
            )}

            {/* Handling response / strategy */}
            {entry.handling_response && (
                <p className="text-[11px] text-[rgb(var(--text-secondary))] italic leading-relaxed">{entry.handling_response}</p>
            )}
        </motion.div>
    )
}

export default function ObjectionLibrary() {
    const { user, isManager } = useAuth()
    const { isRevIntel } = useTier()
    const [viewMode, setViewMode] = useState<ViewMode>('personal')
    const [showAddPanel, setShowAddPanel] = useState(false)
    const [activeFilter, setActiveFilter] = useState('all')
    const { data: entries = [], isLoading, searchQuery, handleSearchChange } = useObjectionLibrary(
        user?.id,
        null, // team_id: in production, fetch from user profile
        viewMode
    )

    const pinnedEntries = entries.filter(e => e.pinned)
    const unpinnedEntries = entries.filter(e => !e.pinned)
    const allVisible = [...pinnedEntries, ...unpinnedEntries]

    // Filter by tag category
    const filteredEntries = activeFilter === 'all'
        ? allVisible
        : allVisible.filter(e => e.tags?.some((t: string) => t.toLowerCase() === activeFilter.toLowerCase()))

    // Compute stats from live data
    const totalTracked = entries.length
    const scoredEntries = entries.filter(e => e.score != null)
    const avgHandleRate = scoredEntries.length > 0
        ? Math.round(scoredEntries.reduce((sum, e) => sum + (e.score || 0), 0) / scoredEntries.length)
        : 0

    // Collect unique tags for filter pills
    const allTags = [...new Set(entries.flatMap(e => (e.tags || []).map((t: string) => t.toLowerCase())))]
    const filterOptions = ['all', ...allTags]

    return (
        <div className="pb-12 relative">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 className="page-title">Objections</h1>
                    <p className="page-desc">Objection tracking, handle rates, and practice recommendations</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex border border-[rgb(var(--border-default))] rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('personal')}
                            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${viewMode === 'personal' ? 'bg-[rgb(var(--accent-primary))] text-white' : 'text-[#7d8a98] hover:bg-[rgb(var(--bg-surface-raised))]'}`}
                        >
                            Mine
                        </button>
                        <button
                            onClick={() => setViewMode('team')}
                            disabled={!isRevIntel}
                            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${viewMode === 'team' ? 'bg-[rgb(var(--accent-primary))] text-white' : !isRevIntel ? 'text-[#4a5567] opacity-40 cursor-not-allowed' : 'text-[#7d8a98] hover:bg-[rgb(var(--bg-surface-raised))]'}`}
                        >
                            Team
                        </button>
                    </div>
                    <button
                        onClick={() => setShowAddPanel(true)}
                        className="btn-primary flex items-center gap-2 text-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Add Objection
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Total Objections Tracked</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">{totalTracked}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Avg Handle Rate</div>
                    <div className="stat-value" style={{ color: getScoreColor(avgHandleRate) }}>{avgHandleRate}%</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Pinned</div>
                    <div className="stat-value text-[#FF6B6B]">{pinnedEntries.length}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                    <div className="stat-label">Sources</div>
                    <div className="stat-value text-[rgb(var(--text-primary))]">{[...new Set(entries.map(e => e.source))].length}</div>
                </div>
            </div>

            {/* Search bar */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a5567] pointer-events-none" />
                    <input
                        className="input-os w-full pl-9 text-sm"
                        placeholder="Search objections..."
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Filter Pills */}
            {filterOptions.length > 1 && (
                <div className="flex gap-1.5 mb-5 flex-wrap">
                    {filterOptions.map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`text-[11px] font-semibold px-3.5 py-1 rounded-full border transition-all ${
                                activeFilter === f
                                    ? 'bg-[rgb(var(--accent-primary))] text-white border-[rgb(var(--accent-primary))]'
                                    : 'bg-transparent text-[#7d8a98] border-[rgb(var(--border-default))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))]'
                            }`}
                        >
                            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {/* Team view tier gate */}
            {viewMode === 'team' && !isRevIntel && (
                <TierGate>
                    <div className="min-h-[200px]" />
                </TierGate>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-[rgb(var(--accent-primary))] animate-spin" />
                </div>
            )}

            {/* Entries Grid */}
            {!isLoading && (
                <>
                    {filteredEntries.length === 0 && (
                        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-10 text-center space-y-3">
                            <Search className="w-6 h-6 text-[#4a5567] mx-auto" />
                            <p className="text-sm text-[rgb(var(--text-secondary))]">No objections yet.</p>
                            <p className="text-xs text-[#4a5567]">They'll appear here automatically after training sessions, or add them manually.</p>
                        </div>
                    )}

                    {/* Pinned section */}
                    {pinnedEntries.length > 0 && activeFilter === 'all' && (
                        <div className="mb-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#FF6B6B] flex items-center gap-1.5 mb-3">
                                <Pin className="w-3 h-3" />
                                Field Priority
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {pinnedEntries.map(e => (
                                    <ObjectionEntryCard key={e.id} entry={e} isManager={isManager} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main grid */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        {(activeFilter === 'all' ? unpinnedEntries : filteredEntries.filter(e => !e.pinned)).map((e, i) => (
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
                </>
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
