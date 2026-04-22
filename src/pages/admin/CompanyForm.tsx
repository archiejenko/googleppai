import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { showSuccess, showError } from '../../utils/toast';
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface IndustryProfile {
    slug: string;
    display_name: string;
    vocabulary: unknown;
    objection_patterns: unknown;
    compliance_flags: unknown;
    buying_committee_structure: unknown;
}

interface PainPoint {
    pain: string;
    severity: number;
    current_workaround: string;
    cost_of_inaction: string;
}

interface RecentEvent {
    event: string;
    impact_on_buying: string;
    date?: string;
}

interface CompetitiveLandscape {
    current_vendors: string[];
    considered_alternatives: string[];
    switching_barriers: string[];
}

interface CompanyData {
    id?: string;
    name: string;
    industry_slug: string;
    size: string;
    stage: string;
    difficulty_tier: string;
    tech_stack: string[];
    strategic_priorities: string[];
    pain_points: PainPoint[];
    recent_events: RecentEvent[];
    competitive_landscape: CompetitiveLandscape;
    override_vocabulary: unknown | null;
    override_objection_patterns: unknown | null;
    override_compliance_flags: unknown | null;
    override_buying_committee: unknown | null;
}

const EMPTY_COMPANY: CompanyData = {
    name: '',
    industry_slug: '',
    size: '',
    stage: '',
    difficulty_tier: 'medium',
    tech_stack: [],
    strategic_priorities: [],
    pain_points: [],
    recent_events: [],
    competitive_landscape: { current_vendors: [], considered_alternatives: [], switching_barriers: [] },
    override_vocabulary: null,
    override_objection_patterns: null,
    override_compliance_flags: null,
    override_buying_committee: null,
};

const SIZES = ['startup', 'smb', 'mid-market', 'enterprise'];
const STAGES = ['seed', 'series-a', 'series-b', 'series-c', 'growth', 'public'];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'nightmare'];

interface Props {
    companyId?: string;
    onClose: () => void;
    onSaved: () => void;
}

