import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle } from 'lucide-react';

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

function getDrillCategoryClass(focusArea: string) {
    const lower = (focusArea || '').toLowerCase();
    if (lower.includes('objection') || lower.includes('price')) return { bg: 'bg-[rgba(251,191,36,0.12)]', text: 'text-[#FBBF24]', label: 'Objection' };
    if (lower.includes('closing') || lower.includes('close')) return { bg: 'bg-[rgba(74,222,128,0.12)]', text: 'text-[#4ADE80]', label: 'Closing' };
    if (lower.includes('discovery') || lower.includes('needs')) return { bg: 'bg-[rgba(96,165,250,0.12)]', text: 'text-[#60A5FA]', label: 'Discovery' };
    if (lower.includes('opening') || lower.includes('cold')) return { bg: 'bg-[rgba(255,107,107,0.12)]', text: 'text-[#FF6B6B]', label: 'Opening' };
    if (lower.includes('rapport')) return { bg: 'bg-[rgba(167,139,250,0.12)]', text: 'text-[#A78BFA]', label: 'Rapport' };
    return { bg: 'bg-[rgba(96,165,250,0.12)]', text: 'text-[#60A5FA]', label: focusArea || 'General' };
}

function getDifficultyDots(difficulty: number) {
    // Scale 1-10 to 1-5 dots
    const filled = Math.max(1, Math.round(difficulty / 2));
    const color = difficulty >= 8 ? 'bg-[#FF6B6B]' : difficulty >= 5 ? 'bg-[#FBBF24]' : 'bg-[#4ADE80]';
    return { filled, color };
}

function DrillCard({ drill, index: _, navigate, recommended = false }: {
    drill: Drill;
    index: number;
    navigate: ReturnType<typeof useNavigate>;
    recommended?: boolean;
}) {
    const category = getDrillCategoryClass(drill.focus_area);
    const dots = getDifficultyDots(drill.difficulty);

    return (
        <div className={`bg-[#0a0e14] border border-[#1e2a38] rounded-lg p-4 flex flex-col gap-2.5 ${
            recommended ? 'border-[#FF6B6B]/30' : ''
        }`}>
            <div className="font-['Oswald'] text-[13px] font-semibold uppercase text-[#c9d1d9]">
                {drill.drill_type || drill.title || drill.focus_area}
            </div>

            <span className={`inline-block self-start text-[9px] font-bold uppercase tracking-[0.05em] px-2 py-0.5 rounded ${category.bg} ${category.text}`}>
                {category.label}
            </span>

            {drill.weakness_identified && (
                <p className="text-[11px] text-[#FBBF24]/80 italic">"{drill.weakness_identified}"</p>
            )}

            <p className="text-[11px] text-[#7d8a98] leading-relaxed">
                {drill.explanation || `Targeted practice for ${(drill.focus_area || '').toLowerCase()} identified in recent sessions.`}
            </p>

            {/* Difficulty dots */}
            <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < dots.filled ? dots.color : 'bg-[#1e2a38]'}`} />
                ))}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px] text-[#4a5567] font-['DM_Sans']">
                <span>{drill.difficulty}/10</span>
                {drill.mastered && <span className="text-[#4ADE80]">Mastered</span>}
            </div>

            <button
                onClick={() => navigate(`/drill/${drill.id}`)}
                className="self-start text-[10px] font-semibold py-1.5 px-3 rounded-md border border-[#253345] bg-transparent text-[#7d8a98] hover:bg-[#151c25] hover:text-[#c9d1d9] hover:border-[#FF6B6B] transition-colors font-['DM_Sans']"
            >
                {drill.mastered ? 'Review' : 'Start'}
            </button>
        </div>
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
            <div className="min-h-screen flex justify-center items-center bg-[#0d1117]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1e2a38] border-t-[#FF6B6B]"></div>
            </div>
        );
    }

    // Stat computations from live data
    const totalDrills = drills.length;
    const masteredCount = drills.filter(d => d.mastered).length;
    const avgDifficulty = drills.length > 0 ? Math.round(drills.reduce((s, d) => s + (d.difficulty || 0), 0) / drills.length * 10) : 0;
    const highCritCount = drills.filter(d => d.criticality === 'high').length;

    return (
        <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
            <div className="max-w-7xl mx-auto px-7 pt-6 pb-7">

                {/* Page Header */}
                <div className="mb-5">
                    <div className="page-kicker font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4a5567] mb-0.5">Core</div>
                    <h1 className="page-title font-['Oswald'] text-2xl font-semibold uppercase tracking-tight text-[#c9d1d9] mb-0.5">Drills</h1>
                    <p className="page-desc text-xs text-[#7d8a98]">Targeted skill exercises and drill library</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">Available Drills</div>
                        <div className="stat-value font-['Oswald'] text-[28px] font-semibold leading-none text-[#c9d1d9]">{totalDrills}</div>
                    </div>
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">Mastered</div>
                        <div className="stat-value font-['Oswald'] text-[28px] font-semibold leading-none text-[#4ADE80]">{masteredCount}</div>
                    </div>
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">Avg Difficulty</div>
                        <div className="stat-value font-['Oswald'] text-[28px] font-semibold leading-none text-[#FBBF24]">{avgDifficulty}%</div>
                    </div>
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">High Priority</div>
                        <div className="stat-value font-['Oswald'] text-[28px] font-semibold leading-none text-[#FF6B6B]">{highCritCount}</div>
                    </div>
                </div>

                {drills.length === 0 ? (
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5">
                        <div className="card-title font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9] mb-4">Drill Library</div>
                        <div className="py-12 text-center">
                            <AlertTriangle className="mx-auto mb-3 text-[#4a5567]" size={32} />
                            <p className="text-sm text-[#4a5567] mb-4">No data yet</p>
                            <button
                                onClick={() => navigate('/training')}
                                className="text-[11px] font-semibold py-2 px-4 rounded-lg bg-[#FF6B6B] text-white border border-[#FF6B6B] hover:opacity-90 transition-colors font-['DM_Sans']"
                            >
                                Start Training Session
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* AI-Recommended (from pitch analysis) */}
                        {recommended.length > 0 && (
                            <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5">
                                <div className="card-title font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9] mb-4">Recommended Drills</div>
                                {recommended.map((drill, index) => (
                                    <div key={drill.id} className={`p-3 border-l-[3px] border-l-[#FF6B6B] bg-[#0a0e14] rounded-r-lg ${index < recommended.length - 1 ? 'mb-2' : ''}`}>
                                        <div className="font-['Oswald'] text-[11px] font-semibold uppercase text-[#c9d1d9] mb-1">
                                            {drill.drill_type || drill.title || drill.focus_area}
                                        </div>
                                        <div className="text-[11px] text-[#7d8a98] leading-relaxed">
                                            {drill.explanation || `Targeted practice for ${(drill.focus_area || '').toLowerCase()} identified in recent sessions.`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drill Library Grid */}
                        <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5">
                            <div className="card-title font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9] mb-4">Drill Library</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {general.length > 0 ? (
                                    general.map((drill, index) => (
                                        <DrillCard key={drill.id} drill={drill} index={index} navigate={navigate} />
                                    ))
                                ) : (
                                    drills.map((drill, index) => (
                                        <DrillCard key={drill.id} drill={drill} index={index} navigate={navigate} recommended={!!drill.pitch_id} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
