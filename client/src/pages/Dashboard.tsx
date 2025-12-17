import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FileText, Calendar, TrendingUp, Mic, Award, BarChart3, Zap } from 'lucide-react';

interface Pitch {
    id: string;
    createdAt: string;
    score: number;
    feedback: any;
    transcript: string;
}

export default function Dashboard() {
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPitches = async () => {
            try {
                const response = await api.get('/pitches');
                setPitches(response.data);
            } catch (error) {
                console.error('Failed to fetch pitches', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPitches();
    }, []);

    const averageScore = pitches.length > 0
        ? Math.round(pitches.reduce((acc, pitch) => acc + pitch.score, 0) / pitches.length)
        : 0;

    const highScore = pitches.length > 0
        ? Math.max(...pitches.map(p => p.score))
        : 0;

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

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-extrabold text-theme-primary mb-2">
                        Your Dashboard
                    </h1>
                    <p className="text-theme-muted text-lg">
                        Track your progress and improve your pitch skills
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="glass-card p-6 animate-fade-in-up stagger-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-theme-muted text-sm font-medium mb-1">Total Pitches</p>
                                <p className="text-4xl font-bold text-theme-primary">{pitches.length}</p>
                            </div>
                            <div className="bg-purple-500/20 p-4 rounded-xl">
                                <Mic className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 animate-fade-in-up stagger-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-theme-muted text-sm font-medium mb-1">Average Score</p>
                                <p className="text-4xl font-bold text-theme-primary">{averageScore}</p>
                            </div>
                            <div className="bg-blue-500/20 p-4 rounded-xl">
                                <BarChart3 className="h-8 w-8 text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 animate-fade-in-up stagger-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-theme-muted text-sm font-medium mb-1">Best Score</p>
                                <p className="text-4xl font-bold text-theme-primary">{highScore}</p>
                            </div>
                            <div className="bg-green-500/20 p-4 rounded-xl">
                                <Award className="h-8 w-8 text-green-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Action */}
                <div className="mb-12 animate-fade-in-up stagger-4">
                    <Link to="/record" className="block">
                        <div className="glass-card p-8 text-center hover:scale-[1.02] transition-transform cursor-pointer">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-theme-primary mb-2">Record New Pitch</h3>
                            <p className="text-theme-muted">Practice and get instant AI-powered feedback</p>
                        </div>
                    </Link>
                </div>

                {/* Pitches Section */}
                <div className="animate-fade-in-up stagger-5">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-theme-primary">Recent Pitches</h2>
                    </div>

                    {pitches.length === 0 ? (
                        <div className="glass-card text-center py-16">
                            <div className="mx-auto h-16 w-16 text-theme-muted mb-6 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                                <TrendingUp className="h-8 w-8 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-theme-primary mb-2">No pitches yet</h3>
                            <p className="text-theme-muted mb-6">Record your first pitch to get started!</p>
                            <Link to="/record">
                                <button className="btn-gradient">
                                    Start Recording
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {pitches.map((pitch, index) => (
                                <div
                                    key={pitch.id}
                                    className="glass-card p-6 animate-fade-in-up"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center text-sm text-theme-muted">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {new Date(pitch.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${pitch.score >= 80
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            pitch.score >= 60
                                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                            {pitch.score}
                                        </div>
                                    </div>

                                    <p className="text-theme-secondary line-clamp-3 mb-6 text-sm min-h-[4rem]">
                                        {pitch.transcript || "No transcript available"}
                                    </p>


                                    <Link to={`/pitch/${pitch.id}`} className="w-full py-2 px-4 bg-theme-tertiary hover:bg-theme-secondary border border-border-color hover:border-border-hover rounded-lg text-theme-primary text-sm font-medium flex items-center justify-center transition-all duration-300">
                                        <FileText className="h-4 w-4 mr-2" />
                                        View MEDDIC Analysis
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