export default function CompanyForm({ companyId, onClose, onSaved }: Props) {
    const [form, setForm] = useState<CompanyData>(EMPTY_COMPANY);
    const [industryProfiles, setIndustryProfiles] = useState<IndustryProfile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<IndustryProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [advancedOverrides, setAdvancedOverrides] = useState({
        vocabulary: '',
        objection_patterns: '',
        compliance_flags: '',
        buying_committee: '',
    });

    const [newTech, setNewTech] = useState('');
    const [newPriority, setNewPriority] = useState('');

    useEffect(() => {
        fetchIndustryProfiles();
        if (companyId) fetchCompany();
    }, [companyId]);

    const fetchIndustryProfiles = async () => {
        const { data } = await supabase.from('industry_profiles').select('slug, display_name, vocabulary, objection_patterns, compliance_flags, buying_committee_structure');
        if (data) setIndustryProfiles(data);
    };

    const fetchCompany = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase.functions.invoke('accounts-api', {
            method: 'GET',
        });
        if (error || !data) {
            showError('Failed to load company');
            setLoading(false);
            return;
        }
        const company = (data as unknown[]).find((c: any) => c.id === companyId) as any;
        if (company) {
            setForm({
                id: company.id,
                name: company.name,
                industry_slug: company.industry_slug,
                size: company.size,
                stage: company.stage,
                difficulty_tier: company.difficulty_tier || 'medium',
                tech_stack: company.tech_stack || [],
                strategic_priorities: company.strategic_priorities || [],
                pain_points: company.pain_points || [],
                recent_events: company.recent_events || [],
                competitive_landscape: company.competitive_landscape || { current_vendors: [], considered_alternatives: [], switching_barriers: [] },
                override_vocabulary: company.override_vocabulary,
                override_objection_patterns: company.override_objection_patterns,
                override_compliance_flags: company.override_compliance_flags,
                override_buying_committee: company.override_buying_committee,
            });
            if (company.override_vocabulary) setAdvancedOverrides(prev => ({ ...prev, vocabulary: JSON.stringify(company.override_vocabulary, null, 2) }));
            if (company.override_objection_patterns) setAdvancedOverrides(prev => ({ ...prev, objection_patterns: JSON.stringify(company.override_objection_patterns, null, 2) }));
            if (company.override_compliance_flags) setAdvancedOverrides(prev => ({ ...prev, compliance_flags: JSON.stringify(company.override_compliance_flags, null, 2) }));
            if (company.override_buying_committee) setAdvancedOverrides(prev => ({ ...prev, buying_committee: JSON.stringify(company.override_buying_committee, null, 2) }));
            if (company.override_vocabulary || company.override_objection_patterns || company.override_compliance_flags || company.override_buying_committee) {
                setShowAdvanced(true);
            }
            const profile = industryProfiles.find(p => p.slug === company.industry_slug) || null;
            setSelectedProfile(profile);
        }
        setLoading(false);
    };

    const handleIndustryChange = (slug: string) => {
        setForm(prev => ({ ...prev, industry_slug: slug }));
        const profile = industryProfiles.find(p => p.slug === slug) || null;
        setSelectedProfile(profile);
    };

    const handleSave = async () => {
        if (!form.name || !form.industry_slug || !form.size || !form.stage) {
            showError('Please fill in all required fields');
            return;
        }
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                name: form.name,
                industry_slug: form.industry_slug,
                size: form.size,
                stage: form.stage,
                difficulty_tier: form.difficulty_tier,
                tech_stack: form.tech_stack,
                strategic_priorities: form.strategic_priorities,
                pain_points: form.pain_points,
                recent_events: form.recent_events,
                competitive_landscape: form.competitive_landscape,
            };

            if (advancedOverrides.vocabulary.trim()) {
                try { body.override_vocabulary = JSON.parse(advancedOverrides.vocabulary); } catch { showError('Invalid JSON in vocabulary override'); setSaving(false); return; }
            }
            if (advancedOverrides.objection_patterns.trim()) {
                try { body.override_objection_patterns = JSON.parse(advancedOverrides.objection_patterns); } catch { showError('Invalid JSON in objection patterns override'); setSaving(false); return; }
            }
            if (advancedOverrides.compliance_flags.trim()) {
                try { body.override_compliance_flags = JSON.parse(advancedOverrides.compliance_flags); } catch { showError('Invalid JSON in compliance flags override'); setSaving(false); return; }
            }
            if (advancedOverrides.buying_committee.trim()) {
                try { body.override_buying_committee = JSON.parse(advancedOverrides.buying_committee); } catch { showError('Invalid JSON in buying committee override'); setSaving(false); return; }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const fnUrl = companyId
                ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/${companyId}`
                : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api`;

            const res = await fetch(fnUrl, {
                method: companyId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(body),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to save');

            showSuccess(companyId ? 'Company updated' : 'Company created');
            onSaved();
        } catch (error: any) {
            showError('Failed to save company', error.message);
        } finally {
            setSaving(false);
        }
    };

    // ── List helpers ──
    const addPainPoint = () => setForm(prev => ({
        ...prev,
        pain_points: [...prev.pain_points, { pain: '', severity: 3, current_workaround: '', cost_of_inaction: '' }],
    }));

    const updatePainPoint = (i: number, field: keyof PainPoint, value: string | number) =>
        setForm(prev => ({
            ...prev,
            pain_points: prev.pain_points.map((p, idx) => idx === i ? { ...p, [field]: value } : p),
        }));

    const removePainPoint = (i: number) => setForm(prev => ({
        ...prev,
        pain_points: prev.pain_points.filter((_, idx) => idx !== i),
    }));

    const addRecentEvent = () => setForm(prev => ({
        ...prev,
        recent_events: [...prev.recent_events, { event: '', impact_on_buying: '', date: '' }],
    }));

    const updateRecentEvent = (i: number, field: keyof RecentEvent, value: string) =>
        setForm(prev => ({
            ...prev,
            recent_events: prev.recent_events.map((e, idx) => idx === i ? { ...e, [field]: value } : e),
        }));

    const removeRecentEvent = (i: number) => setForm(prev => ({
        ...prev,
        recent_events: prev.recent_events.filter((_, idx) => idx !== i),
    }));

    const addToStringList = (field: 'current_vendors' | 'considered_alternatives' | 'switching_barriers', value: string) => {
        if (!value.trim()) return;
        setForm(prev => ({
            ...prev,
            competitive_landscape: {
                ...prev.competitive_landscape,
                [field]: [...prev.competitive_landscape[field], value.trim()],
            },
        }));
    };

    const removeFromStringList = (field: 'current_vendors' | 'considered_alternatives' | 'switching_barriers', i: number) => {
        setForm(prev => ({
            ...prev,
            competitive_landscape: {
                ...prev.competitive_landscape,
                [field]: prev.competitive_landscape[field].filter((_, idx) => idx !== i),
            },
        }));
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="animate-spin h-10 w-10 border-2 border-[rgb(var(--border-default))] border-t-[rgb(var(--accent-primary))]" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border-default))] px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-display font-bold text-[rgb(var(--text-primary))]">
                        {companyId ? 'Edit Company' : 'New Company'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Industry Selection */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-2">
                            Industry *
                        </label>
                        <select
                            value={form.industry_slug}
                            onChange={e => handleIndustryChange(e.target.value)}
                            className="w-full input-os text-sm"
                        >
                            <option value="">Select industry...</option>
                            {industryProfiles.map(p => (
                                <option key={p.slug} value={p.slug}>{p.display_name}</option>
                            ))}
                        </select>
                        {selectedProfile && (
                            <p className="mt-1 text-[10px] text-[rgb(var(--text-muted))]">
                                Industry defaults will be inherited. Override only what's specific to this company.
                            </p>
                        )}
                    </div>

                    {/* Basic Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Name *</label>
                            <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Acme Corp" className="w-full input-os text-sm" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Size *</label>
                            <select value={form.size} onChange={e => setForm(prev => ({ ...prev, size: e.target.value }))} className="w-full input-os text-sm">
                                <option value="">Select...</option>
                                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Stage *</label>
                            <select value={form.stage} onChange={e => setForm(prev => ({ ...prev, stage: e.target.value }))} className="w-full input-os text-sm">
                                <option value="">Select...</option>
                                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Difficulty</label>
                            <select value={form.difficulty_tier} onChange={e => setForm(prev => ({ ...prev, difficulty_tier: e.target.value }))} className="w-full input-os text-sm">
                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Tech Stack */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-2">Tech Stack</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {form.tech_stack.map((t, i) => (
                                <span key={i} className="flex items-center gap-1 px-2 py-1 text-xs bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] text-[rgb(var(--text-secondary))]">
                                    {t}
                                    <button onClick={() => setForm(prev => ({ ...prev, tech_stack: prev.tech_stack.filter((_, idx) => idx !== i) }))} className="text-[rgb(var(--text-muted))] hover:text-status-danger">
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newTech} onChange={e => setNewTech(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newTech.trim()) { setForm(prev => ({ ...prev, tech_stack: [...prev.tech_stack, newTech.trim()] })); setNewTech(''); } } }} placeholder="Add technology..." className="flex-1 input-os text-sm" />
                            <button type="button" onClick={() => { if (newTech.trim()) { setForm(prev => ({ ...prev, tech_stack: [...prev.tech_stack, newTech.trim()] })); setNewTech(''); } }} className="px-3 py-2 border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--accent-primary))] transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Strategic Priorities */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-2">Strategic Priorities</label>
                        <div className="space-y-1 mb-2">
                            {form.strategic_priorities.map((p, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm text-[rgb(var(--text-secondary))]">{p}</span>
                                    <button onClick={() => setForm(prev => ({ ...prev, strategic_priorities: prev.strategic_priorities.filter((_, idx) => idx !== i) }))} className="p-1 text-[rgb(var(--text-muted))] hover:text-status-danger">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newPriority} onChange={e => setNewPriority(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newPriority.trim()) { setForm(prev => ({ ...prev, strategic_priorities: [...prev.strategic_priorities, newPriority.trim()] })); setNewPriority(''); } } }} placeholder="Add priority..." className="flex-1 input-os text-sm" />
                            <button type="button" onClick={() => { if (newPriority.trim()) { setForm(prev => ({ ...prev, strategic_priorities: [...prev.strategic_priorities, newPriority.trim()] })); setNewPriority(''); } }} className="px-3 py-2 border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--accent-primary))] transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Pain Points */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">
                                Pain Points
                                {selectedProfile && <span className="ml-2 text-[rgb(var(--accent-primary))] opacity-60">Company-specific</span>}
                            </label>
                            <button type="button" onClick={addPainPoint} className="text-[9px] font-black uppercase text-[rgb(var(--accent-primary))] hover:opacity-80 flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-3">
                            {form.pain_points.map((pp, i) => (
                                <div key={i} className="p-3 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] space-y-2">
                                    <div className="flex items-start gap-2">
                                        <input type="text" value={pp.pain} onChange={e => updatePainPoint(i, 'pain', e.target.value)} placeholder="Pain point..." className="flex-1 input-os text-sm" />
                                        <select value={pp.severity} onChange={e => updatePainPoint(i, 'severity', parseInt(e.target.value))} className="input-os text-sm w-20">
                                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}/5</option>)}
                                        </select>
                                        <button onClick={() => removePainPoint(i)} className="p-1 text-[rgb(var(--text-muted))] hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                    <input type="text" value={pp.current_workaround} onChange={e => updatePainPoint(i, 'current_workaround', e.target.value)} placeholder="Current workaround..." className="w-full input-os text-sm" />
                                    <input type="text" value={pp.cost_of_inaction} onChange={e => updatePainPoint(i, 'cost_of_inaction', e.target.value)} placeholder="Cost of inaction..." className="w-full input-os text-sm" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Events */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">Recent Events</label>
                            <button type="button" onClick={addRecentEvent} className="text-[9px] font-black uppercase text-[rgb(var(--accent-primary))] hover:opacity-80 flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-3">
                            {form.recent_events.map((ev, i) => (
                                <div key={i} className="p-3 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] space-y-2">
                                    <div className="flex items-start gap-2">
                                        <input type="text" value={ev.event} onChange={e => updateRecentEvent(i, 'event', e.target.value)} placeholder="Event..." className="flex-1 input-os text-sm" />
                                        <input type="text" value={ev.date || ''} onChange={e => updateRecentEvent(i, 'date', e.target.value)} placeholder="Date..." className="input-os text-sm w-32" />
                                        <button onClick={() => removeRecentEvent(i)} className="p-1 text-[rgb(var(--text-muted))] hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                    <input type="text" value={ev.impact_on_buying} onChange={e => updateRecentEvent(i, 'impact_on_buying', e.target.value)} placeholder="Impact on buying..." className="w-full input-os text-sm" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Competitive Landscape */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-2">Competitive Landscape</label>
                        <div className="p-3 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] space-y-3">
                            {(['current_vendors', 'considered_alternatives', 'switching_barriers'] as const).map(field => (
                                <div key={field}>
                                    <label className="block text-[10px] text-[rgb(var(--text-secondary))] mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        {form.competitive_landscape[field].map((v, i) => (
                                            <span key={i} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-subtle))] text-[rgb(var(--text-secondary))]">
                                                {v}
                                                <button onClick={() => removeFromStringList(field, i)} className="text-[rgb(var(--text-muted))] hover:text-status-danger"><X className="h-3 w-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`Add ${field.replace(/_/g, ' ')}...`}
                                        className="w-full input-os text-sm"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addToStringList(field, (e.target as HTMLInputElement).value);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Overrides */}
                    {selectedProfile && (
                        <div className="border border-[rgb(var(--border-subtle))]">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[rgb(var(--bg-canvas))] transition-colors"
                            >
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">
                                    Advanced Overrides
                                </span>
                                {showAdvanced ? <ChevronDown className="h-4 w-4 text-[rgb(var(--text-muted))]" /> : <ChevronRight className="h-4 w-4 text-[rgb(var(--text-muted))]" />}
                            </button>
                            {showAdvanced && (
                                <div className="px-4 pb-4 space-y-4">
                                    <p className="text-[10px] text-[rgb(var(--text-muted))]">
                                        These inherit from the industry profile. Only override if this company needs unique behaviour.
                                    </p>
                                    {([
                                        ['vocabulary', 'Vocabulary'],
                                        ['objection_patterns', 'Objection Patterns'],
                                        ['compliance_flags', 'Compliance Flags'],
                                        ['buying_committee', 'Buying Committee'],
                                    ] as const).map(([key, label]) => (
                                        <div key={key}>
                                            <label className="block text-[10px] text-[rgb(var(--text-secondary))] mb-1">{label} (JSON)</label>
                                            <textarea
                                                value={advancedOverrides[key]}
                                                onChange={e => setAdvancedOverrides(prev => ({ ...prev, [key]: e.target.value }))}
                                                placeholder={`Leave empty to inherit from ${selectedProfile.display_name}...`}
                                                rows={4}
                                                className="w-full input-os text-xs font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[rgb(var(--bg-surface))] border-t border-[rgb(var(--border-default))] px-6 py-4 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-[rgb(var(--text-secondary))] border border-[rgb(var(--border-default))] hover:border-[rgb(var(--text-muted))] transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2 text-sm disabled:opacity-50">
                        {saving ? 'Saving...' : companyId ? 'Update Company' : 'Create Company'}
                    </button>
                </div>
            </div>
        </div>
    );
}
