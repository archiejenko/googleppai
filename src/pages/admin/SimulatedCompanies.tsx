import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { showSuccess, showError } from '../../utils/toast';
import { Plus, ArrowLeft, Trash2, Pencil, Building2, Users } from 'lucide-react';
import CompanyForm from './CompanyForm';
import PersonaForm from './PersonaForm';

interface Company {
    id: string;
    name: string;
    industry_slug: string;
    industry: { display_name: string } | null;
    size: string;
    stage: string;
    difficulty_tier: string;
    source: string;
    external_provider: string | null;
    simulated_personas: { count: number }[];
    created_at: string;
}

interface Persona {
    id: string;
    name: string;
    title: string;
    seniority: string;
    personality_profile: { communication_style?: string } | null;
    created_at: string;
}

type SortField = 'name' | 'industry' | 'stage' | 'difficulty_tier' | 'personas' | 'created_at';
type SourceFilter = '' | 'manual' | 'crm_sync' | 'uploaded';

export function CompanyList() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | undefined>();
    const [industryFilter, setIndustryFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('');
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortAsc, setSortAsc] = useState(false);

    useEffect(() => { fetchCompanies(); }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api`,
            { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        const data = await res.json();
        if (res.ok) setCompanies(data);
        else showError('Failed to load companies');
        setLoading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete "${name}"? This will also delete all personas and account states for this company.`)) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/${id}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (res.ok) {
            setCompanies(prev => prev.filter(c => c.id !== id));
            showSuccess('Company deleted');
        } else {
            showError('Failed to delete company');
        }
    };

    const industries = [...new Set(companies.map(c => c.industry?.display_name || c.industry_slug))];

    const filtered = companies.filter(c => {
        if (industryFilter && (c.industry?.display_name || c.industry_slug) !== industryFilter) return false;
        if (sourceFilter && c.source !== sourceFilter) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
            case 'name': cmp = a.name.localeCompare(b.name); break;
            case 'industry': cmp = (a.industry?.display_name || '').localeCompare(b.industry?.display_name || ''); break;
            case 'stage': cmp = a.stage.localeCompare(b.stage); break;
            case 'difficulty_tier': cmp = a.difficulty_tier.localeCompare(b.difficulty_tier); break;
            case 'personas': cmp = (a.simulated_personas?.[0]?.count || 0) - (b.simulated_personas?.[0]?.count || 0); break;
            case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        }
        return sortAsc ? cmp : -cmp;
    });

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortAsc(!sortAsc);
        else { setSortField(field); setSortAsc(true); }
    };

    const difficultyPill = (tier: string) => {
        const cls = tier === 'nightmare' ? 'pill pill-coral' :
                    tier === 'hard' ? 'pill pill-coral' :
                    tier === 'medium' ? 'pill pill-amber' :
                    'pill pill-green'
        return <span className={cls}>{tier}</span>
    }

    const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th
            className="cursor-pointer select-none hover:text-[rgb(var(--text-primary))] transition-colors"
            onClick={() => toggleSort(field)}
        >
            <span className="flex items-center gap-1">
                {children}
                {sortField === field && <span className="text-[#FF6B6B]">{sortAsc ? '↑' : '↓'}</span>}
            </span>
        </th>
    );

    if (loading) {
        return (
            <div className="layout-shell flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[rgb(var(--border-default))] border-t-[rgb(var(--accent-primary))]" />
            </div>
        );
    }

    // Compute stats from live data
    const totalCompanies = companies.length
    const manualCount = companies.filter(c => c.source === 'manual').length
    const crmCount = companies.filter(c => c.source === 'crm_sync').length
    const totalPersonas = companies.reduce((sum, c) => sum + (c.simulated_personas?.[0]?.count || 0), 0)

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h1 className="page-title">Accounts</h1>
                        <p className="page-desc">Account pipeline, deal stages, and health tracking.</p>
                    </div>
                    <button onClick={() => { setEditingId(undefined); setShowForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2">
                        <Plus className="h-4 w-4" /> New Company
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">Total Accounts</div>
                        <div className="stat-value text-[rgb(var(--text-primary))]">{totalCompanies}</div>
                    </div>
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">Manual</div>
                        <div className="stat-value text-[rgb(var(--text-primary))]">{manualCount}</div>
                    </div>
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">CRM Synced</div>
                        <div className="stat-value text-[rgb(var(--text-primary))]">{crmCount}</div>
                    </div>
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                        <div className="stat-label">Total Personas</div>
                        <div className="stat-value text-[#4ADE80]">{totalPersonas}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-5">
                    {industries.length > 1 && (
                        <select
                            value={industryFilter}
                            onChange={e => setIndustryFilter(e.target.value)}
                            className="input-os text-sm py-2"
                        >
                            <option value="">All Industries</option>
                            {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                        </select>
                    )}
                    <select
                        value={sourceFilter}
                        onChange={e => setSourceFilter(e.target.value as SourceFilter)}
                        className="input-os text-sm py-2"
                    >
                        <option value="">All Sources</option>
                        <option value="manual">Manual</option>
                        <option value="crm_sync">CRM Sync</option>
                        <option value="uploaded">Uploaded</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-0 overflow-hidden">
                    <div className="p-5 pb-0">
                        <div className="card-title">Accounts</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-os">
                            <thead>
                                <tr>
                                    <SortHeader field="name">Name</SortHeader>
                                    <SortHeader field="industry">Industry</SortHeader>
                                    <SortHeader field="stage">Stage</SortHeader>
                                    <SortHeader field="difficulty_tier">Difficulty</SortHeader>
                                    <SortHeader field="personas">Personas</SortHeader>
                                    <SortHeader field="created_at">Created</SortHeader>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map(company => (
                                    <tr
                                        key={company.id}
                                        className="cursor-pointer"
                                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-[rgba(255,107,107,0.12)] rounded-md text-[#FF6B6B]">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <span className="text-[rgb(var(--text-primary))] font-medium">{company.name}</span>
                                                {company.source === 'crm_sync' && (
                                                    <span className="pill pill-blue text-[9px]">
                                                        {company.external_provider === 'salesforce' ? 'Salesforce' : 'HubSpot'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{company.industry?.display_name || company.industry_slug}</td>
                                        <td>
                                            <span className="pill pill-amber">
                                                {company.stage}
                                            </span>
                                        </td>
                                        <td>
                                            {difficultyPill(company.difficulty_tier)}
                                        </td>
                                        <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{company.simulated_personas?.[0]?.count || 0}</td>
                                        <td className="text-xs">{new Date(company.created_at).toLocaleDateString()}</td>
                                        <td className="text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => { setEditingId(company.id); setShowForm(true); }}
                                                    className="p-2 text-[#4a5567] hover:text-[rgb(var(--text-primary))] hover:bg-[rgba(255,255,255,0.03)] rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(company.id, company.name)}
                                                    className="p-2 text-[#4a5567] hover:text-[#FF6B6B] hover:bg-[rgba(255,107,107,0.12)] rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sorted.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center">
                                            No simulated companies yet. Create one to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <CompanyForm
                    companyId={editingId}
                    onClose={() => setShowForm(false)}
                    onSaved={() => { setShowForm(false); fetchCompanies(); }}
                />
            )}
        </div>
    );
}

export function CompanyDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [company, setCompany] = useState<Company | null>(null);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompanyForm, setShowCompanyForm] = useState(false);
    const [showPersonaForm, setShowPersonaForm] = useState(false);
    const [editingPersonaId, setEditingPersonaId] = useState<string | undefined>();

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !id) return;

        const [companiesRes, personasRes] = await Promise.all([
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            }),
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/${id}/personas`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            }),
        ]);

        if (companiesRes.ok) {
            const companies = await companiesRes.json();
            const found = (companies as Company[]).find(c => c.id === id);
            setCompany(found || null);
        }
        if (personasRes.ok) {
            setPersonas(await personasRes.json());
        }
        setLoading(false);
    };

    const handleDeletePersona = async (personaId: string, name: string) => {
        if (!window.confirm(`Delete persona "${name}"?`)) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/personas/${personaId}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (res.ok) {
            setPersonas(prev => prev.filter(p => p.id !== personaId));
            showSuccess('Persona deleted');
        } else {
            showError('Failed to delete persona');
        }
    };

    const detailDifficultyPill = (tier: string) => {
        const cls = tier === 'nightmare' ? 'pill pill-coral' :
                    tier === 'hard' ? 'pill pill-coral' :
                    tier === 'medium' ? 'pill pill-amber' :
                    'pill pill-green'
        return <span className={cls}>{tier}</span>
    }

    if (loading) {
        return (
            <div className="layout-shell flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[rgb(var(--border-default))] border-t-[rgb(var(--accent-primary))]" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="layout-shell p-6 md:p-12">
                <p className="text-[#4a5567]">Company not found.</p>
            </div>
        );
    }

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Back + Header */}
                <div className="mb-6">
                    <button onClick={() => navigate('/admin/companies')} className="flex items-center gap-2 text-sm text-[#4a5567] hover:text-[rgb(var(--text-primary))] transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4" /> Back to companies
                    </button>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[rgba(255,107,107,0.12)] rounded-lg text-[#FF6B6B]">
                                <Building2 className="h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="page-title">{company.name}</h1>
                                <p className="page-desc">
                                    {company.industry?.display_name || company.industry_slug} · {company.size} · {company.stage}
                                    <span className="ml-2">{detailDifficultyPill(company.difficulty_tier)}</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowCompanyForm(true)} className="px-4 py-2 text-sm border border-[rgb(var(--border-default))] rounded-lg text-[#7d8a98] hover:border-[#FF6B6B] hover:text-[rgb(var(--text-primary))] transition-colors flex items-center gap-2">
                            <Pencil className="h-4 w-4" /> Edit Company
                        </button>
                    </div>
                </div>

                {/* Personas Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-[#4a5567]" />
                            <h2 className="card-title mb-0">Personas</h2>
                            <span className="text-sm text-[#4a5567]">({personas.length})</span>
                        </div>
                        <button onClick={() => { setEditingPersonaId(undefined); setShowPersonaForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                            <Plus className="h-4 w-4" /> Add Persona
                        </button>
                    </div>

                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-0 overflow-hidden">
                        <table className="table-os">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Title</th>
                                    <th>Seniority</th>
                                    <th>Style</th>
                                    <th>Created</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {personas.map(persona => (
                                    <tr key={persona.id}>
                                        <td className="text-[rgb(var(--text-primary))] font-medium">{persona.name}</td>
                                        <td>{persona.title}</td>
                                        <td>
                                            <span className="pill pill-amber">
                                                {persona.seniority}
                                            </span>
                                        </td>
                                        <td className="text-xs">{persona.personality_profile?.communication_style || '—'}</td>
                                        <td className="text-xs">{new Date(persona.created_at).toLocaleDateString()}</td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => { setEditingPersonaId(persona.id); setShowPersonaForm(true); }}
                                                    className="p-2 text-[#4a5567] hover:text-[rgb(var(--text-primary))] hover:bg-[rgba(255,255,255,0.03)] rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePersona(persona.id, persona.name)}
                                                    className="p-2 text-[#4a5567] hover:text-[#FF6B6B] hover:bg-[rgba(255,107,107,0.12)] rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {personas.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center">
                                            No personas yet. Add one to make this company available for training.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showCompanyForm && (
                <CompanyForm
                    companyId={id}
                    onClose={() => setShowCompanyForm(false)}
                    onSaved={() => { setShowCompanyForm(false); fetchData(); }}
                />
            )}

            {showPersonaForm && id && (
                <PersonaForm
                    companyId={id}
                    personaId={editingPersonaId}
                    onClose={() => setShowPersonaForm(false)}
                    onSaved={() => { setShowPersonaForm(false); fetchData(); }}
                />
            )}
        </div>
    );
}
