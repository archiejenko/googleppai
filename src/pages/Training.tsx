import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Play, Lock, Star, Crown, DollarSign, Shield, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/toast';

import DealContextPanel, { type DealContext } from '../components/training/briefing/DealContextPanel';
import ObjectivePanel from '../components/training/briefing/ObjectivePanel';
import MEDDICReadiness, {
    type MEDDICReadinessState,
    type MEDDICKey,
} from '../components/training/briefing/MEDDICReadiness';
import ObjectionForecast from '../components/training/briefing/ObjectionForecast';
import ConfidenceRating from '../components/training/briefing/ConfidenceRating';
import VoiceSelector from '../components/training/VoiceSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

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

const PERSONA_CATEGORIES = [
    { id: 'Executive',   label: 'Executive',   icon: Crown,      desc: 'Vision & TEI' },
    { id: 'Financial',   label: 'Financial',   icon: DollarSign, desc: 'ROI & Budget' },
    { id: 'Technical',   label: 'Technical',   icon: Shield,     desc: 'Security & API' },
    { id: 'Operational', label: 'Operational', icon: Settings,   desc: 'Workflow & Ease' },
] as const;

type PersonaCategory = typeof PERSONA_CATEGORIES[number]['id'];

const DEFAULT_SCENARIOS = [
    { value: 'cold_call',          label: 'Cold Call',          description: 'Initial outreach to prospects' },
    { value: 'product_demo',       label: 'Product Demo',       description: 'Showcase your solution' },
    { value: 'objection_handling', label: 'Objection Handling', description: 'Address concerns effectively' },
    { value: 'negotiation',        label: 'Negotiation',        description: 'Navigate pricing discussions' },
    { value: 'closing',            label: 'Closing',            description: 'Seal the deal' },
];

