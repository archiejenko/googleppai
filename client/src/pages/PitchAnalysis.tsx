import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { ArrowLeft, Share2, Download, Mic } from 'lucide-react';
import ScoreRing from '../components/analysis/ScoreRing';
import FeedbackAccordion from '../components/analysis/FeedbackAccordion';

interface PitchAnalysis {
    feedback: string;
    score: number;
    meddicScores: any;
    strengths: string[];
    improvements: string[];
    meddicBreakdown: any;
    sentimentScore: number;
    confidenceScore: number;
    paceScore: number;
    clarityScore: number;
    keyPhrases: string[];
    fillerWordCount: number;
    questionCount: number;
}

interface Pitch {
    id: string;
    createdAt: string;
    transcript: string;
    score: number;
    analysis: PitchAnalysis;
}

export default function PitchAnalysis() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [pitch, setPitch] = useState<Pitch | null>(null);
    const [loading, setLoading] = useState(true);

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

                const mappedPitch = {
                    ...data,
                    createdAt: data.created_at
                };

                setPitch(mappedPitch);
            } catch (error) {
                console.error('Failed to fetch pitch', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPitch();
    }, [id]);

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
                        <p className="text-xs text-[rgb(var(--text-muted))]">{new Date(pitch.createdAt).toLocaleDateString()} • 12:04 PM</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-ghost text-sm gap-2 flex items-center"><Share2 className="w-4 h-4" /> Share</button>
                    <button className="btn-ghost text-sm gap-2 flex items-center"><Download className="w-4 h-4" /> Export</button>
                </div>
            </header>

            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* Main: Transcript / Content */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8 p-6 bg-[rgb(var(--bg-surface-raised))] rounded-xl border border-[rgb(var(--border-default))] flex items-start gap-4 mx-auto w-full">
                            <div className="p-3 bg-[rgb(var(--accent-primary)/0.1)] rounded-lg text-[rgb(var(--accent-primary))]">
                                <Mic className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[rgb(var(--text-primary))] mb-1">Session Recording</h3>
                                <p className="text-sm text-[rgb(var(--text-muted))] mb-4">Click segments to jump to timestamp</p>
                                <div className="h-12 w-full bg-[rgb(var(--bg-canvas))] rounded flex items-center justify-center opacity-50 border border-[rgb(var(--border-subtle))] border-dashed">
                                    [Waveform Visualization Placeholder]
                                </div>
                            </div>
                        </div>

                        <h2 className="text-sm font-bold uppercase text-[rgb(var(--text-muted))] tracking-wider mb-4">Transcript</h2>
                        <div className="prose prose-invert max-w-none text-[rgb(var(--text-secondary))] leading-loose">
                            {pitch.transcript.split('\n').map((para, i) => (
                                <p key={i} className="mb-4 hover:bg-[rgb(var(--bg-surface-raised))] p-2 rounded transition-colors cursor-pointer border-l-2 border-transparent hover:border-[rgb(var(--accent-primary))]">
                                    {para}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Drawer: Inspector */}
                <div className="w-[400px] bg-[rgb(var(--bg-surface))] border-l border-[rgb(var(--border-default))] overflow-y-auto flex flex-col">

                    {/* Score Section */}
                    <div className="p-8 border-b border-[rgb(var(--border-subtle))] bg-gradient-to-b from-[rgb(var(--bg-surface-raised))] to-transparent">
                        <ScoreRing score={pitch.score} />

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <div className="text-center p-3 rounded-lg bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))]">
                                <div className="text-xs text-[rgb(var(--text-muted))] uppercase mb-1">Confidence</div>
                                <div className="font-bold text-xl text-[rgb(var(--text-primary))]">{pitch.analysis.confidenceScore}/100</div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-subtle))]">
                                <div className="text-xs text-[rgb(var(--text-muted))] uppercase mb-1">Clarity</div>
                                <div className="font-bold text-xl text-[rgb(var(--text-primary))]">{pitch.analysis.clarityScore}/100</div>
                            </div>
                        </div>
                    </div>

                    {/* MEDDIC Details */}
                    <div className="p-6 flex-1">
                        <h3 className="font-display font-bold text-[rgb(var(--text-primary))] mb-4">MEDDIC Breakdown</h3>
                        <div className="space-y-4">
                            {meddicKeys.map((item) => (
                                <FeedbackAccordion
                                    key={item.key}
                                    title={item.label}
                                    score={pitch.analysis.meddicScores[item.key]}
                                    feedback={pitch.analysis.meddicBreakdown[item.key]}
                                />
                            ))}
                        </div>

                        <div className="mt-8">
                            <h3 className="font-display font-bold text-[rgb(var(--text-primary))] mb-4">Key Improvements</h3>
                            <ul className="space-y-2">
                                {pitch.analysis.improvements.map((imp, i) => (
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
