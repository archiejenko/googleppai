import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Play, Target, Clock, Globe, TrendingUp, Check, Star, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showError, showWarning } from '../utils/toast';

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
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const moduleId = searchParams.get('moduleId');

    // Pre-populate from schedule (scenario param) or other deep-links
    const scenarioParam = searchParams.get('scenario') || 'cold_call';
    const titleParam    = searchParams.get('title')    || '';

    const [industries, setIndustries] = useState<Industry[]>([]);
    const [formData, setFormData] = useState({
        scenario: scenarioParam,
        difficulty: 'medium',
        targetPersona: '',
        pitchGoal: titleParam,
        timeLimit: 300,
        language: 'en',
        industryId: '',
        methodology: 'MEDDIC' as 'MEDDIC' | 'BANT',
        personaCategory: 'Executive' as 'Executive' | 'Financial' | 'Technical' | 'Operational',
        isMultiPersona: false,
    });
    const [isEliteUnlocked, setIsEliteUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Industries
                const { data: indData, error: indError } = await supabase
                    .from('industries')
                    .select('*');

                if (indError) throw indError;

                // Define DB shape
                type DBIndustry = {
                    id: string;
                    name: string;
                    description: string;
                    icon: string;
                    scenario_templates?: {
                        id: string;
                        title: string;
                        description: string;
                        difficulty: string;
                        targetPersona: string;
                    }[];
                }

                const mappedIndustries = (indData as DBIndustry[] || []).map((ind) => ({
                    id: ind.id,
                    name: ind.name,
                    description: ind.description,
                    icon: ind.icon,
                    scenarioTemplates: ind.scenario_templates
                }));
                setIndustries(mappedIndustries);

                // Fetch Module info if moduleId exists
                if (moduleId) {
                    const { data: mod, error: modError } = await supabase
                        .from('learning_modules')
                        .select('*')
                        .eq('id', moduleId)
                        .single();

                    if (!modError && mod) {
                        setFormData(prev => ({
                            ...prev,
                            scenario: mod.scenario_type || 'cold_call',
                            difficulty: (mod.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
                            pitchGoal: mod.title,
                            targetPersona: mod.target_persona || ''
                        }));
                    }
                }

                // Check for Elite Unlock (Mastery Level based)
                if (user?.id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('mastery_level')
                        .eq('id', user.id)
                        .single();

                    if (profile?.mastery_level === 'Elite') {
                        setIsEliteUnlocked(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch training data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [moduleId, user?.id]);

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
            // Default select first one if not already set by module
            if (!moduleId) {
                setFormData(prev => ({ ...prev, scenario: industryScenarios[0].value }));
            }
        } else {
            setAvailableScenarios(defaultScenarios);
        }
    }, [formData.industryId, industries, moduleId]);

    const difficulties = [
        { value: 'easy', label: 'Easy', color: 'text-status-success', border: 'border-status-success', xp: 100 },
        { value: 'medium', label: 'Medium', color: 'text-status-warning', border: 'border-status-warning', xp: 200 },
        { value: 'hard', label: 'Hard', color: 'text-status-danger', border: 'border-status-danger', xp: 500 },
    ];

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Sanitize payload: Empty string UUIDs cause Postgres errors
            const payload = {
                ...formData,
                industryId: formData.industryId === "" ? null : formData.industryId,
                type: moduleId ? 'learning_path' : 'simulation',
                moduleId: moduleId,
                scenario: formData.isMultiPersona ? 'buying_committee' : formData.scenario,
                action: 'create' // Re-inserted missing action
            };

            // Ensure session is fresh before invocation to avoid "Invalid JWT"
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                throw new Error('No active session found. Please log in again.');
            }

            const { data, error } = await supabase.functions.invoke('training-api', {
                body: payload
            });

            if (error) throw error;

            // --- ULTRA RESILIENCE: Manual Parse Fallback ---
            let sessionData = data;
            if (typeof data === 'string') {
                try {
                    sessionData = JSON.parse(data);
                    console.log('Manual parse successful:', sessionData);
                } catch (e) {
                    console.error('Manual parse failed for session data:', e);
                }
            }

            console.log('Training session created debug:', {
                status: 'success',
                dataType: typeof sessionData,
                keys: Object.keys(sessionData || {}),
                id: sessionData?.id,
                fullData: sessionData
            });

            if (!sessionData?.id) {
                const responseExcerpt = typeof sessionData === 'object' ? JSON.stringify(sessionData).substring(0, 100) : String(sessionData);
                console.error('Session creation failed: no ID in response.', sessionData);
                throw new Error(`Server returned a response without a session ID. Structure: ${Object.keys(sessionData || {}).join(', ')} | Response: ${responseExcerpt}`);
            }

            console.log(`[Training] Navigating to active session: ${sessionData.id}`);
            // Navigate to active training (conversation mode) with session ID
            navigate(`/active-training?sessionId=${sessionData.id}`);
        } catch (error: any) {
            console.error('Failed to create training session', error);

            // Extract detailed error if possible
            let detailedMsg = error.message || 'Unknown error';
            let isAuthError = false;

            if (error.context && typeof error.context.json === 'function') {
                try {
                    const errorBody = await error.context.json();
                    detailedMsg = errorBody.details || errorBody.error || errorBody.message || detailedMsg;
                    if (detailedMsg.includes('Invalid JWT') || detailedMsg.includes('JWT') || errorBody.error === 'Unauthorized') {
                        isAuthError = true;
                    }
                } catch (e) {
                    console.error('Failed to parse error body', e);
                }
            }

            if (isAuthError) {
                try {
                    const errorBody = await error.context.json();
                    if (errorBody.diagnostics) {
                        console.log('Auth diagnostics:', {
                            jwtProject: errorBody.diagnostics.jwt?.iss || 'N/A',
                            serviceUrl: errorBody.diagnostics.env_url || 'N/A',
                            mismatch: !errorBody.diagnostics.jwt?.iss?.includes(errorBody.diagnostics.expected_ref)
                        });
                    }
                } catch (e) { }

                showWarning('Session expired — signing you out', detailedMsg);
                await supabase.auth.signOut();
                navigate('/login');
                return;
            }

            showError('Failed to start session', detailedMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loading && industries.length === 0) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-bg-canvas">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-border-default border-t-accent"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
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

                    {/* Persona Category Selection */}
                    <div className="card-os p-6 animate-in-up" style={{ animationDelay: '0.22s' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[rgb(var(--accent-primary)/0.1)] rounded-lg">
                                    <Globe className="h-6 w-6 text-[rgb(var(--accent-primary))]" />
                                </div>
                                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Buyer Persona Category</h2>
                            </div>

                            {/* Multi-Persona Toggle */}
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold uppercase tracking-widest ${!isEliteUnlocked ? 'opacity-40' : 'text-[rgb(var(--accent-primary))]'}`}>
                                    Multi-Persona Mode
                                </span>
                                <button
                                    type="button"
                                    disabled={!isEliteUnlocked}
                                    onClick={() => setFormData({ ...formData, isMultiPersona: !formData.isMultiPersona })}
                                    className={`
                                        w-12 h-6 rounded-full p-1 transition-colors duration-200 flex items-center
                                        ${formData.isMultiPersona ? 'bg-[rgb(var(--accent-primary))]' : 'bg-[rgb(var(--border-default))]'}
                                        ${!isEliteUnlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                    `}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${formData.isMultiPersona ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                                {!isEliteUnlocked && (
                                    <div className="flex items-center gap-1 text-[10px] text-[rgb(var(--accent-critical))] font-bold uppercase tracking-tighter">
                                        <Lock className="w-3 h-3" />
                                        Elite Locked
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                            {[
                                { id: 'Executive', label: 'Executive', icon: '👑', desc: 'Focus: Vision & TEI' },
                                { id: 'Financial', label: 'Financial', icon: '💰', desc: 'Focus: ROI & Budget' },
                                { id: 'Technical', label: 'Technical', icon: '🛡️', desc: 'Focus: Security & API' },
                                { id: 'Operational', label: 'Operational', icon: '⚙️', desc: 'Focus: Workflow & Ease' }
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    disabled={formData.isMultiPersona}
                                    onClick={() => setFormData({ ...formData, personaCategory: cat.id as any })}
                                    className={`
                                        p-4 rounded-[var(--radius-md)] border-2 text-left transition-all duration-200 relative
                                        ${formData.personaCategory === cat.id && !formData.isMultiPersona
                                            ? 'border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-primary)/0.05)]'
                                            : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-subtle))]'
                                        }
                                        ${formData.isMultiPersona ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className="text-2xl mb-2">{cat.icon}</div>
                                    <h3 className="font-bold text-sm mb-1">{cat.label}</h3>
                                    <p className="text-[10px] opacity-60 tracking-tight">{cat.desc}</p>
                                </button>
                            ))}
                        </div>
                        {formData.isMultiPersona && (
                            <div className="mt-4 p-3 bg-[rgb(var(--accent-primary)/0.05)] border border-[rgb(var(--accent-primary)/0.2)] rounded-lg flex items-center gap-3">
                                <Star className="w-5 h-5 text-[rgb(var(--accent-primary))]" />
                                <p className="text-xs text-[rgb(var(--text-secondary))] font-medium italic">
                                    Multi-Persona Mode Active: The Orchestrator will rotate between all categories during the session.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Methodology Selection */}
                    <div className="card-os p-6 animate-in-up" style={{ animationDelay: '0.25s' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[rgb(var(--accent-primary)/0.1)] rounded-lg">
                                <Target className="h-6 w-6 text-[rgb(var(--accent-primary))]" />
                            </div>
                            <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Sales Methodology</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                { id: 'MEDDIC', label: 'MEDDIC', description: 'Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion' },
                                { id: 'BANT', label: 'BANT', description: 'Budget, Authority, Need, Timeline' }
                            ].map((meth) => (
                                <button
                                    key={meth.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, methodology: meth.id as 'MEDDIC' | 'BANT' })}
                                    className={`
                                        p-6 rounded-[var(--radius-md)] border-2 text-left transition-all duration-200 relative
                                        ${formData.methodology === meth.id
                                            ? 'border-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-primary)/0.05)]'
                                            : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-subtle))] hover:bg-[rgb(var(--bg-surface-raised))]'
                                        }
                                    `}
                                >
                                    <h3 className={`font-bold text-lg mb-1 ${formData.methodology === meth.id ? 'text-[rgb(var(--accent-primary))]' : 'text-[rgb(var(--text-primary))]'}`}>
                                        {meth.label}
                                    </h3>
                                    <p className="text-sm opacity-80">{meth.description}</p>
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
