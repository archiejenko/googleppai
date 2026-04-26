import { useState, useEffect } from 'react';
import { MessageSquareQuote, Trash2 } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface CoachNotesProps {
    delay?: number;
}

interface CoachMemory {
    id: string;
    memory_text: string;
    memory_type: 'fact' | 'preference' | 'goal' | 'weakness';
    created_at: string;
}

const TYPE_LABELS: Record<CoachMemory['memory_type'], string> = {
    fact: 'Observation',
    preference: 'Preference',
    goal: 'Goal',
    weakness: 'Focus Area',
};

const TYPE_COLOURS: Record<CoachMemory['memory_type'], string> = {
    fact: 'bg-blue-500/20 text-blue-300',
    preference: 'bg-purple-500/20 text-purple-300',
    goal: 'bg-green-500/20 text-green-300',
    weakness: 'bg-[rgb(var(--accent-primary)/0.2)] text-[rgb(var(--accent-primary))]',
};

export default function CoachNotes({ delay: _ }: CoachNotesProps) {
    const [memories, setMemories] = useState<CoachMemory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('coach_memories')
                .select('id, memory_text, memory_type, created_at')
                .order('created_at', { ascending: false })
                .limit(5);
            if (!cancelled) {
                setMemories(data ?? []);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleDelete = async (id: string) => {
        await supabase.from('coach_memories').delete().eq('id', id);
        setMemories(prev => prev.filter(m => m.id !== id));
    };

    return (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquareQuote className="w-4 h-4 text-[#FF6B6B]" />
                <h3 className="card-title !mb-0">Coach's Notes</h3>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
                {loading && (
                    <p className="text-[rgb(var(--text-muted))] text-xs">Loading memories…</p>
                )}
                {!loading && memories.length === 0 && (
                    <p className="text-[rgb(var(--text-muted))] text-xs">
                        No coach memories yet. Complete a training session to build your profile.
                    </p>
                )}
                {memories.map((m) => (
                    <div
                        key={m.id}
                        className="group bg-[rgb(var(--bg-deep))] p-3 border border-[rgb(var(--border-default))] rounded-lg flex items-start gap-2"
                    >
                        <div className="flex-1 min-w-0">
                            <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded mb-1 ${TYPE_COLOURS[m.memory_type]}`}>
                                {TYPE_LABELS[m.memory_type]}
                            </span>
                            <p className="text-[rgb(var(--text-secondary))] text-[11px] leading-relaxed">
                                {m.memory_text}
                            </p>
                        </div>
                        <button
                            onClick={() => handleDelete(m.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[rgb(var(--text-muted))] hover:text-[#FF6B6B]"
                            aria-label="Delete memory"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
