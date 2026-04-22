import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { showSuccess, showError } from '../../utils/toast';
import { X, Plus, Trash2 } from 'lucide-react';

interface Trigger {
    trigger_phrase_or_topic: string;
    positive_or_negative: string;
    reaction: string;
}

interface PersonalityProfile {
    patience_level: number;
    detail_orientation: number;
    risk_tolerance: number;
    decision_speed: number;
    communication_style: string;
}

interface PersonaData {
    id?: string;
    name: string;
    title: string;
    seniority: string;
    personality_profile: PersonalityProfile;
    priorities: string[];
    skepticisms: string[];
    triggers: Trigger[];
    reports_to: string;
    direct_reports_count: number;
    tenure_at_company: string;
    background: string;
}

const EMPTY_PERSONA: PersonaData = {
    name: '',
    title: '',
    seniority: '',
    personality_profile: {
        patience_level: 50,
        detail_orientation: 50,
        risk_tolerance: 50,
        decision_speed: 50,
        communication_style: 'Direct',
    },
    priorities: [],
    skepticisms: [],
    triggers: [],
    reports_to: '',
    direct_reports_count: 0,
    tenure_at_company: '',
    background: '',
};

const SENIORITIES = ['C-Suite', 'VP', 'Director', 'Manager', 'Individual Contributor'];
const COMMUNICATION_STYLES = ['Direct', 'Analytical', 'Collaborative', 'Reserved', 'Skeptical', 'Methodical', 'Practical'];

interface Props {
    companyId: string;
    personaId?: string;
    onClose: () => void;
    onSaved: () => void;
}

