import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Send, Quote } from 'lucide-react';
import KineticCard from '../components/kinetic/KineticCard';
import KineticButton from '../components/kinetic/KineticButton';

interface DrillData {
    id: string;
    title: string;
    scenario: string;
    best_practice_snippet: string;
    explanation: string;
    difficulty: number;
    mastered: boolean;
}

export default function DrillSession() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { } = useAuth();

    const [drill, setDrill] = useState<DrillData | null>(null);
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [critique, setCritique] = useState<any>(null);

    useEffect(() => {
        const fetchDrill = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('dispatched_drills')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setDrill(data);
            } catch (error) {
                console.error('Failed to fetch drill', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDrill();
    }, [id]);

    const handleSubmit = async () => {
        if (!attempt.trim()) return;
        setIsAnalyzing(true);
        try {
            // Call AI analysis
            const { data, error } = await supabase.functions.invoke('drill-analysis', {
                body: {
                    drillId: id,
                    userAttempt: attempt,
                    bestPractice: drill?.best_practice_snippet
                }
            });

            if (error) throw error;
            setCritique(data.critique);

            // Update mastery if score is high
            if (data.score >= 80) {
                await supabase
                    .from('dispatched_drills')
                    .update({
                        mastered: true,
                        user_attempt: { text: attempt },
                        ai_critique: data.critique,
                        mastery_score: data.score
                    })
                    .eq('id', id);
            }
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (loading) return <div className="h-screen bg-bg-canvas flex items-center justify-center font-mono animate-pulse">Loading Session...</div>;
    if (!drill) return <div>Drill session not found.</div>;

    return (
        <div className="min-h-screen bg-bg-canvas text-text-primary py-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Navigation */}
                <button
                    onClick={() => navigate('/drills')}
                    className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-8 text-[11px] font-black tracking-widest"
                >
                    <ArrowLeft size={14} /> Back to Drills
                </button>

                <div className="grid grid-cols-1 gap-8">
                    {/* Scenario Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <KineticCard className="p-8 border-accent/20">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-mono bg-accent/10 text-accent px-2 py-1 rounded">Drill ID: {drill.id.substring(0, 8)}</span>
                                <div className="flex items-center gap-1">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < drill.difficulty ? 'bg-accent' : 'bg-border-default/20'}`} />
                                    ))}
                                </div>
                            </div>

                            <h2 className="text-3xl font-black mb-4">{drill.title}</h2>
                            <p className="text-text-secondary italic mb-8 border-l-2 border-accent/30 pl-4 py-2">
                                "{drill.scenario}"
                            </p>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-text-muted tracking-widest capitalize">Your Response</label>
                                <textarea
                                    value={attempt}
                                    onChange={(e) => setAttempt(e.target.value)}
                                    placeholder="Type your response here..."
                                    className="w-full h-32 bg-bg-canvas/50 border border-border-default/30 p-4 rounded-lg focus:outline-none focus:border-accent text-sm font-light leading-relaxed resize-none"
                                />
                                <div className="flex justify-end">
                                    <KineticButton
                                        onClick={handleSubmit}
                                        disabled={isAnalyzing || !attempt.trim()}
                                        className="gap-2"
                                    >
                                        {isAnalyzing ? 'Analysing...' : 'Submit for Audit'}
                                        <Send size={14} />
                                    </KineticButton>
                                </div>
                            </div>
                        </KineticCard>
                    </motion.div>

                    {/* Post-Drill Analysis */}
                    <AnimatePresence>
                        {critique && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-8 pb-20"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* User Analysis */}
                                    <KineticCard className="p-6 border-status-info/20">
                                        <h4 className="text-[10px] font-black tracking-widest text-status-info mb-4">Your Attempt Analysis</h4>
                                        <p className="text-sm leading-relaxed opacity-90">{critique.user_critique}</p>
                                    </KineticCard>

                                    {/* AI Comparison */}
                                    <KineticCard className="p-6 border-accent/20 bg-accent/5">
                                        <h4 className="text-[10px] font-black tracking-widest text-accent mb-4">Elite Bench Response</h4>
                                        <div className="relative">
                                            <Quote className="absolute -top-2 -left-2 text-accent/20 w-8 h-8 rotate-180" />
                                            <p className="text-sm font-medium italic pl-6 pr-2 leading-relaxed">
                                                {drill.best_practice_snippet}
                                            </p>
                                        </div>
                                    </KineticCard>
                                </div>

                                <KineticCard className="p-8 border-status-success/20 shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                                    <div className="flex items-start gap-4 mb-4">
                                        <CheckCircle2 className="text-status-success mt-1" size={24} />
                                        <div>
                                            <h4 className="text-xl font-black mb-2">Strategy Audit: Why this response wins</h4>
                                            <p className="text-sm text-text-secondary leading-relaxed font-light">
                                                {critique.why_it_wins}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-border-default/10 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-status-success font-mono text-xs">
                                            <CheckCircle2 size={16} /> Mastered // XP Allocated
                                        </div>
                                        <KineticButton variant="outline" onClick={() => navigate('/drills')} className="gap-2">
                                            Next Drill <ArrowLeft size={14} className="rotate-180" />
                                        </KineticButton>
                                    </div>
                                </KineticCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