const DEFAULT_MEDDIC: MEDDICReadinessState = {
    Metrics: 'unknown', EconomicBuyer: 'unknown', DecisionCriteria: 'unknown',
    DecisionProcess: 'unknown', IdentifyPain: 'unknown', Champion: 'unknown',
} satisfies Record<MEDDICKey, 'unknown'>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Training() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const moduleId = searchParams.get('moduleId');

    const scenarioParam = searchParams.get('scenario') || 'cold_call';
    const titleParam    = searchParams.get('title')    || '';

    // ── Existing form state (unchanged data contract) ──────────────────────
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [availableScenarios, setAvailableScenarios] = useState(DEFAULT_SCENARIOS);
    const [formData, setFormData] = useState({
        scenario: scenarioParam,
        difficulty: 'medium',
        targetPersona: '',
        pitchGoal: titleParam,
        timeLimit: 300,
        language: 'en',
        industryId: '',
        methodology: 'MEDDIC' as 'MEDDIC' | 'BANT',
        personaCategory: 'Executive' as PersonaCategory,
        isMultiPersona: false,
        voice_id: '5PEXwsADjqmz7GO58o3B',
    });
    const [isEliteUnlocked, setIsEliteUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // ── New briefing state ─────────────────────────────────────────────────
    const [dealContext, setDealContext] = useState<DealContext>({
        prospectName: '', prospectCompany: '', icpTier: '',
        dealStage: '', estimatedArr: '',
    });
    const [objective, setObjective] = useState(titleParam);
    const [meddicReadiness, setMeddicReadiness] = useState<MEDDICReadinessState>(DEFAULT_MEDDIC);
    const [objectionForecast, setObjectionForecast] = useState<string[]>([]);
    const [confidenceRating, setConfidenceRating] = useState<number | null>(null);

    // ── Data fetch (unchanged) ─────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: indData, error: indError } = await supabase.from('industries').select('*');
                if (indError) throw indError;

                type DBIndustry = {
                    id: string; name: string; description: string; icon: string;
                    scenario_templates?: { id: string; title: string; description: string; difficulty: string; targetPersona: string }[];
                };
                setIndustries((indData as DBIndustry[] || []).map(ind => ({
                    id: ind.id, name: ind.name, description: ind.description, icon: ind.icon,
                    scenarioTemplates: ind.scenario_templates,
                })));

                if (moduleId) {
                    const { data: mod, error: modError } = await supabase
                        .from('learning_modules').select('*').eq('id', moduleId).single();
                    if (!modError && mod) {
                        setFormData(prev => ({
                            ...prev,
                            scenario: mod.scenario_type || 'cold_call',
                            difficulty: (mod.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
                            pitchGoal: mod.title,
                            targetPersona: mod.target_persona || '',
                        }));
                        setObjective(mod.title || '');
                    }
                }

                if (user?.id) {
                    const { data: profile } = await supabase
                        .from('profiles').select('mastery_level, preferred_voice_id').eq('id', user.id).single();
                    if (profile?.mastery_level === 'Elite') setIsEliteUnlocked(true);
                    if (profile?.preferred_voice_id) setFormData(prev => ({ ...prev, voice_id: profile.preferred_voice_id }));
                }
            } catch (error) {
                console.error('[Training] Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [moduleId, user?.id]);

    useEffect(() => {
        if (!formData.industryId) { setAvailableScenarios(DEFAULT_SCENARIOS); return; }
        const industry = industries.find(ind => ind.id === formData.industryId);
        if (industry?.scenarioTemplates?.length) {
            const mapped = industry.scenarioTemplates.map(t => ({
                value: t.id, label: t.title, description: t.description,
            }));
            setAvailableScenarios(mapped);
            if (!moduleId) setFormData(prev => ({ ...prev, scenario: mapped[0].value }));
        } else {
            setAvailableScenarios(DEFAULT_SCENARIOS);
        }
    }, [formData.industryId, industries, moduleId]);

    // ── Submit (unchanged data contract; session_state extended) ──────────
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                industryId: formData.industryId || null,
                type: moduleId ? 'learning_path' : 'simulation',
                moduleId,
                scenario: formData.isMultiPersona ? 'buying_committee' : formData.scenario,
                action: 'create',
                // Extended: deal context stored in session_state
                session_state: {
                    dealContext,
                    objective,
                    meddicReadiness,
                    confidenceRating,
                    objectionForecast,
                },
            };

            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) throw new Error('No active session found. Please log in again.');

            const { data, error } = await supabase.functions.invoke('training-api', { body: payload });
            if (error) throw error;

            let sessionData = data;
            if (typeof data === 'string') {
                try { sessionData = JSON.parse(data); } catch { throw new Error('Server returned an unparseable response.'); }
            }
            if (!sessionData || typeof sessionData !== 'object') {
                throw new Error(`Server returned an unexpected response type: ${typeof data}. Value: ${JSON.stringify(data)?.slice(0, 200)}`);
            }
            if ((sessionData as Record<string, unknown>).error) {
                throw new Error(`Server error: ${(sessionData as Record<string, unknown>).error}`);
            }
            if (!(sessionData as Record<string, unknown>)?.id) throw new Error('Server returned a response without a session ID.');

            navigate(`/active-training?sessionId=${sessionData.id}&voice_id=${encodeURIComponent(formData.voice_id)}`);
        } catch (error: unknown) {
            const err = error as { message?: string; context?: { json?: () => Promise<{ details?: string; error?: string; message?: string }> } };
            let detailedMsg = err.message || 'Unknown error';
            let isAuthError = false;

            if (err.context && typeof err.context.json === 'function') {
                try {
                    const body = await err.context.json();
                    detailedMsg = body?.details || body?.error || body?.message || detailedMsg;
                    isAuthError = detailedMsg.includes('JWT') || body?.error === 'Unauthorized';
                } catch { /* already consumed */ }
            }

            if (isAuthError) {
                showError('Something went wrong, please try again.', detailedMsg);
                return;
            }
            showError('Failed to start session', detailedMsg);
        } finally {
            setLoading(false);
        }
    };

    // ── Loading state ──────────────────────────────────────────────────────
    if (loading && industries.length === 0) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-bg-canvas">
                <div className="animate-spin h-10 w-10 border-2 border-border-DEFAULT border-t-accent" />
            </div>
        );
    }

    const difficulties = [
        { value: 'easy',   label: 'Easy',   xp: '+100 XP', color: 'text-green-400', hoverBorder: 'hover:border-green-400/40' },
        { value: 'medium', label: 'Medium', xp: '+200 XP', color: 'text-amber-400', hoverBorder: 'hover:border-amber-400/40' },
        { value: 'hard',   label: 'Hard',   xp: '+500 XP', color: 'text-red-400',   hoverBorder: 'hover:border-red-400/40'   },
    ];

    return (
        <div
            className="min-h-screen bg-bg-canvas text-text-primary"
            style={{ background: 'linear-gradient(180deg, #0f0f10 0%, #0d1117 100%)' }}
        >
            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="border-b border-[#2a2a2e]">
                <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-muted mb-1">
                            OAST — Pre-Call Briefing
                        </p>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-text-primary">
                            Mission Briefing
                        </h1>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-text-muted">
                        <div className="w-1.5 h-1.5 bg-accent animate-pulse" />
                        Simulation Ready
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

                    {/* ── Row 1: Deal Context + Objective ──────────────────── */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <DealContextPanel value={dealContext} onChange={setDealContext} />
                        <ObjectivePanel value={objective} onChange={setObjective} />
                    </div>

                    {/* ── Row 2: MEDDIC Readiness ───────────────────────────── */}
                    <MEDDICReadiness value={meddicReadiness} onChange={setMeddicReadiness} />

                    {/* ── Row 3: Objection Forecast ─────────────────────────── */}
                    <ObjectionForecast
                        objections={objectionForecast}
                        onGenerate={setObjectionForecast}
                        prospectName={dealContext.prospectName}
                        prospectCompany={dealContext.prospectCompany}
                        callPurpose={objective}
                    />

                    {/* ── Row 4: Session Config ─────────────────────────────── */}
                    <div className="bg-bg-surface border border-[#2a2a2e] p-5 space-y-5">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                            Session Configuration
                        </h2>

                        {/* Scenario */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
                                Scenario
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableScenarios.map(s => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, scenario: s.value }))}
                                        className={`px-4 py-2 text-xs font-black border transition-colors ${
                                            formData.scenario === s.value
                                                ? 'bg-accent text-white border-accent'
                                                : 'bg-bg-canvas border-[#2a2a2e] text-text-muted hover:border-accent/40 hover:text-text-primary'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
                                Difficulty
                            </label>
                            <div className="flex gap-2">
                                {difficulties.map(d => (
                                    <button
                                        key={d.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, difficulty: d.value }))}
                                        className={`flex-1 py-3 text-xs font-black border transition-colors ${
                                            formData.difficulty === d.value
                                                ? `border-current ${d.color} bg-bg-canvas`
                                                : `bg-bg-canvas border-[#2a2a2e] text-text-muted ${d.hoverBorder}`
                                        }`}
                                    >
                                        <span className="block">{d.label}</span>
                                        <span className="block text-[9px] opacity-60 mt-0.5">{d.xp}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Persona + Methodology */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">
                                        Buyer Persona
                                    </label>
                                    <button
                                        type="button"
                                        disabled={!isEliteUnlocked}
                                        onClick={() => setFormData(prev => ({ ...prev, isMultiPersona: !prev.isMultiPersona }))}
                                        className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-wider transition-colors ${
                                            isEliteUnlocked ? 'text-accent' : 'text-text-muted/40 cursor-not-allowed'
                                        }`}
                                    >
                                        {!isEliteUnlocked && <Lock className="w-2.5 h-2.5" />}
                                        {formData.isMultiPersona ? 'Multi On' : 'Multi Off'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {PERSONA_CATEGORIES.map(cat => {
                                        const Icon = cat.icon;
                                        const active = formData.personaCategory === cat.id && !formData.isMultiPersona;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                disabled={formData.isMultiPersona}
                                                onClick={() => setFormData(prev => ({ ...prev, personaCategory: cat.id }))}
                                                className={`p-3 border text-left transition-colors ${
                                                    active
                                                        ? 'border-accent bg-accent/5 text-accent'
                                                        : 'border-[#2a2a2e] text-text-muted hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5 mb-1.5" />
                                                <span className="block text-[10px] font-black">{cat.label}</span>
                                                <span className="block text-[9px] opacity-60 mt-0.5">{cat.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {formData.isMultiPersona && (
                                    <div className="mt-2 flex items-center gap-2 text-[9px] text-accent">
                                        <Star className="w-3 h-3" />
                                        Multi-Persona — all categories active
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-2">
                                        Methodology
                                    </label>
                                    <div className="flex gap-2">
                                        {(['MEDDIC', 'BANT'] as const).map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, methodology: m }))}
                                                className={`flex-1 py-3 text-xs font-black border transition-colors ${
                                                    formData.methodology === m
                                                        ? 'border-accent text-accent bg-accent/5'
                                                        : 'border-[#2a2a2e] text-text-muted hover:border-accent/30'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                                            Time Limit
                                        </label>
                                        <select
                                            value={formData.timeLimit}
                                            onChange={e => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                                            className="input-os text-xs py-2"
                                        >
                                            <option value={60}>1 min</option>
                                            <option value={120}>2 min</option>
                                            <option value={180}>3 min</option>
                                            <option value={300}>5 min</option>
                                            <option value={600}>10 min</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                                            Language
                                        </label>
                                        <select
                                            value={formData.language}
                                            onChange={e => setFormData(prev => ({ ...prev, language: e.target.value }))}
                                            className="input-os text-xs py-2"
                                        >
                                            <option value="en">English</option>
                                            <option value="es">Spanish</option>
                                            <option value="fr">French</option>
                                            <option value="de">German</option>
                                            <option value="zh">Chinese</option>
                                        </select>
                                    </div>
                                </div>

                                {industries.length > 0 && (
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-text-muted mb-1">
                                            Industry
                                        </label>
                                        <select
                                            value={formData.industryId}
                                            onChange={e => setFormData(prev => ({ ...prev, industryId: e.target.value }))}
                                            className="input-os text-xs py-2"
                                        >
                                            <option value="">All industries</option>
                                            {industries.map(ind => (
                                                <option key={ind.id} value={ind.id}>{ind.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Row 5: Prospect Voice ────────────────────────────── */}
                    <div className="bg-bg-surface border border-[#2a2a2e] p-5">
                        <VoiceSelector
                            label="Prospect Voice"
                            value={formData.voice_id}
                            onChange={(id) => setFormData(prev => ({ ...prev, voice_id: id }))}
                        />
                    </div>

                    {/* ── Row 6: Confidence + CTA ───────────────────────────── */}
                    <div className="border-t border-[#2a2a2e] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <ConfidenceRating value={confidenceRating} onChange={setConfidenceRating} />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-accent text-white font-black uppercase tracking-[0.15em] border-2 border-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                            <Play className="h-4 w-4 fill-current shrink-0" />
                            {loading ? 'Starting…' : 'Enter Simulation'}
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
}
