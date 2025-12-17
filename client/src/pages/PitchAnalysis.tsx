import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface MEDDICScore {
    metrics: number;
    economicBuyer: number;
    decisionCriteria: number;
    decisionProcess: number;
    identifyPain: number;
    champion: number;
}

interface PitchAnalysis {
    feedback: string;
    score: number;
    meddicScores: MEDDICScore;
    strengths: string[];
    improvements: string[];
    meddicBreakdown: {
        metrics: string;
        economicBuyer: string;
        decisionCriteria: string;
        decisionProcess: string;
        identifyPain: string;
        champion: string;
    };
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

const MEDDICComponent = ({ label, score, feedback }: { label: string; score: number; feedback: string }) => {
    const getColor = (score: number) => {
        if (score >= 80) return 'from-green-500 to-emerald-500';
        if (score >= 60) return 'from-yellow-500 to-amber-500';
        return 'from-red-500 to-rose-500';
    };

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-theme-primary">{label}</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r ${getColor(score)} text-white`}>
                    {score}
                </div>
            </div>
            <div className="mb-4">
                <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getColor(score)} transition-all duration-1000`}
                        style={{ width: `${score}%` }}
                    ></div>
                </div>
            </div>
            <p className="text-theme-muted text-sm">{feedback}</p>
        </div>
    );
};

export default function PitchAnalysis() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [pitch, setPitch] = useState<Pitch | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPitch = async () => {
            try {
                const response = await api.get(`/pitches/${id}`);
                setPitch(response.data);
            } catch (error) {
                console.error('Failed to fetch pitch', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPitch();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen gradient-dark-bg flex justify-center items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-purple-500"></div>
                </div>
            </div>
        );
    }

    if (!pitch) {
        return (
            <div className="min-h-screen gradient-dark-bg flex justify-center items-center">
                <div className="glass-card p-8 text-center">
                    <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Pitch Not Found</h2>
                    <p className="text-gray-300 mb-6">The pitch you're looking for doesn't exist.</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-gradient">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const meddicComponents = [
        { key: 'metrics', label: 'Metrics (M)', description: 'Quantifiable business impact' },
        { key: 'economicBuyer', label: 'Economic Buyer (E)', description: 'Decision-maker identification' },
        { key: 'decisionCriteria', label: 'Decision Criteria (D)', description: 'Evaluation criteria' },
        { key: 'decisionProcess', label: 'Decision Process (D)', description: 'Buying process' },
        { key: 'identifyPain', label: 'Identify Pain (I)', description: 'Pain point articulation' },
        { key: 'champion', label: 'Champion (C)', description: 'Internal advocate building' },
    ];

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8 animate-fade-in-up">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-300 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-4xl font-extrabold text-theme-primary mb-2">
                        Pitch Analysis
                    </h1>
                    <p className="text-theme-muted text-lg">
                        {new Date(pitch.createdAt).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                {/* Overall Score */}
                <div className="glass-card p-8 mb-8 text-center animate-fade-in-up stagger-1">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 mb-4">
                        <div className="text-5xl font-bold text-white">{pitch.score}</div>
                    </div>
                    <h2 className="text-2xl font-bold text-theme-primary mb-2">Overall MEDDIC Score</h2>
                    <p className="text-theme-muted">{pitch.analysis.feedback}</p>
                </div>

                {/* MEDDIC Breakdown */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-theme-primary mb-6 animate-fade-in-up stagger-2">
                        MEDDIC Framework Analysis
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {meddicComponents.map((component, index) => (
                            <div
                                key={component.key}
                                className="animate-fade-in-up"
                                style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                            >
                                <MEDDICComponent
                                    label={component.label}
                                    score={pitch.analysis.meddicScores[component.key as keyof MEDDICScore]}
                                    feedback={pitch.analysis.meddicBreakdown[component.key as keyof typeof pitch.analysis.meddicBreakdown]}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Enhanced Metrics */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-theme-primary mb-6 animate-fade-in-up stagger-9">
                        Performance Metrics
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass-card p-6 animate-fade-in-up stagger-10">
                            <h3 className="text-sm font-medium text-theme-muted mb-2">Sentiment</h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-bold text-theme-primary">
                                    {pitch.analysis.sentimentScore > 0 ? '+' : ''}{(pitch.analysis.sentimentScore * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${pitch.analysis.sentimentScore > 0
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                        : 'bg-gradient-to-r from-red-500 to-rose-500'
                                        }`}
                                    style={{ width: `${Math.abs(pitch.analysis.sentimentScore) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="glass-card p-6 animate-fade-in-up stagger-11">
                            <h3 className="text-sm font-medium text-theme-muted mb-2">Confidence</h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-bold text-theme-primary">{pitch.analysis.confidenceScore}</span>
                                <span className="text-theme-muted text-sm">/100</span>
                            </div>
                            <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000"
                                    style={{ width: `${pitch.analysis.confidenceScore}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="glass-card p-6 animate-fade-in-up stagger-12">
                            <h3 className="text-sm font-medium text-theme-muted mb-2">Pace</h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-bold text-theme-primary">{pitch.analysis.paceScore}</span>
                                <span className="text-theme-muted text-sm">/100</span>
                            </div>
                            <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-1000"
                                    style={{ width: `${pitch.analysis.paceScore}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="glass-card p-6 animate-fade-in-up stagger-13">
                            <h3 className="text-sm font-medium text-theme-muted mb-2">Clarity</h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-bold text-theme-primary">{pitch.analysis.clarityScore}</span>
                                <span className="text-theme-muted text-sm">/100</span>
                            </div>
                            <div className="h-2 bg-theme-tertiary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                                    style={{ width: `${pitch.analysis.clarityScore}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Insights */}
                    <div className="grid md:grid-cols-3 gap-6 mt-6">
                        {pitch.analysis.keyPhrases && pitch.analysis.keyPhrases.length > 0 && (
                            <div className="glass-card p-6 animate-fade-in-up stagger-14">
                                <h3 className="text-theme-primary font-semibold mb-3">Key Phrases</h3>
                                <ul className="space-y-2">
                                    {pitch.analysis.keyPhrases.map((phrase, idx) => (
                                        <li key={idx} className="text-theme-muted text-sm flex items-start gap-2">
                                            <span className="text-purple-400">•</span>
                                            <span>"{phrase}"</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="glass-card p-6 animate-fade-in-up stagger-15">
                            <h3 className="text-theme-primary font-semibold mb-3">Filler Words</h3>
                            <div className="text-center">
                                <span className="text-4xl font-bold text-theme-primary">{pitch.analysis.fillerWordCount || 0}</span>
                                <p className="text-theme-muted text-sm mt-2">
                                    {pitch.analysis.fillerWordCount > 10 ? 'Try to reduce' : 'Great job!'}
                                </p>
                            </div>
                        </div>

                        <div className="glass-card p-6 animate-fade-in-up stagger-16">
                            <h3 className="text-theme-primary font-semibold mb-3">Questions Asked</h3>
                            <div className="text-center">
                                <span className="text-4xl font-bold text-theme-primary">{pitch.analysis.questionCount || 0}</span>
                                <p className="text-theme-muted text-sm mt-2">
                                    {pitch.analysis.questionCount > 0 ? 'Good engagement' : 'Consider asking more'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Strengths and Improvements */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="glass-card p-6 animate-fade-in-up stagger-17">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                            <h3 className="text-xl font-bold text-theme-primary">Strengths</h3>
                        </div>
                        <ul className="space-y-3">
                            {pitch.analysis.strengths.map((strength, index) => (
                                <li key={index} className="flex items-start gap-2 text-theme-muted">
                                    <span className="text-green-400 mt-1">✓</span>
                                    <span>{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="glass-card p-6 animate-fade-in-up stagger-18">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="h-6 w-6 text-yellow-400" />
                            <h3 className="text-xl font-bold text-theme-primary">Areas for Improvement</h3>
                        </div>
                        <ul className="space-y-3">
                            {pitch.analysis.improvements.map((improvement, index) => (
                                <li key={index} className="flex items-start gap-2 text-theme-muted">
                                    <span className="text-yellow-400 mt-1">→</span>
                                    <span>{improvement}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Transcript */}
                <div className="glass-card p-6 animate-fade-in-up stagger-11">
                    <h3 className="text-xl font-bold text-theme-primary mb-4">Transcript</h3>
                    <p className="text-theme-muted leading-relaxed">{pitch.transcript}</p>
                </div>
            </div>
        </div>
    );
}
