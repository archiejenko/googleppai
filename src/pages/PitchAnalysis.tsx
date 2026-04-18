import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { ArrowLeft, Share2, Download, Mic, Zap, Flame, Target, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ScoreRing from '../components/analysis/ScoreRing';
import FeedbackAccordion from '../components/analysis/FeedbackAccordion';
import WaveformPlayer from '../components/analysis/WaveformPlayer';
import { showSuccess, showError } from '../utils/toast';

interface PitchAnalysis {
    feedback: string;
    score: number;
    behavioralAnalysis?: {
        talk_listen_ratio: number;
        filler_words: string[];
        filler_word_count: number;
        confidence_variance: number;
        avg_sentence_length: number;
    };
    structuralAnalysis?: {
        opening: number;
        discovery: number;
        objection_handling: number;
        closing: number;
    };
    tacticalMisses?: string[];
    playbookAlignment?: {
        alignment_score: number;
        covered_questions: string[];
        missed_questions: string[];
        value_prop_usage: Record<string, boolean>;
    };
    strengths: string[];
    improvements: string[];
    meddicBreakdown: any;
    sentimentScore: number;
    confidenceScore: number;
    paceScore: number;
    clarityScore: number;
    perfectResponse?: {
        missedOpportunity: string;
        goldStandard: string;
    };
    drillDispatch?: {
        focusArea: string;
        context: string;
        difficulty: number;
        drillType?: string;
        weaknessIdentified?: string;
        successRequirement?: string;
    };
}

interface Benchmark {
    title: string;
    content: string;
}

interface Playbook {
    id: string;
    title: string;
    benchmark_transcripts: Benchmark[];
}

interface Pitch {
    id: string;
    createdAt: string;
    transcript: string;
    score: number;
    user_id: string;
    audio_url: string | null;
    analysis: PitchAnalysis;
    meddic_scores?: Record<string, number>;
}

export default function PitchAnalysis() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [pitch, setPitch] = useState<Pitch | null>(null);
    const [playbook, setPlaybook] = useState<Playbook | null>(null);
    const [showComparison, setShowComparison] = useState(false);
    const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
    const [loading, setLoading] = useState(true);
    const [dispatchingDrill, setDispatchingDrill] = useState(false);

    useEffect(() => {
        const fetchPitch = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('pitches')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Merge behavioral/structural from top level into analysis object for the UI
                const mappedPitch = {
                    ...data,
                    analysis: {
                        ...data.analysis,
                        behavioralAnalysis: data.behavioral_analysis || data.analysis.behavioralAnalysis,
                        structuralAnalysis: data.structural_analysis || data.analysis.structuralAnalysis,
                        tacticalMisses: data.tactical_misses || data.analysis.tacticalMisses,
                        playbookAlignment: data.playbook_alignment || data.analysis.playbookAlignment,
                    },
                    createdAt: data.created_at,
                    audio_url: data.audio_url ?? null,
                };

                setPitch(mappedPitch);

                // Fetch Team Playbook for Comparison
                if (data.user_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('team_id')
                        .eq('id', data.user_id)
                        .single();

                    if (profile?.team_id) {
                        const { data: pb } = await supabase
                            .from('playbooks')
                            .select('*')
                            .eq('organization_id', profile.team_id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (pb) {
                            setPlaybook(pb);
                            if (pb.benchmark_transcripts?.length > 0) {
                                setSelectedBenchmark(pb.benchmark_transcripts[0]);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch pitch', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPitch();
    }, [id]);

    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'Pitch Analysis — OAST', url });
            } else {
                await navigator.clipboard.writeText(url);
                showSuccess('Link copied to clipboard');
            }
        } catch {
            showError('Failed to share');
        }
    };

    const handleExport = () => {
        if (!pitch) return;
        const rows: (string | number)[][] = [
            ['Metric', 'Value'],
            ['Overall Score', pitch.score],
            ['Date', new Date(pitch.createdAt).toLocaleString()],
        ];
        if (pitch.analysis.structuralAnalysis) {
            Object.entries(pitch.analysis.structuralAnalysis).forEach(([k, v]) => {
                rows.push([k.replace(/_/g, ' '), v]);
            });
        }
        (pitch.analysis.improvements ?? []).forEach((imp, i) => rows.push([`Improvement ${i + 1}`, imp]));
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pitch-${pitch.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[rgb(var(--accent-primary))] border-t-transparent rounded-full" /></div>;
    if (!pitch) return <div>Pitch not found</div>;

    const meddicKeys = [
        { key: 'metrics', label: 'Metrics', full: 'Metrics' },
        { key: 'economicBuyer', label: 'Economic Buyer', full: 'Economic Buyer' },
        { key: 'decisionCriteria', label: 'Decision Criteria', full: 'Decision Criteria' },
        { key: 'decisionProcess', label: 'Decision Process', full: 'Decision Process' },
        { key: 'identifyPain', label: 'Identify Pain', full: 'Implicate Pain' },
        { key: 'champion', label: 'Champion', full: 'Champion' },
    ];

    return (
        <div className="h-screen flex flex-col bg-[rgb(var(--bg-canvas))] overflow-hidden">

            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-[rgb(var(--border-subtle))] bg-[rgb(var(--bg-surface))] z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[rgb(var(--bg-surface-raised))] rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[rgb(var(--text-muted))]" />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-[rgb(var(--text-primary))]">Pitch Analysis</h1>
                        <p className="text-xs text-[rgb(var(--text-muted))]">
                            {new Date(pitch.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleShare} className="btn-ghost text-sm gap-2 flex items-center"><Share2 className="w-4 h-4" /> Share</button>
                    <button onClick={handleExport} className="btn-ghost text-sm gap-2 flex items-center"><Download className="w-4 h-4" /> Export</button>
                </div>
            </header>

            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* Main: Transcript / Content */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-3xl mx-auto">
                        {pitch.audio_url ? (
                            <div className="mb-8 p-6 bg-[rgb(var(--bg-surface-raised))] rounded-xl border border-[rgb(var(--border-default))] flex items-start gap-4 mx-auto w-full">
                                <div className="p-3 bg-[rgb(var(--accent-primary)/0.1)] rounded-lg text-[rgb(var(--accent-primary))]">
                                    <Mic className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-[rgb(var(--text-primary))] mb-1">Session Recording</h3>
                                    <p className="text-sm text-[rgb(var(--text-muted))] mb-4">Click waveform to seek</p>
                                    <WaveformPlayer audioUrl={pitch.audio_url} pitchId={pitch.id} />
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 p-4 bg-[rgb(var(--bg-surface-raised))] border border-dashed border-[rgb(var(--border-default))] flex items-center gap-3">
                                <Mic className="w-4 h-4 text-[rgb(var(--text-muted))] flex-shrink-0" />
                                <p className="text-xs text-[rgb(var(--text-muted))]">
                                    No audio recording for this session. Enable recording in Training settings to capture future sessions.
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold uppercase text-[rgb(var(--text-muted))] tracking-wider">Transcript Analysis</h2>
                            {playbook?.benchmark_transcripts && playbook.benchmark_transcripts.length > 0 && (
                                <button
                                    onClick={() => setShowComparison(!showComparison)}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-2 ${showComparison
                                        ? 'bg-[rgb(var(--accent-primary))] text-white shadow-lg'
                                        : 'bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border-subtle))] hover:text-[rgb(var(--text-primary))]'
                                        }`}
                                >
                                    <Zap className={`w-3 h-3 ${showComparison ? 'animate-pulse' : ''}`} />
                                    {showComparison ? 'Close Benchmark Comparison' : 'Compare to Golden Call'}
                                </button>
                            )}
                        </div>

                        <div className={`grid gap-8 ${showComparison ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {/* User Transcript */}
                            <div className="space-y-4">
                                {showComparison && (
                                    <div className="p-3 bg-[rgb(var(--bg-surface-raised))] rounded-t-xl border-x border-t border-[rgb(var(--border-default))] border-b-2 border-[rgb(var(--accent-primary))]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--accent-primary))]">Your Performance</span>
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none leading-loose space-y-3">
                                    {pitch.transcript.split('\n').filter(Boolean).map((para, i) => {
                                        const repMatch = para.match(/^(Rep|User|You|Sales|SDR|AE|BDR):\s*/i);
                                        const buyerMatch = para.match(/^(Buyer|AI|Prospect|Client|Customer):\s*/i);
                                        const label = repMatch ? 'Rep' : buyerMatch ? 'Buyer' : (i % 2 === 0 ? 'Rep' : 'Buyer');
                                        const text = (repMatch || buyerMatch) ? para.replace(/^[^:]+:\s*/i, '') : para;
                                        const isRep = label === 'Rep';
                                        return (
                                            <div key={i} className={`flex flex-col ${isRep ? 'items-end' : 'items-start'}`}>
                                                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isRep ? 'text-[rgb(var(--accent-primary))]' : 'text-[rgb(var(--text-muted))]'}`}>
                                                    {label}
                                                </span>
                                                <p className={`text-sm leading-relaxed px-4 py-3 max-w-[85%] border-l-2 cursor-pointer hover:opacity-90 transition-opacity
                                                    ${isRep
                                                        ? 'bg-[rgb(var(--accent-primary)/0.08)] border-[rgb(var(--accent-primary))] text-[rgb(var(--text-primary))]'
                                                        : 'bg-[rgb(var(--bg-surface-raised))] border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))]'
                                                    }`}>
                                                    {text}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Benchmark Transcript */}
                            {showComparison && selectedBenchmark && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center justify-between p-3 bg-[rgb(var(--bg-surface-raised))] rounded-t-xl border-x border-t border-[rgb(var(--border-default))] border-b-2 border-amber-500">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Benchmark: {selectedBenchmark.title}</span>
                                        <select
                                            value={selectedBenchmark ? playbook?.benchmark_transcripts.indexOf(selectedBenchmark) : 0}
                                            onChange={(e) => setSelectedBenchmark(playbook?.benchmark_transcripts[parseInt(e.target.value)] || null)}
                                            className="bg-transparent border-none text-[10px] font-bold text-[rgb(var(--text-muted))] outline-none cursor-pointer"
                                        >
                                            {playbook?.benchmark_transcripts.map((b, i) => (
                                                <option key={i} value={i} className="bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))]">{b.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="prose prose-invert max-w-none text-[rgb(var(--text-muted))] leading-loose italic bg-amber-500/5 p-6 rounded-b-xl border border-amber-500/10 min-h-[400px]">
                                        {selectedBenchmark.content.split('\n').map((para, i) => (
                                            <p key={i} className="mb-4">
                                                {para}
                                            </p>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Drawer: Inspector */}
                <div className="w-[400px] bg-[rgb(var(--bg-surface))] border-l border-[rgb(var(--border-default))] overflow-y-auto flex flex-col">

                    {/* Score Section */}
                    <div className="p-8 border-b border-[rgb(var(--border-subtle))] bg-gradient-to-b from-[rgb(var(--bg-surface-raised))] to-transparent">
                        <ScoreRing score={pitch.score} />

                        {pitch.score >= 90 && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mt-4 flex items-center justify-center gap-2 bg-amber-500/20 border border-amber-500/50 p-2 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
                            >
                                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="text-[10px] font-black text-amber-500 tracking-widest">1.5x Elite Multiplier Active</span>
                            </motion.div>
                        )}

                        <div className="mt-4 text-center">
                            <p className="text-xs font-bold uppercase text-[rgb(var(--text-muted))] tracking-widest mb-2">Performance Breakdown</p>
                            <div className="flex justify-center gap-6">
                                <div>
                                    <div className="text-lg font-bold text-[rgb(var(--accent-primary))]">
                                        {pitch.analysis.structuralAnalysis ?
                                            Math.round(Object.values(pitch.analysis.structuralAnalysis).reduce((acc: number, val: any) => acc + (val as number), 0) / 4) :
                                            pitch.score}%
                                    </div>
                                    <div className="text-[10px] text-[rgb(var(--text-muted))]">Structure</div>
                                </div>
                                <div className="w-px h-8 bg-[rgb(var(--border-subtle))]" />
                                <div>
                                    <div className="text-lg font-bold text-[rgb(var(--accent-secondary))]">
                                        {(pitch.analysis.behavioralAnalysis?.talk_listen_ratio && pitch.analysis.behavioralAnalysis.talk_listen_ratio > 0) ?
                                            `${Math.round(pitch.analysis.behavioralAnalysis.talk_listen_ratio * 100)}%` :
                                            'N/A'}
                                    </div>
                                    <div className="text-[10px] text-[rgb(var(--text-muted))]">Talk Ratio</div>
                                </div>
                            </div>
                        </div>

                        {pitch.analysis.behavioralAnalysis && (
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="text-left p-3 rounded-lg bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))]">
                                    <div className="text-[10px] text-[rgb(var(--text-muted))] uppercase font-bold tracking-tighter mb-1">Filler Words</div>
                                    <div className="font-bold text-[rgb(var(--text-primary))]">{pitch.analysis.behavioralAnalysis.filler_word_count}</div>
                                </div>
                                <div className="text-left p-3 rounded-lg bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))]">
                                    <div className="text-[10px] text-[rgb(var(--text-muted))] uppercase font-bold tracking-tighter mb-1">Avg Sentence</div>
                                    <div className="font-bold text-[rgb(var(--text-primary))]">{Math.round(pitch.analysis.behavioralAnalysis.avg_sentence_length)} words</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Playbook Alignment (The North Star) */}
                    {pitch.analysis.playbookAlignment && (
                        <div className="p-6 border-b border-[rgb(var(--border-subtle))] bg-[rgb(var(--bg-surface-raised))]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-display font-bold text-[rgb(var(--text-primary))] text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Target className="w-4 h-4 text-[rgb(var(--accent-primary))]" /> Playbook Alignment
                                </h3>
                                <div className="text-xl font-black text-[rgb(var(--accent-primary))]">{pitch.analysis.playbookAlignment.alignment_score}%</div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] font-black text-[rgb(var(--text-muted))] uppercase tracking-widest mb-2">Mandatory Topics Covered</div>
                                    <div className="flex flex-wrap gap-2">
                                        {(pitch.analysis.playbookAlignment.covered_questions ?? []).map((q: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-status-success/10 text-status-success rounded text-[10px] font-bold border border-status-success/20">
                                                ✓ {q}
                                            </span>
                                        ))}
                                        {(pitch.analysis.playbookAlignment.missed_questions ?? []).map((q: string, i: number) => (
                                            <span key={i} className="px-2 py-1 bg-status-danger/10 text-status-danger rounded text-[10px] font-bold border border-status-danger/20">
                                                ✕ {q}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GAP Analysis & Drill Dispatch (The Handshake) */}
                    {(pitch.analysis.drillDispatch) && (
                        <div className="p-6 border-b border-[rgb(var(--border-subtle))] bg-slate-900 text-white">
                            <div className="p-6 bg-blue-600/10 rounded-xl border border-blue-500/30 shadow-2xl">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                                        <Zap className="w-4 h-4 fill-current" /> Next Step: Targeted Drill
                                    </h3>
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                        Level {pitch.analysis.drillDispatch.difficulty}
                                    </span>
                                </div>

                                <p className="mb-4 text-sm text-slate-300">
                                    <span className="font-bold text-white uppercase text-[10px] tracking-wider block mb-1">Drill Type:</span>
                                    <span className="text-lg font-black text-white">{pitch.analysis.drillDispatch.drillType || pitch.analysis.drillDispatch.focusArea}</span>
                                </p>

                                {pitch.analysis.drillDispatch.weaknessIdentified && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <span className="font-bold text-red-400 uppercase text-[9px] tracking-wider block mb-1">Weakness Identified:</span>
                                        <p className="text-xs text-slate-300 italic">"{pitch.analysis.drillDispatch.weaknessIdentified}"</p>
                                    </div>
                                )}

                                <button
                                    disabled={dispatchingDrill}
                                    onClick={async () => {
                                        if (!pitch?.analysis.drillDispatch) return;
                                        setDispatchingDrill(true);
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (user) {
                                            await supabase.from('dispatched_drills').insert({
                                                user_id: user.id,
                                                pitch_id: pitch.id,
                                                focus_area: pitch.analysis.drillDispatch.focusArea,
                                                difficulty: pitch.analysis.drillDispatch.difficulty,
                                                drill_type: pitch.analysis.drillDispatch.drillType ?? pitch.analysis.drillDispatch.focusArea,
                                                weakness_identified: pitch.analysis.drillDispatch.weaknessIdentified ?? null,
                                                success_requirement: pitch.analysis.drillDispatch.successRequirement ?? null,
                                            });
                                        }
                                        setDispatchingDrill(false);
                                        navigate('/drills');
                                    }}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all shadow-lg"
                                >
                                    {dispatchingDrill ? 'Dispatching...' : 'Begin Training Session'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Structural Breakdown (The Bone Health) */}
                    {pitch.analysis.structuralAnalysis && (
                        <div className="p-6 border-b border-[rgb(var(--border-subtle))] bg-[rgb(var(--bg-canvas))]">
                            <h3 className="font-display font-bold text-[rgb(var(--text-primary))] text-xs uppercase tracking-wider mb-4">Structural Diagnostics</h3>
                            <div className="space-y-3">
                                {Object.entries(pitch.analysis.structuralAnalysis).map(([key, score]) => (
                                    <div key={key} className="flex items-center justify-between group">
                                        <span className="text-xs text-[rgb(var(--text-secondary))] capitalize font-medium">{key.replace('_', ' ')}</span>
                                        <div className="flex items-center gap-3 w-32">
                                            <div className="h-1 flex-1 bg-[rgb(var(--border-subtle))] rounded-full overflow-hidden">
                                                <div className="h-full bg-[rgb(var(--accent-primary))]" style={{ width: `${score}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-[rgb(var(--text-primary))] w-6 text-right">{score}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tactical Misses */}
                    {pitch.analysis.tacticalMisses && pitch.analysis.tacticalMisses.length > 0 && (
                        <div className="p-6 border-b border-[rgb(var(--border-subtle))]">
                            <h3 className="font-display font-bold text-status-danger text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Tactical Violations
                            </h3>
                            <div className="space-y-2">
                                {pitch.analysis.tacticalMisses.map((miss: string, i: number) => (
                                    <div key={i} className="text-[10px] text-status-danger font-bold bg-status-danger/10 p-2 rounded border border-status-danger/20 flex items-center gap-2">
                                        <div className="w-1 h-1 bg-status-danger rounded-full" />
                                        {miss}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MEDDIC Details */}
                    <div className="p-6 flex-1">
                        <h3 className="font-display font-bold text-[rgb(var(--text-primary))] mb-4">Mastery Breakdown</h3>

                        {/* Perfect Response Generator */}
                        {pitch.analysis.perfectResponse && (
                            <div className="mb-6 p-4 bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))] rounded-xl">
                                <h4 className="text-[10px] font-bold text-[rgb(var(--text-muted))] mb-3 uppercase tracking-tighter">AI Gold Standard Rewrite</h4>
                                <div className="space-y-3">
                                    <div className="text-xs text-[rgb(var(--text-muted))] line-through opacity-50">
                                        "{pitch.analysis.perfectResponse.missedOpportunity}"
                                    </div>
                                    <div className="text-sm text-status-success font-medium">
                                        "{pitch.analysis.perfectResponse.goldStandard}"
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {meddicKeys.map((item) => {
                                const feedback = pitch.analysis.meddicBreakdown?.[item.key] || 'No feedback captured';
                                const itemScore = pitch.meddic_scores?.[item.key]
                                    ?? pitch.analysis.meddicBreakdown?.[item.key + '_score']
                                    ?? 0;

                                return (
                                    <FeedbackAccordion
                                        key={item.key}
                                        title={item.label}
                                        score={itemScore}
                                        feedback={feedback}
                                    />
                                );
                            })}
                        </div>

                        <div className="mt-8">
                            <h3 className="font-display font-bold text-[rgb(var(--text-primary))] mb-4">Key Improvements</h3>
                            <ul className="space-y-2">
                                {(pitch.analysis.improvements ?? []).map((imp: string, i: number) => (
                                    <li key={i} className="text-sm text-[rgb(var(--text-secondary))] flex items-start gap-2 bg-[rgb(var(--bg-canvas))] p-3 rounded border border-[rgb(var(--border-subtle))]">
                                        <span className="text-status-warning transform translate-y-0.5">→</span>
                                        {imp}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