export default function PersonaForm({ companyId, personaId, onClose, onSaved }: Props) {
    const [form, setForm] = useState<PersonaData>(EMPTY_PERSONA);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newPriority, setNewPriority] = useState('');
    const [newSkepticism, setNewSkepticism] = useState('');

    useEffect(() => {
        if (personaId) fetchPersona();
    }, [personaId]);

    const fetchPersona = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/${companyId}/personas`,
            { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        const data = await res.json();
        if (!res.ok) { showError('Failed to load persona'); setLoading(false); return; }
        const persona = (data as any[]).find((p: any) => p.id === personaId);
        if (persona) {
            setForm({
                id: persona.id,
                name: persona.name,
                title: persona.title,
                seniority: persona.seniority,
                personality_profile: persona.personality_profile || EMPTY_PERSONA.personality_profile,
                priorities: persona.priorities || [],
                skepticisms: persona.skepticisms || [],
                triggers: persona.triggers || [],
                reports_to: persona.reports_to || '',
                direct_reports_count: persona.direct_reports_count || 0,
                tenure_at_company: persona.tenure_at_company || '',
                background: persona.background || '',
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!form.name || !form.title || !form.seniority) {
            showError('Name, title, and seniority are required');
            return;
        }
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const body: Record<string, unknown> = {
                name: form.name,
                title: form.title,
                seniority: form.seniority,
                personality_profile: form.personality_profile,
                priorities: form.priorities,
                skepticisms: form.skepticisms,
                triggers: form.triggers,
                reports_to: form.reports_to || undefined,
                direct_reports_count: form.direct_reports_count,
                tenure_at_company: form.tenure_at_company || undefined,
                background: form.background || undefined,
            };

            const fnUrl = personaId
                ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/personas/${personaId}`
                : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/${companyId}/personas`;

            const res = await fetch(fnUrl, {
                method: personaId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(body),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to save');

            showSuccess(personaId ? 'Persona updated' : 'Persona created');
            onSaved();
        } catch (error: any) {
            showError('Failed to save persona', error.message);
        } finally {
            setSaving(false);
        }
    };

    const updateProfile = (field: keyof PersonalityProfile, value: number | string) =>
        setForm(prev => ({
            ...prev,
            personality_profile: { ...prev.personality_profile, [field]: value },
        }));

    const addTrigger = () =>
        setForm(prev => ({
            ...prev,
            triggers: [...prev.triggers, { trigger_phrase_or_topic: '', positive_or_negative: 'negative', reaction: '' }],
        }));

    const updateTrigger = (i: number, field: keyof Trigger, value: string) =>
        setForm(prev => ({
            ...prev,
            triggers: prev.triggers.map((t, idx) => idx === i ? { ...t, [field]: value } : t),
        }));

    const removeTrigger = (i: number) =>
        setForm(prev => ({ ...prev, triggers: prev.triggers.filter((_, idx) => idx !== i) }));

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="animate-spin h-10 w-10 border-2 border-[rgb(var(--border-default))] border-t-[rgb(var(--accent-primary))]" />
            </div>
        );
    }

    const sliders: { key: keyof PersonalityProfile; label: string; low: string; high: string }[] = [
        { key: 'patience_level', label: 'Patience', low: 'Impatient', high: 'Patient' },
        { key: 'detail_orientation', label: 'Detail Orientation', low: 'Big picture', high: 'Detail-focused' },
        { key: 'risk_tolerance', label: 'Risk Tolerance', low: 'Risk-averse', high: 'Risk-taking' },
        { key: 'decision_speed', label: 'Decision Speed', low: 'Deliberate', high: 'Snap decisions' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border-default))] px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-display font-bold text-[rgb(var(--text-primary))]">
                        {personaId ? 'Edit Persona' : 'New Persona'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Name *</label>
                            <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Sarah Chen" className="w-full input-os text-sm" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Title *</label>
                            <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder="VP of Sales" className="w-full input-os text-sm" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Seniority *</label>
                            <select value={form.seniority} onChange={e => setForm(prev => ({ ...prev, seniority: e.target.value }))} className="w-full input-os text-sm">
                                <option value="">Select...</option>
                                {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Reports To</label>
                            <input type="text" value={form.reports_to} onChange={e => setForm(prev => ({ ...prev, reports_to: e.target.value }))} placeholder="CRO" className="w-full input-os text-sm" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Direct Reports</label>
                            <input type="number" min={0} value={form.direct_reports_count} onChange={e => setForm(prev => ({ ...prev, direct_reports_count: parseInt(e.target.value) || 0 }))} className="w-full input-os text-sm" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Tenure</label>
                            <input type="text" value={form.tenure_at_company} onChange={e => setForm(prev => ({ ...prev, tenure_at_company: e.target.value }))} placeholder="3 years" className="w-full input-os text-sm" />
                        </div>
                    </div>

                    {/* Personality Profile */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-3">Personality Profile</label>
                        <div className="p-4 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] space-y-4">
                            {sliders.map(({ key, label, low, high }) => (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-[rgb(var(--text-secondary))]">{label}</span>
                                        <span className="text-xs font-mono text-[rgb(var(--text-muted))]">{form.personality_profile[key] as number}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-[rgb(var(--text-muted))] w-20 text-right">{low}</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={form.personality_profile[key] as number}
                                            onChange={e => updateProfile(key, parseInt(e.target.value))}
                                            className="flex-1 accent-[rgb(var(--accent-primary))]"
                                        />
                                        <span className="text-[9px] text-[rgb(var(--text-muted))] w-20">{high}</span>
                                    </div>
                                </div>
                            ))}
                            <div>
                                <label className="block text-xs text-[rgb(var(--text-secondary))] mb-1">Communication Style</label>
                                <select
                                    value={form.personality_profile.communication_style}
                                    onChange={e => updateProfile('communication_style', e.target.value)}
                                    className="w-full input-os text-sm"
                                >
                                    {COMMUNICATION_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Priorities */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-2">Priorities</label>
                        <div className="space-y-1 mb-2">
                            {form.priorities.map((p, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm text-[rgb(var(--text-secondary))]">{p}</span>
                                    <button onClick={() => setForm(prev => ({ ...prev, priorities: prev.priorities.filter((_, idx) => idx !== i) }))} className="p-1 text-[rgb(var(--text-muted))] hover:text-status-danger">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newPriority} onChange={e => setNewPriority(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newPriority.trim()) { setForm(prev => ({ ...prev, priorities: [...prev.priorities, newPriority.trim()] })); setNewPriority(''); } } }} placeholder="Add priority..." className="flex-1 input-os text-sm" />
                            <button type="button" onClick={() => { if (newPriority.trim()) { setForm(prev => ({ ...prev, priorities: [...prev.priorities, newPriority.trim()] })); setNewPriority(''); } }} className="px-3 py-2 border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--accent-primary))] transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Skepticisms */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-2">Skepticisms</label>
                        <div className="space-y-1 mb-2">
                            {form.skepticisms.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm text-[rgb(var(--text-secondary))]">{s}</span>
                                    <button onClick={() => setForm(prev => ({ ...prev, skepticisms: prev.skepticisms.filter((_, idx) => idx !== i) }))} className="p-1 text-[rgb(var(--text-muted))] hover:text-status-danger">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newSkepticism} onChange={e => setNewSkepticism(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newSkepticism.trim()) { setForm(prev => ({ ...prev, skepticisms: [...prev.skepticisms, newSkepticism.trim()] })); setNewSkepticism(''); } } }} placeholder="Add skepticism..." className="flex-1 input-os text-sm" />
                            <button type="button" onClick={() => { if (newSkepticism.trim()) { setForm(prev => ({ ...prev, skepticisms: [...prev.skepticisms, newSkepticism.trim()] })); setNewSkepticism(''); } }} className="px-3 py-2 border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--accent-primary))] transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Triggers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))]">Triggers</label>
                            <button type="button" onClick={addTrigger} className="text-[9px] font-black uppercase text-[rgb(var(--accent-primary))] hover:opacity-80 flex items-center gap-1">
                                <Plus className="h-3 w-3" /> Add
                            </button>
                        </div>
                        <div className="space-y-3">
                            {form.triggers.map((t, i) => (
                                <div key={i} className="p-3 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] space-y-2">
                                    <div className="flex items-start gap-2">
                                        <input type="text" value={t.trigger_phrase_or_topic} onChange={e => updateTrigger(i, 'trigger_phrase_or_topic', e.target.value)} placeholder="Trigger phrase or topic..." className="flex-1 input-os text-sm" />
                                        <select value={t.positive_or_negative} onChange={e => updateTrigger(i, 'positive_or_negative', e.target.value)} className="input-os text-sm w-28">
                                            <option value="positive">Positive</option>
                                            <option value="negative">Negative</option>
                                        </select>
                                        <button onClick={() => removeTrigger(i)} className="p-1 text-[rgb(var(--text-muted))] hover:text-status-danger"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                    <input type="text" value={t.reaction} onChange={e => updateTrigger(i, 'reaction', e.target.value)} placeholder="Reaction..." className="w-full input-os text-sm" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Background */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-1">Background</label>
                        <textarea
                            value={form.background}
                            onChange={e => setForm(prev => ({ ...prev, background: e.target.value }))}
                            placeholder="Career background, motivations, context..."
                            rows={4}
                            className="w-full input-os text-sm"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[rgb(var(--bg-surface))] border-t border-[rgb(var(--border-default))] px-6 py-4 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-[rgb(var(--text-secondary))] border border-[rgb(var(--border-default))] hover:border-[rgb(var(--text-muted))] transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2 text-sm disabled:opacity-50">
                        {saving ? 'Saving...' : personaId ? 'Update Persona' : 'Create Persona'}
                    </button>
                </div>
            </div>
        </div>
    );
}
