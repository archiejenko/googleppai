import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { BookOpen, Plus, Save, Trash2, CheckCircle, HelpCircle, MessageSquare, Zap } from 'lucide-react';
import KineticCard from '../kinetic/KineticCard';
import { useAuth } from '../../context/AuthContext';

interface Playbook {
    id: string;
    title: string;
    structure: any;
    value_props: string[];
    mandatory_questions: string[];
    objection_responses: Record<string, string>;
    benchmark_transcripts: { title: string; content: string }[];
}

export default function PlaybookManager() {
    const { user } = useAuth();
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingPlaybook, setEditingPlaybook] = useState<Partial<Playbook>>({
        title: '',
        value_props: [],
        mandatory_questions: [],
        objection_responses: {},
        benchmark_transcripts: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPlaybooks();
    }, []);

    const fetchPlaybooks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('playbooks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPlaybooks(data || []);
            if (data?.[0]) handleSelect(data[0]);
        } catch (err) {
            console.error('Error fetching playbooks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (p: Playbook) => {
        setSelectedId(p.id);
        setEditingPlaybook(p);
    };

    const handleCreate = () => {
        setSelectedId(null);
        setEditingPlaybook({
            title: 'New Playbook',
            value_props: ['ROI increase', 'Effortless setup'],
            mandatory_questions: ['What is your current budget?', 'Who is the ultimate decision maker?'],
            objection_responses: {
                "Too expensive": "Acknowledge the cost, then focus on long-term value and ROI.",
                "Not now": "Understand the timeline and identify the cost of inaction."
            },
            benchmark_transcripts: [
                { title: 'Successful Discovery Call', content: 'Transcript of a great discovery call demonstrating key techniques.' },
                { title: 'Effective Objection Handling', content: 'Transcript showing how a common objection was successfully overcome.' }
            ]
        });
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const playbookData = {
                ...editingPlaybook,
                organization_id: (await supabase.from('profiles').select('team_id').eq('id', user.id).single()).data?.team_id
            };

            const { data, error } = selectedId
                ? await supabase.from('playbooks').update(playbookData).eq('id', selectedId).select().single()
                : await supabase.from('playbooks').insert(playbookData).select().single();

            if (error) throw error;

            await fetchPlaybooks();
            if (data) handleSelect(data);
            alert('Playbook saved successfully!');
        } catch (err) {
            console.error('Error saving playbook:', err);
            alert('Failed to save playbook.');
        } finally {
            setSaving(false);
        }
    };

    const handleArrayUpdate = (field: 'value_props' | 'mandatory_questions', value: string, index: number) => {
        const arr = [...(editingPlaybook[field] || [])];
        arr[index] = value;
        setEditingPlaybook({ ...editingPlaybook, [field]: arr });
    };

    const handleAddItem = (field: 'value_props' | 'mandatory_questions') => {
        setEditingPlaybook({
            ...editingPlaybook,
            [field]: [...(editingPlaybook[field] || []), '']
        });
    };

    const handleRemoveItem = (field: 'value_props' | 'mandatory_questions', index: number) => {
        const arr = [...(editingPlaybook[field] || [])];
        arr.splice(index, 1);
        setEditingPlaybook({ ...editingPlaybook, [field]: arr });
    };

    const handleBenchmarkUpdate = (index: number, key: 'title' | 'content', value: string) => {
        const updatedBenchmarks = [...(editingPlaybook.benchmark_transcripts || [])];
        updatedBenchmarks[index] = { ...updatedBenchmarks[index], [key]: value };
        setEditingPlaybook({ ...editingPlaybook, benchmark_transcripts: updatedBenchmarks });
    };

    const handleAddBenchmark = () => {
        setEditingPlaybook({
            ...editingPlaybook,
            benchmark_transcripts: [...(editingPlaybook.benchmark_transcripts || []), { title: '', content: '' }]
        });
    };

    const handleRemoveBenchmark = (index: number) => {
        const updatedBenchmarks = [...(editingPlaybook.benchmark_transcripts || [])];
        updatedBenchmarks.splice(index, 1);
        setEditingPlaybook({ ...editingPlaybook, benchmark_transcripts: updatedBenchmarks });
    };

    if (loading) return <div className="p-12 text-center text-text-muted">Loading playbooks...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar: List */}
            <div className="lg:col-span-1 space-y-4">
                <button
                    onClick={handleCreate}
                    className="w-full btn-primary gap-2 flex items-center justify-center p-4 rounded-2xl"
                >
                    <Plus className="w-4 h-4" /> Create Playbook
                </button>

                <div className="space-y-2">
                    {playbooks.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleSelect(p)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedId === p.id
                                ? 'bg-accent/10 border-accent/50 text-accent font-bold'
                                : 'bg-bg-surface border-border-default/50 text-text-muted hover:border-border-default'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-4 h-4" />
                                <span className="truncate">{p.title}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main: Editor */}
            <div className="lg:col-span-3">
                <KineticCard className="p-8 space-y-8">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex-1 mr-4">
                            <input
                                type="text"
                                value={editingPlaybook.title}
                                onChange={e => setEditingPlaybook({ ...editingPlaybook, title: e.target.value })}
                                className="w-full bg-transparent border-none text-3xl font-display font-bold text-text-primary focus:ring-0 placeholder:opacity-30"
                                placeholder="Playbook Title..."
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary px-6 py-2 rounded-xl flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Mandatory Questions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                                    <HelpCircle className="w-3 h-3" /> Mandatory Questions
                                </h3>
                                <button onClick={() => handleAddItem('mandatory_questions')} className="text-accent hover:text-accent-hover">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {editingPlaybook.mandatory_questions?.map((q, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            value={q}
                                            onChange={e => handleArrayUpdate('mandatory_questions', e.target.value, i)}
                                            className="flex-1 bg-bg-canvas/50 border border-border-default/30 rounded-lg p-2 text-sm text-text-secondary focus:border-accent outline-none"
                                        />
                                        <button onClick={() => handleRemoveItem('mandatory_questions', i)} className="text-status-danger/60 hover:text-status-danger">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Value Props */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3" /> Key Value Propositions
                                </h3>
                                <button onClick={() => handleAddItem('value_props')} className="text-accent hover:text-accent-hover">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                {editingPlaybook.value_props?.map((p, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            value={p}
                                            onChange={e => handleArrayUpdate('value_props', e.target.value, i)}
                                            className="flex-1 bg-bg-canvas/50 border border-border-default/30 rounded-lg p-2 text-sm text-text-secondary focus:border-accent outline-none"
                                        />
                                        <button onClick={() => handleRemoveItem('value_props', i)} className="text-status-danger/60 hover:text-status-danger">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Objection Responses */}
                    <div className="space-y-4 border-t border-border-default/30 pt-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> Objection Handling Logic
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(editingPlaybook.objection_responses || {}).map(([obj, res], i) => (
                                <div key={i} className="p-4 bg-bg-canvas/30 border border-border-default/20 rounded-xl space-y-2">
                                    <div className="font-bold text-sm text-text-primary italic">"{obj}"</div>
                                    <textarea
                                        value={res as string}
                                        onChange={e => {
                                            const newObjRes = { ...editingPlaybook.objection_responses, [obj]: e.target.value };
                                            setEditingPlaybook({ ...editingPlaybook, objection_responses: newObjRes });
                                        }}
                                        className="w-full bg-transparent border-none text-xs text-text-muted focus:ring-0 resize-none h-20"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Benchmark Transcripts */}
                    <div className="space-y-4 border-t border-border-default/30 pt-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                                <Zap className="w-3 h-3" /> Benchmark "Golden" Transcripts
                            </h3>
                            <button onClick={handleAddBenchmark} className="text-accent hover:text-accent-hover text-xs font-bold flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add Benchmark
                            </button>
                        </div>
                        <div className="space-y-6">
                            {(editingPlaybook.benchmark_transcripts || []).map((bt, i) => (
                                <div key={i} className="p-4 bg-bg-canvas/30 border border-border-default/20 rounded-xl space-y-4 relative group">
                                    <button
                                        onClick={() => handleRemoveBenchmark(i)}
                                        className="absolute top-4 right-4 text-status-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="text"
                                        value={bt.title}
                                        onChange={e => handleBenchmarkUpdate(i, 'title', e.target.value)}
                                        className="w-full bg-transparent border-none text-sm font-bold text-text-primary focus:ring-0 placeholder:opacity-30"
                                        placeholder="Benchmark Title (e.g., Perfect Opening)"
                                    />
                                    <textarea
                                        value={bt.content}
                                        onChange={e => handleBenchmarkUpdate(i, 'content', e.target.value)}
                                        className="w-full bg-transparent border border-border-default/10 rounded-lg p-3 text-xs text-text-muted focus:border-accent outline-none resize-none h-32"
                                        placeholder="Paste the high-performance transcript segment here..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </KineticCard>
            </div>
        </div>
    );
}
