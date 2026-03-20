import { useState, useEffect } from 'react';
import { MessageSquareQuote, Trash2 } from 'lucide-react';
import KineticCard from '../kinetic/KineticCard';
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

export default function CoachNotes({ delay = 0 }: CoachNotesProps) {
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
        <KineticCard delay={delay} className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4 text-[rgb(var(--text-primary))]">
                <MessageSquareQuote className="w-5 h-5 text-[rgb(var(--accent-primary))]" />
                <h3 className="text-lg font-display font-bold">Coach's Notes</h3>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
                {loading && (
                    <p className="text-[rgb(var(--text-muted))] text-sm italic">Loading memories…</p>
                )}
                {!loading && memories.length === 0 && (
                    <p className="text-[rgb(var(--text-muted))] text-sm italic">
                        No coach memories yet. Complete a training session to build your profile.
                    </p>
                )}
                {memories.map((m) => (
                    <div
                        key={m.id}
                        className="group bg-[rgb(var(--bg-canvas))] p-3 border border-[rgb(var(--border-subtle))] flex items-start gap-2"
                    >
                        <div className="flex-1 min-w-0">
                            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 mb-1 ${TYPE_COLOURS[m.memory_type]}`}>
                                {TYPE_LABELS[m.memory_type]}
                            </span>
                            <p className="text-[rgb(var(--text-secondary))] text-sm leading-relaxed">
                                {m.memory_text}
                            </p>
                        </div>
                        <button
                            onClick={() => handleDelete(m.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent-primary))]"
                            aria-label="Delete memory"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </KineticCard>
    );
}
