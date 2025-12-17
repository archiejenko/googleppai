import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Play, Target, Clock, Globe, TrendingUp } from 'lucide-react';

interface Industry {
    id: string;
    name: string;
    description: string;
    icon: string;
    scenarioTemplates?: {
        id: string;
        title: string;
        description: string;
        difficulty: string;
        targetPersona: string;
    }[];
}

export default function Training() {
    const navigate = useNavigate();
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [formData, setFormData] = useState({
        scenario: 'cold_call',
        difficulty: 'medium',
        targetPersona: '',
        pitchGoal: '',
        timeLimit: 300,
        language: 'en',
        industryId: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchIndustries = async () => {
            try {
                const response = await api.get('/industries');
                setIndustries(response.data);
            } catch (error) {
                console.error('Failed to fetch industries', error);
            }
        };
        fetchIndustries();
    }, []);

    const defaultScenarios = [
        { value: 'cold_call', label: 'Cold Call', description: 'Initial outreach to prospects' },
        { value: 'product_demo', label: 'Product Demo', description: 'Showcase your solution' },
        { value: 'objection_handling', label: 'Objection Handling', description: 'Address concerns effectively' },
        { value: 'negotiation', label: 'Negotiation', description: 'Navigate pricing discussions' },
        { value: 'closing', label: 'Closing', description: 'Seal the deal' },
    ];

    const [availableScenarios, setAvailableScenarios] = useState(defaultScenarios);

    // Update scenarios when industry changes
    useEffect(() => {
        if (!formData.industryId) {
            setAvailableScenarios(defaultScenarios);
            return;
        }

        const selectedIndustry = industries.find(ind => ind.id === formData.industryId);
        if (selectedIndustry?.scenarioTemplates && selectedIndustry.scenarioTemplates.length > 0) {
            const industryScenarios = selectedIndustry.scenarioTemplates.map(t => ({
                value: t.id,
                label: t.title,
                description: t.description
            }));
            setAvailableScenarios(industryScenarios);
            // Default select first one
            setFormData(prev => ({ ...prev, scenario: industryScenarios[0].value }));
        } else {
            setAvailableScenarios(defaultScenarios);
        }
    }, [formData.industryId, industries]);

    const difficulties = [
        { value: 'easy', label: 'Easy', color: 'from-green-500 to-emerald-500', xp: 50 },
        { value: 'medium', label: 'Medium', color: 'from-yellow-500 to-amber-500', xp: 100 },
        { value: 'hard', label: 'Hard', color: 'from-red-500 to-rose-500', xp: 200 },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/training', formData);
            // Navigate to active training (conversation mode) with session ID
            navigate(`/active-training?sessionId=${response.data.id}`);
        } catch (error) {
            console.error('Failed to create training session', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-extrabold text-theme-primary mb-2">
                        Configure Training Session
                    </h1>
                    <p className="text-theme-muted text-lg">
                        Customize your practice session for targeted improvement
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Scenario Selection */}
                    <div className="glass-card p-6 animate-fade-in-up stagger-1">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-6 w-6 text-theme-accent" />
                            <h2 className="text-2xl font-bold text-theme-primary">Sales Scenario</h2>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableScenarios.map((scenario) => (
                                <button
                                    key={scenario.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, scenario: scenario.value })}
                                    className={`p-4 rounded-lg border-2 transition-all text-left ${formData.scenario === scenario.value
                                        ? 'border-[rgb(var(--accent-primary))] bg-[rgba(var(--accent-primary),0.2)]'
                                        : 'border-border-color bg-theme-tertiary hover:border-theme-muted'
                                        }`}
                                >
                                    <h3 className="text-theme-primary font-semibold mb-1">{scenario.label}</h3>
                                    <p className="text-theme-muted text-sm">{scenario.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty Level */}
                    <div className="glass-card p-6 animate-fade-in-up stagger-2">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="h-6 w-6 text-theme-accent" />
                            <h2 className="text-2xl font-bold text-theme-primary">Difficulty Level</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            {difficulties.map((diff) => (
                                <button
                                    key={diff.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, difficulty: diff.value })}
                                    className={`p-6 rounded-lg border-2 transition-all ${formData.difficulty === diff.value
                                        ? `border-transparent bg-gradient-to-r ${diff.color}`
                                        : 'border-border-color bg-theme-tertiary hover:border-theme-muted'
                                        }`}
                                >
                                    <h3 className={`font-bold text-lg mb-1 ${formData.difficulty === diff.value ? 'text-white' : 'text-theme-primary'}`}>{diff.label}</h3>
                                    <p className={`text-sm ${formData.difficulty === diff.value ? 'text-white/80' : 'text-theme-muted'}`}>+{diff.xp} XP</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Additional Configuration */}
                    <div className="glass-card p-6 animate-fade-in-up stagger-3">
                        <h2 className="text-2xl font-bold text-theme-primary mb-6">Additional Details</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-theme-muted mb-2 font-medium">
                                    Target Persona
                                </label>
                                <input
                                    type="text"
                                    value={formData.targetPersona}
                                    onChange={(e) => setFormData({ ...formData, targetPersona: e.target.value })}
                                    placeholder="e.g., VP of Sales, CTO, Marketing Director"
                                    className="input-glass"
                                />
                            </div>

                            <div>
                                <label className="block text-theme-muted mb-2 font-medium">
                                    Pitch Goal
                                </label>
                                <input
                                    type="text"
                                    value={formData.pitchGoal}
                                    onChange={(e) => setFormData({ ...formData, pitchGoal: e.target.value })}
                                    placeholder="e.g., Book a demo, Close deal, Qualify lead"
                                    className="input-glass"
                                />
                            </div>

                            <div>
                                <label className="block text-theme-muted mb-2 font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Time Limit (seconds)
                                </label>
                                <select
                                    value={formData.timeLimit}
                                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                                    className="input-glass"
                                >
                                    <option value={60}>1 minute</option>
                                    <option value={120}>2 minutes</option>
                                    <option value={180}>3 minutes</option>
                                    <option value={300}>5 minutes</option>
                                    <option value={600}>10 minutes</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-theme-muted mb-2 font-medium flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Language
                                </label>
                                <select
                                    value={formData.language}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    className="input-glass"
                                >
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="zh">Chinese</option>
                                </select>
                            </div>

                            {industries.length > 0 && (
                                <div className="md:col-span-2">
                                    <label className="block text-theme-muted mb-2 font-medium">
                                        Industry (Optional)
                                    </label>
                                    <select
                                        value={formData.industryId}
                                        onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                                        className="input-glass"
                                    >
                                        <option value="">Select an industry</option>
                                        {industries.map((industry) => (
                                            <option key={industry.id} value={industry.id}>
                                                {industry.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center animate-fade-in-up stagger-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-gradient px-12 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                        >
                            <Play className="h-6 w-6" />
                            {loading ? 'Starting Session...' : 'Start Training Session'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
