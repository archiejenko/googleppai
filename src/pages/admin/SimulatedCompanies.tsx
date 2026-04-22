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

    const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th
            className="p-4 cursor-pointer select-none hover:text-[rgb(var(--text-primary))] transition-colors"
            onClick={() => toggleSort(field)}
        >
            <span className="flex items-center gap-1">
                {children}
                {sortField === field && <span className="text-[rgb(var(--accent-primary))]">{sortAsc ? '↑' : '↓'}</span>}
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

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 animate-in-up flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">Simulated Companies</h1>
                        <p className="text-[rgb(var(--text-secondary))]">Manage simulated accounts for sales training</p>
                    </div>
                    <button onClick={() => { setEditingId(undefined); setShowForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2">
                        <Plus className="h-4 w-4" /> New Company
                    </button>
                </div>

                {/* Filters */}
                <div className="mb-4 animate-in-up flex items-center gap-3" style={{ animationDelay: '0.1s' }}>
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
                <div className="card-os p-0 overflow-hidden animate-in-up" style={{ animationDelay: '0.15s' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] font-medium border-b border-[rgb(var(--border-default))]">
                                <tr>
                                    <SortHeader field="name">Name</SortHeader>
                                    <SortHeader field="industry">Industry</SortHeader>
                                    <SortHeader field="stage">Stage</SortHeader>
                                    <SortHeader field="difficulty_tier">Difficulty</SortHeader>
                                    <SortHeader field="personas">Personas</SortHeader>
                                    <SortHeader field="created_at">Created</SortHeader>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {sorted.map(company => (
                                    <tr
                                        key={company.id}
                                        className="hover:bg-[rgb(var(--bg-surface-raised))] transition-colors cursor-pointer"
                                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-[rgb(var(--bg-canvas))] text-[rgb(var(--accent-primary))]">
                                                    <Building2 className="h-4 w-4" />
                                                </div>
                                                <span className="text-[rgb(var(--text-primary))] font-medium">{company.name}</span>
                                                {company.source === 'crm_sync' && (
                                                    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[rgb(var(--accent-primary))]/10 text-[rgb(var(--accent-primary))] border border-[rgb(var(--accent-primary))]/20">
                                                        {company.external_provider === 'salesforce' ? 'Salesforce' : 'HubSpot'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-[rgb(var(--text-secondary))]">{company.industry?.display_name || company.industry_slug}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border-subtle))]">
                                                {company.stage}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                company.difficulty_tier === 'nightmare' ? 'text-status-danger bg-status-danger/10' :
                                                company.difficulty_tier === 'hard' ? 'text-red-400 bg-red-400/10' :
                                                company.difficulty_tier === 'medium' ? 'text-amber-400 bg-amber-400/10' :
                                                'text-green-400 bg-green-400/10'
                                            }`}>
                                                {company.difficulty_tier}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[rgb(var(--text-secondary))] font-mono">{company.simulated_personas?.[0]?.count || 0}</td>
                                        <td className="p-4 text-[rgb(var(--text-muted))] text-xs">{new Date(company.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => { setEditingId(company.id); setShowForm(true); }}
                                                    className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-canvas))] transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(company.id, company.name)}
                                                    className="p-2 text-[rgb(var(--text-muted))] hover:text-status-danger hover:bg-status-danger/10 transition-colors"
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
                                        <td colSpan={7} className="p-8 text-center text-[rgb(var(--text-muted))]">
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
                <p className="text-[rgb(var(--text-muted))]">Company not found.</p>
            </div>
        );
    }

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Back + Header */}
                <div className="mb-8 animate-in-up">
                    <button onClick={() => navigate('/admin/companies')} className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4" /> Back to companies
                    </button>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--accent-primary))]">
                                <Building2 className="h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-display font-bold text-[rgb(var(--text-primary))]">{company.name}</h1>
                                <p className="text-[rgb(var(--text-secondary))] text-sm">
                                    {company.industry?.display_name || company.industry_slug} · {company.size} · {company.stage}
                                    <span className={`ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                        company.difficulty_tier === 'nightmare' ? 'text-status-danger bg-status-danger/10' :
                                        company.difficulty_tier === 'hard' ? 'text-red-400 bg-red-400/10' :
                                        company.difficulty_tier === 'medium' ? 'text-amber-400 bg-amber-400/10' :
                                        'text-green-400 bg-green-400/10'
                                    }`}>
                                        {company.difficulty_tier}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowCompanyForm(true)} className="px-4 py-2 text-sm border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--accent-primary))] transition-colors flex items-center gap-2">
                            <Pencil className="h-4 w-4" /> Edit Company
                        </button>
                    </div>
                </div>

                {/* Personas Section */}
                <div className="animate-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-[rgb(var(--text-muted))]" />
                            <h2 className="text-lg font-display font-bold text-[rgb(var(--text-primary))]">Personas</h2>
                            <span className="text-sm text-[rgb(var(--text-muted))]">({personas.length})</span>
                        </div>
                        <button onClick={() => { setEditingPersonaId(undefined); setShowPersonaForm(true); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                            <Plus className="h-4 w-4" /> Add Persona
                        </button>
                    </div>

                    <div className="card-os p-0 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] font-medium border-b border-[rgb(var(--border-default))]">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Title</th>
                                    <th className="p-4">Seniority</th>
                                    <th className="p-4">Style</th>
                                    <th className="p-4">Created</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                {personas.map(persona => (
                                    <tr key={persona.id} className="hover:bg-[rgb(var(--bg-surface-raised))] transition-colors">
                                        <td className="p-4 text-[rgb(var(--text-primary))] font-medium">{persona.name}</td>
                                        <td className="p-4 text-[rgb(var(--text-secondary))]">{persona.title}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border-subtle))]">
                                                {persona.seniority}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[rgb(var(--text-muted))] text-xs">{persona.personality_profile?.communication_style || '—'}</td>
                                        <td className="p-4 text-[rgb(var(--text-muted))] text-xs">{new Date(persona.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => { setEditingPersonaId(persona.id); setShowPersonaForm(true); }}
                                                    className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-canvas))] transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePersona(persona.id, persona.name)}
                                                    className="p-2 text-[rgb(var(--text-muted))] hover:text-status-danger hover:bg-status-danger/10 transition-colors"
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
                                        <td colSpan={6} className="p-8 text-center text-[rgb(var(--text-muted))]">
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
