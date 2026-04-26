import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Play, Lock, Star, Crown, DollarSign, Shield, Settings, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/toast';

import DealContextPanel, { type DealContext } from '../components/training/briefing/DealContextPanel';
import ObjectivePanel from '../components/training/briefing/ObjectivePanel';
import MEDDICReadiness, {
    type MEDDICReadinessState,
    type MEDDICKey,
} from '../components/training/briefing/MEDDICReadiness';
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
        voice_id: 'aura-2-draco-en',
    });
    const [isEliteUnlocked, setIsEliteUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);

    // ── Account selector state ──────────────────────────────────────────────
    const [accountMode, setAccountMode] = useState(false);
    const [companies, setCompanies] = useState<{ id: string; name: string; industry_slug: string }[]>([]);
    const [personas, setPersonas] = useState<{ id: string; name: string; title: string }[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [accountState, setAccountState] = useState<{ call_count: number; current_stage: string; sentiment_score: number } | null>(null);
    const [industrySlugMap, setIndustrySlugMap] = useState<Record<string, string>>({});

    // ── New briefing state ─────────────────────────────────────────────────
    const [dealContext, setDealContext] = useState<DealContext>({
        prospectName: '', prospectCompany: '', icpTier: '',
        dealStage: '', estimatedArr: '',
    });
    const [objective, setObjective] = useState(titleParam);
    const [meddicReadiness, setMeddicReadiness] = useState<MEDDICReadinessState>(DEFAULT_MEDDIC);
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

                // Fetch industry_profile_slug mapping for account selector
                const { data: indWithSlugs } = await supabase
                    .from('industries')
                    .select('id, industry_profile_slug');
                if (indWithSlugs) {
                    const map: Record<string, string> = {};
                    for (const row of indWithSlugs) {
                        if (row.industry_profile_slug) map[row.id] = row.industry_profile_slug;
                    }
                    setIndustrySlugMap(map);
                }

                // Fetch simulated companies for account selector
                const { data: { session: authSession } } = await supabase.auth.getSession();
                if (authSession) {
                    try {
                        const res = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api`,
                            { headers: { Authorization: `Bearer ${authSession.access_token}` } },
                        );
                        if (res.ok) {
                            const companyData = await res.json();
                            setCompanies((companyData as any[]).map((c: any) => ({
                                id: c.id,
                                name: c.name,
                                industry_slug: c.industry_slug,
                            })));
                        }
                    } catch { /* non-critical */ }
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

    // Fetch personas when company is selected
    useEffect(() => {
        if (!selectedCompanyId) { setPersonas([]); setSelectedPersonaId(''); setAccountState(null); return; }
        const fetchPersonas = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/${selectedCompanyId}/personas`,
                    { headers: { Authorization: `Bearer ${session.access_token}` } },
                );
                if (res.ok) {
                    const data = await res.json();
                    setPersonas((data as any[]).map((p: any) => ({ id: p.id, name: p.name, title: p.title })));
                }
            } catch { /* non-critical */ }
        };
        fetchPersonas();
    }, [selectedCompanyId]);

    // Fetch account state when persona is selected
    useEffect(() => {
        if (!selectedCompanyId || !selectedPersonaId || !user?.id) { setAccountState(null); return; }
        const fetchAccountState = async () => {
            const { data } = await supabase
                .from('account_states')
                .select('call_count, current_stage, sentiment_score')
                .eq('company_id', selectedCompanyId)
                .eq('persona_id', selectedPersonaId)
                .eq('user_id', user.id)
                .maybeSingle();
            setAccountState(data || null);
        };
        fetchAccountState();
    }, [selectedCompanyId, selectedPersonaId, user?.id]);

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
            const payload: Record<string, unknown> = {
                ...formData,
                industryId: formData.industryId || null,
                type: moduleId ? 'learning_path' : 'simulation',
                moduleId,
                scenario: formData.isMultiPersona ? 'buying_committee' : formData.scenario,
                action: 'create',
                session_state: {
                    dealContext,
                    objective,
                    meddicReadiness,
                    confidenceRating,
                },
            };
            if (accountMode && selectedCompanyId) payload.companyId = selectedCompanyId;
            if (accountMode && selectedPersonaId) payload.personaId = selectedPersonaId;

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
            <div className="min-h-screen flex justify-center items-center bg-[#0d1117]">
                <div className="animate-spin h-10 w-10 rounded-full border-2 border-[#1e2a38] border-t-[#FF6B6B]" />
            </div>
        );
    }

    const difficulties = [
        { value: 'easy',   label: 'Easy',   xp: '+100 XP', color: 'text-green-400', hoverBorder: 'hover:border-green-400/40' },
        { value: 'medium', label: 'Medium', xp: '+200 XP', color: 'text-amber-400', hoverBorder: 'hover:border-amber-400/40' },
        { value: 'hard',   label: 'Hard',   xp: '+500 XP', color: 'text-red-400',   hoverBorder: 'hover:border-red-400/40'   },
    ];

    return (
        <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="mb-5">
                <div className="max-w-5xl mx-auto px-6 pt-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="page-kicker font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4a5567] mb-0.5">Core</div>
                            <h1 className="page-title font-['Oswald'] text-2xl font-semibold uppercase tracking-tight text-[#c9d1d9] mb-0.5">
                                Practice
                            </h1>
                            <p className="page-desc text-xs text-[#7d8a98]">Pre-call briefing and session configuration</p>
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                            <span className="text-[11px] font-medium text-[#7d8a98]">Simulation Ready</span>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="max-w-5xl mx-auto px-6 pb-8 space-y-4">

                    {/* ── Row 1: Deal Context + Objective ──────────────────── */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <DealContextPanel value={dealContext} onChange={setDealContext} />
                        <ObjectivePanel value={objective} onChange={setObjective} />
                    </div>

                    {/* ── Row 2: MEDDIC Readiness ───────────────────────────── */}
                    <MEDDICReadiness value={meddicReadiness} onChange={setMeddicReadiness} />

                    {/* ── Row 3: Session Config ─────────────────────────────── */}
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5 space-y-5">
                        <h2 className="card-title font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9] mb-4">
                            Session Configuration
                        </h2>

                        {/* Scenario */}
                        <div>
                            <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-2">
                                Scenario
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableScenarios.map(s => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, scenario: s.value }))}
                                        className={`px-4 py-2 text-[11px] font-semibold rounded-lg border transition-colors ${
                                            formData.scenario === s.value
                                                ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                                                : 'bg-[#0a0e14] border-[#1e2a38] text-[#7d8a98] hover:border-[#FF6B6B]/40 hover:text-[#c9d1d9]'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-2">
                                Difficulty
                            </label>
                            <div className="flex gap-2">
                                {difficulties.map(d => (
                                    <button
                                        key={d.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, difficulty: d.value }))}
                                        className={`flex-1 py-3 text-xs font-semibold rounded-lg border transition-colors ${
                                            formData.difficulty === d.value
                                                ? `border-current ${d.color} bg-[#0a0e14]`
                                                : `bg-[#0a0e14] border-[#1e2a38] text-[#4a5567] ${d.hoverBorder}`
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
                                    <label className="font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567]">
                                        Buyer Persona
                                    </label>
                                    <button
                                        type="button"
                                        disabled={!isEliteUnlocked}
                                        onClick={() => setFormData(prev => ({ ...prev, isMultiPersona: !prev.isMultiPersona }))}
                                        className={`flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
                                            isEliteUnlocked ? 'text-[#FF6B6B]' : 'text-[#4a5567]/40 cursor-not-allowed'
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
                                                className={`p-3 rounded-md border text-left transition-colors ${
                                                    active
                                                        ? 'border-[#FF6B6B] bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]'
                                                        : 'border-[#1e2a38] text-[#4a5567] hover:border-[#FF6B6B]/30 disabled:opacity-30 disabled:cursor-not-allowed'
                                                }`}
                                            >
                                                <Icon className="w-3.5 h-3.5 mb-1.5" />
                                                <span className="block text-[10px] font-semibold">{cat.label}</span>
                                                <span className="block text-[9px] opacity-60 mt-0.5">{cat.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {formData.isMultiPersona && (
                                    <div className="mt-2 flex items-center gap-2 text-[9px] text-[#FF6B6B]">
                                        <Star className="w-3 h-3" />
                                        Multi-Persona — all categories active
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-2">
                                        Methodology
                                    </label>
                                    <div className="flex gap-2">
                                        {(['MEDDIC', 'BANT'] as const).map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, methodology: m }))}
                                                className={`flex-1 py-3 text-xs font-semibold rounded-lg border transition-colors ${
                                                    formData.methodology === m
                                                        ? 'border-[#FF6B6B] text-[#FF6B6B] bg-[rgba(255,107,107,0.12)]'
                                                        : 'border-[#1e2a38] text-[#4a5567] hover:border-[#FF6B6B]/30'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1">
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
                                        <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1">
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
                                        <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1">
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

                    {/* ── Row 4b: Account Selector ────────────────────────── */}
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="card-title font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9]">
                                Specific Account
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setAccountMode(!accountMode);
                                    if (accountMode) {
                                        setSelectedCompanyId('');
                                        setSelectedPersonaId('');
                                        setAccountState(null);
                                    }
                                }}
                                className={`px-3 py-1 text-[9px] font-semibold uppercase tracking-wider rounded-md border transition-colors ${
                                    accountMode
                                        ? 'border-[#FF6B6B] text-[#FF6B6B] bg-[rgba(255,107,107,0.12)]'
                                        : 'border-[#1e2a38] text-[#4a5567] hover:border-[#FF6B6B]/40'
                                }`}
                            >
                                {accountMode ? 'On' : 'Off'}
                            </button>
                        </div>

                        {!accountMode && (
                            <p className="text-[10px] text-[#4a5567]">
                                Toggle on to practice against a specific simulated company and persona.
                            </p>
                        )}

                        {accountMode && (
                            <div className="space-y-3">
                                {/* Company Picker */}
                                <div>
                                    <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1">
                                        Company
                                    </label>
                                    <select
                                        value={selectedCompanyId}
                                        onChange={e => { setSelectedCompanyId(e.target.value); setSelectedPersonaId(''); setAccountState(null); }}
                                        className="input-os text-xs py-2 w-full"
                                    >
                                        <option value="">Select company...</option>
                                        {companies
                                            .filter(c => {
                                                if (!formData.industryId) return true;
                                                const slug = industrySlugMap[formData.industryId];
                                                return !slug || c.industry_slug === slug;
                                            })
                                            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                        }
                                    </select>
                                </div>

                                {/* Persona Picker */}
                                {selectedCompanyId && (
                                    <div>
                                        <label className="block font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1">
                                            Persona
                                        </label>
                                        <select
                                            value={selectedPersonaId}
                                            onChange={e => setSelectedPersonaId(e.target.value)}
                                            className="input-os text-xs py-2 w-full"
                                        >
                                            <option value="">Select persona...</option>
                                            {personas.map(p => <option key={p.id} value={p.id}>{p.name} — {p.title}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Account State Display */}
                                {selectedPersonaId && accountState && (
                                    <div className="flex items-center gap-3 p-3 bg-[#0a0e14] border border-[#1e2a38] rounded-lg">
                                        <Building2 className="h-4 w-4 text-[#FF6B6B] shrink-0" />
                                        <p className="text-[10px] text-[#7d8a98]">
                                            You've called <span className="text-[#c9d1d9] font-bold">{personas.find(p => p.id === selectedPersonaId)?.name}</span>{' '}
                                            <span className="font-['JetBrains_Mono'] text-[#FF6B6B]">{accountState.call_count}</span> times.
                                            Current stage: <span className="font-bold text-[#c9d1d9]">{accountState.current_stage}</span>.
                                            Sentiment: <span className="font-['JetBrains_Mono'] text-[#FF6B6B]">{accountState.sentiment_score}/100</span>
                                        </p>
                                    </div>
                                )}

                                {selectedPersonaId && !accountState && (
                                    <div className="flex items-center gap-3 p-3 bg-[#0a0e14] border border-[#1e2a38] rounded-lg">
                                        <Building2 className="h-4 w-4 text-[#4a5567] shrink-0" />
                                        <p className="text-[10px] text-[#4a5567]">
                                            First call with this persona. Account state will be created when you start.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Row 5: Prospect Voice ────────────────────────────── */}
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5">
                        <VoiceSelector
                            label="Prospect Voice"
                            value={formData.voice_id}
                            onChange={(id) => setFormData(prev => ({ ...prev, voice_id: id }))}
                        />
                    </div>

                    {/* ── Row 6: Confidence + CTA ───────────────────────────── */}
                    <div className="border-t border-[#1e2a38] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <ConfidenceRating value={confidenceRating} onChange={setConfidenceRating} />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-[#FF6B6B] text-white font-semibold uppercase tracking-[0.05em] rounded-lg border-2 border-[#FF6B6B] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-['DM_Sans']"
                        >
                            <Play className="h-4 w-4 fill-current shrink-0" />
                            {loading ? 'Starting...' : 'Enter Simulation'}
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
}
