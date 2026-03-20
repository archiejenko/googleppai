import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Zap, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import KineticCard from '../components/kinetic/KineticCard';
import KineticButton from '../components/kinetic/KineticButton';
import NyroTextReveal from '../components/kinetic/NyroTextReveal';

interface Drill {
    id: string;
    title: string;
    explanation: string;
    focus_area: string;
    difficulty: number;
    mastered: boolean;
    criticality: 'low' | 'medium' | 'high';
    created_at: string;
    pitch_id?: string | null;
    drill_type?: string;
    weakness_identified?: string | null;
}

function DrillCard({ drill, index, navigate, recommended = false }: {
    drill: Drill;
    index: number;
    navigate: ReturnType<typeof useNavigate>;
    recommended?: boolean;
}) {
    return (
        <KineticCard
            delay={index * 0.1}
            className={`p-6 h-full flex flex-col justify-between border-border-default/20 ${
                recommended ? 'border-accent/30 shadow-[0_0_20px_rgba(255,107,107,0.1)]' :
                drill.criticality === 'high' ? 'border-status-danger/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : ''
            }`}
        >
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-2 rounded-lg ${drill.mastered ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}>
                        {drill.mastered ? <CheckCircle2 size={20} /> : <Zap size={20} className="fill-current" />}
                    </div>
                    <div className="flex items-center gap-2">
                        {recommended && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-accent/10 text-accent border border-accent/30">
                                Recommended
                            </span>
                        )}
                        {!recommended && drill.criticality && (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                drill.criticality === 'high' ? 'bg-status-danger/10 text-status-danger' :
                                drill.criticality === 'medium' ? 'bg-status-warning/10 text-status-warning' :
                                'bg-status-info/10 text-status-info'
                            }`}>
                                {drill.criticality}
                            </span>
                        )}
                    </div>
                </div>

                <h3 className="text-xl font-black mb-3 leading-tight tracking-tight">
                    {drill.drill_type || drill.title || drill.focus_area}
                </h3>

                {drill.weakness_identified && (
                    <p className="text-xs text-status-warning/80 mb-2 italic">"{drill.weakness_identified}"</p>
                )}

                <p className="text-sm text-text-secondary font-light leading-relaxed mb-6 opacity-80">
                    {drill.explanation || `Targeted practice for ${(drill.focus_area || '').toLowerCase()} identified in recent sessions.`}
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-4 py-3 border-y border-border-default/10">
                    <div className="flex-1">
                        <div className="text-[9px] font-bold text-text-muted mb-1">Complexity Rating</div>
                        <div className="flex gap-1">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full ${i < drill.difficulty ? 'bg-accent' : 'bg-border-default/20'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="text-xs font-mono">{drill.difficulty}/10</div>
                </div>

                <KineticButton
                    onClick={() => navigate(`/drill/${drill.id}`)}
                    variant={drill.mastered ? 'outline' : 'primary'}
                    className="w-full justify-between"
                >
                    <span className="text-[11px] font-black tracking-widest">
                        {drill.mastered ? 'Review Refinement' : 'Enter Drill Session'}
                    </span>
                    <ArrowRight size={16} />
                </KineticButton>
            </div>
        </KineticCard>
    );
}

export default function Drills() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);

    const recommended = drills.filter(d => d.pitch_id);
    const general = drills.filter(d => !d.pitch_id);

    useEffect(() => {
        const fetchDrills = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('dispatched_drills')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;
                setDrills(data || []);
            } catch (error) {
                console.error('Failed to fetch drills', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDrills();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-bg-canvas">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-border-default border-t-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-canvas text-text-primary py-24 px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-20">
                    <NyroTextReveal
                        text="Drills Centre"
                        className="text-6xl font-black tracking-tighter mb-4"
                    />
                    <p className="text-text-secondary text-lg font-light tracking-wide max-w-2xl">
                        Accumulated insights from your previous calls transformed into high-impact performance drills. Master these to elite levels.
                    </p>
                </div>

                {drills.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-border-default/20 rounded-2xl">
                        <AlertTriangle className="mx-auto mb-4 text-text-muted" size={40} />
                        <h4 className="text-xl font-bold mb-2">No Active Drills</h4>
                        <p className="text-text-secondary">Analyse your recent calls to generate performance-based practice sessions.</p>
                        <KineticButton onClick={() => navigate('/training')} className="mt-8">Start Training Session</KineticButton>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* AI-Recommended (from pitch analysis) */}
                        {recommended.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <Zap className="w-4 h-4 text-accent fill-accent" />
                                    <h2 className="text-xs font-black uppercase tracking-widest text-accent">AI Recommended</h2>
                                    <span className="text-[10px] text-text-muted">— dispatched from your last session analysis</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {recommended.map((drill, index) => (
                                        <DrillCard key={drill.id} drill={drill} index={index} navigate={navigate} recommended />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* General drills */}
                        {general.length > 0 && (
                            <div>
                                {recommended.length > 0 && (
                                    <h2 className="text-xs font-black uppercase tracking-widest text-text-muted mb-6">All Drills</h2>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {general.map((drill, index) => (
                                        <DrillCard key={drill.id} drill={drill} index={index} navigate={navigate} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
