import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Play, Target, Clock, Globe, TrendingUp, Check } from 'lucide-react';

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
                const { data, error } = await supabase
                    .from('industries')
                    .select('*');

                if (error) throw error;

                const mappedIndustries = data.map((ind: any) => ({
                    id: ind.id,
                    name: ind.name,
                    description: ind.description,
                    icon: ind.icon,
                    scenarioTemplates: ind.scenario_templates
                }));

                setIndustries(mappedIndustries);
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
        { value: 'easy', label: 'Easy', color: 'text-status-success', border: 'border-status-success', xp: 50 },
        { value: 'medium', label: 'Medium', color: 'text-status-warning', border: 'border-status-warning', xp: 100 },
        { value: 'hard', label: 'Hard', color: 'text-status-danger', border: 'border-status-danger', xp: 200 },
    ];

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('training-api', {
                body: formData
            });

            if (error) throw error;

            // Navigate to active training (conversation mode) with session ID
            navigate(`/active-training?sessionId=${data.id}`);
        } catch (error) {
            console.error('Failed to create training session', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-12 animate-in-up">
                    <h1 className="text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-3">
                        Configure Training Session
                    </h1>
                    <p className="text-[rgb(var(--text-secondary))] text-lg">
                        Customize your practice session for targeted improvement
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Scenario Selection */}
                    <div className="card-os p-6 animate-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[rgb(var(--accent-primary)/0.1)] rounded-lg">
                                <Target className="h-6 w-6 text-[rgb(var(--accent-primary))]" />
                            </div>
                            <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Sales Scenario</h2>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableScenarios.map((scenario) => (
                                <button
                                    key={scenario.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, scenario: scenario.value })}
                                    className={`
                                        p-4 rounded-[var(--radius-md)] border-2 text-left transition-all duration-200 relative overflow-hidden group
                                        ${formData.scenario === scenario.value
                                            ? 'border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-primary)/0.05)]'
                                            : 'border-[rgb(var(--border-default))] hover:border-[rgb(var(--border-subtle))] hover:bg-[rgb(var(--bg-surface-raised))]'
                                        }
                                    `}
                                >
                                    <h3 className={`font-semibold mb-1 transition-colors ${formData.scenario === scenario.value ? 'text-[rgb(var(--accent-primary))]' : 'text-[rgb(var(--text-primary))]'
                                        }`}>
                                        {scenario.label}
                                    </h3>
                                    <p className="text-[rgb(var(--text-muted))] text-sm group-hover:text-[rgb(var(--text-secondary))] transition-colors">
                                        {scenario.description}
                                    </p>

                                    {formData.scenario === scenario.value && (
                                        <div className="absolute top-2 right-2 text-[rgb(var(--accent-primary))]">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty Level */}
                    <div className="card-os p-6 animate-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[rgb(var(--accent-primary)/0.1)] rounded-lg">
                                <TrendingUp className="h-6 w-6 text-[rgb(var(--accent-primary))]" />
                            </div>
                            <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Difficulty Level</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            {difficulties.map((diff) => (
                                <button
                                    key={diff.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, difficulty: diff.value })}
                                    className={`
                                        p-6 rounded-[var(--radius-md)] border-2 text-center transition-all duration-200 relative
                                        ${formData.difficulty === diff.value
                                            ? `border-current ${diff.color} bg-[rgb(var(--bg-surface-raised))]`
                                            : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-subtle))] hover:bg-[rgb(var(--bg-surface-raised))]'
                                        }
                                    `}
                                >
                                    <h3 className="font-bold text-lg mb-1">{diff.label}</h3>
                                    <p className="text-sm opacity-80">+{diff.xp} XP</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Additional Configuration */}
                    <div className="card-os p-6 animate-in-up" style={{ animationDelay: '0.3s' }}>
                        <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-6">Additional Details</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[rgb(var(--text-secondary))] mb-2 font-medium">
                                    Target Persona
                                </label>
                                <input
                                    type="text"
                                    value={formData.targetPersona}
                                    onChange={(e) => setFormData({ ...formData, targetPersona: e.target.value })}
                                    placeholder="e.g., VP of Sales, CTO, Marketing Director"
                                    className="input-os"
                                />
                            </div>

                            <div>
                                <label className="block text-[rgb(var(--text-secondary))] mb-2 font-medium">
                                    Pitch Goal
                                </label>
                                <input
                                    type="text"
                                    value={formData.pitchGoal}
                                    onChange={(e) => setFormData({ ...formData, pitchGoal: e.target.value })}
                                    placeholder="e.g., Book a demo, Close deal, Qualify lead"
                                    className="input-os"
                                />
                            </div>

                            <div>
                                <label className="block text-[rgb(var(--text-secondary))] mb-2 font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Time Limit (seconds)
                                </label>
                                <select
                                    value={formData.timeLimit}
                                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                                    className="input-os appearance-none"
                                >
                                    <option value={60}>1 minute</option>
                                    <option value={120}>2 minutes</option>
                                    <option value={180}>3 minutes</option>
                                    <option value={300}>5 minutes</option>
                                    <option value={600}>10 minutes</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[rgb(var(--text-secondary))] mb-2 font-medium flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Language
                                </label>
                                <select
                                    value={formData.language}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    className="input-os appearance-none"
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
                                    <label className="block text-[rgb(var(--text-secondary))] mb-2 font-medium">
                                        Industry (Optional)
                                    </label>
                                    <select
                                        value={formData.industryId}
                                        onChange={(e) => setFormData({ ...formData, industryId: e.target.value })}
                                        className="input-os appearance-none"
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
                    <div className="flex justify-center animate-in-up" style={{ animationDelay: '0.4s' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary px-12 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 w-full sm:w-auto justify-center"
                        >
                            <Play className="h-6 w-6 fill-current" />
                            {loading ? 'Starting Session...' : 'Start Training Session'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
