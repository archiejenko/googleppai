import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Video, Globe, Key, Bot, Eye, Monitor, Clock, Trash2,
    CheckCircle2, XCircle, ChevronDown, ChevronUp, Info, Shield,
    Building2, RefreshCw, ExternalLink, ChevronRight,
} from 'lucide-react';
import { useTier } from '../../context/TierContext';
import { useAuth } from '../../context/AuthContext';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../../utils/supabase';
import TierGate from '../../components/shared/TierGate';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CrmConnection {
    id: string;
    provider: 'hubspot' | 'salesforce';
    hub_id: string | null;
    instance_url: string | null;
    status: 'active' | 'expired' | 'disconnected';
    connected_at: string;
    last_synced_at: string | null;
    field_mappings: Record<string, { crm_field: string; label: string }>;
}

type ConnectionStatus = 'connected' | 'disconnected';

interface PlatformState {
    teams: ConnectionStatus;
    zoom: ConnectionStatus;
    meet: ConnectionStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: ConnectionStatus }) {
    return status === 'connected' ? (
        <span className="flex items-center gap-1.5 text-[11px] text-status-success">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
        </span>
    ) : (
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <XCircle className="w-3.5 h-3.5" /> Disconnected
        </span>
    );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="mb-5">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-0.5">{title}</h2>
            <p className="text-xs text-text-muted opacity-60">{subtitle}</p>
        </div>
    );
}

function SaveToast({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return (
        <div className="fixed bottom-6 right-6 z-50 card-os px-5 py-3 flex items-center gap-2 text-sm text-status-success border-status-success/30 bg-status-success/5 shadow-brutal">
            <CheckCircle2 className="w-4 h-4" />
            Settings saved
        </div>
    );
}

// ─── Platform Card ────────────────────────────────────────────────────────────

interface PlatformCardProps {
    name: string;
    description: string;
    status: ConnectionStatus;
    icon: React.ElementType;
    permissions: string[];
    connectLabel: string;
    isLocked: boolean;
    onToggle: () => void;
}

function PlatformCard({
    name, description, status, icon: Icon, permissions, connectLabel, isLocked, onToggle,
}: PlatformCardProps) {
    const [showPerms, setShowPerms] = useState(false);

    return (
        <div className={`card-os p-5 flex flex-col gap-4 ${isLocked ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-bg-raised border border-border flex items-center justify-center">
                        <Icon className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div>
                        <p className="text-sm text-text-primary">{name}</p>
                        <p className="text-xs text-text-muted">{description}</p>
                    </div>
                </div>
                <StatusChip status={status} />
            </div>

            {/* Permissions (collapsed) */}
            <div>
                <button
                    onClick={() => setShowPerms(v => !v)}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-text-muted hover:text-text-secondary transition-colors"
                >
                    Required permissions
                    {showPerms ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showPerms && (
                    <ul className="mt-2 space-y-1">
                        {permissions.map(p => (
                            <li key={p} className="flex items-center gap-1.5 text-[11px] text-text-muted">
                                <Shield className="w-3 h-3 text-accent/60 shrink-0" />
                                <code className="text-[10px] bg-bg-raised px-1 py-0.5">{p}</code>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Action */}
            <div className="relative">
                {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className="text-[10px] uppercase tracking-widest text-accent/70 border border-accent/20 px-2 py-1 bg-bg-canvas">
                            Revenue Intelligence tier required
                        </span>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    disabled={isLocked}
                    className={`w-full text-xs py-2 border transition-colors ${
                        status === 'connected'
                            ? 'border-status-danger/40 text-status-danger hover:bg-status-danger/5'
                            : 'btn-primary'
                    }`}
                >
                    {status === 'connected' ? 'Disconnect' : connectLabel}
                </button>
            </div>
        </div>
    );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({
    label, description, checked, onChange, note,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    note?: string;
}) {
    return (
        <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative mt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="sr-only"
                />
                <div
                    className={`w-10 h-5 border-2 transition-colors ${checked ? 'bg-accent/20 border-accent' : 'bg-bg-raised border-border'}`}
                    onClick={() => onChange(!checked)}
                >
                    <div
                        className={`w-3.5 h-3.5 mt-0.5 transition-transform ${checked ? 'translate-x-5 bg-accent' : 'translate-x-0.5 bg-text-muted'}`}
                    />
                </div>
            </div>
            <div className="flex-1">
                <p className="text-sm text-text-primary group-hover:text-text-primary transition-colors">{label}</p>
                <p className="text-xs text-text-muted mt-0.5">{description}</p>
                {note && (
                    <p className="flex items-center gap-1 text-[11px] text-status-warning mt-1">
                        <Info className="w-3 h-3 shrink-0" /> {note}
                    </p>
                )}
            </div>
        </label>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SUPABASE_FN = SUPABASE_FUNCTIONS_URL;
const APP_URL     = window.location.origin;

const CRM_OAUTH_URLS: Record<string, string | null> = {
    hubspot:    import.meta.env.VITE_HUBSPOT_CLIENT_ID
        ? `https://app.hubspot.com/oauth/authorize?client_id=${import.meta.env.VITE_HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${APP_URL}/settings/integrations?provider=hubspot`)}&scope=crm.objects.contacts.write%20crm.objects.deals.write%20engagements.read_write`
        : null,
    salesforce: import.meta.env.VITE_SALESFORCE_CLIENT_ID
        ? `https://login.salesforce.com/services/oauth2/authorize?client_id=${import.meta.env.VITE_SALESFORCE_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${APP_URL}/settings/integrations?provider=salesforce`)}&response_type=code`
        : null,
};

export default function IntegrationsPage() {
    const { org, isRevIntel } = useTier();
    const { session } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Platform connection state
    const [platforms, setPlatforms] = useState<PlatformState>({
        teams: 'disconnected',
        zoom: 'disconnected',
        meet: 'disconnected',
    });

    // Recall.ai bot state
    const [recallApiKey, setRecallApiKey] = useState('');
    const [botName, setBotName] = useState('OAST Coach');
    const [autoJoin, setAutoJoin] = useState('tagged');
    const [recallActive, setRecallActive] = useState(false);

    // Video intelligence state
    const [bodyLanguage, setBodyLanguage] = useState(true);
    const [prospectEngagement, setProspectEngagement] = useState(false);
    const [slideAlignment, setSlideAlignment] = useState(true);
    const [frameSampling, setFrameSampling] = useState('3s');
    const [consentMessage, setConsentMessage] = useState(
        'This meeting is being recorded and analysed by OAST, an AI sales coaching platform. By remaining in the meeting, you consent to this analysis.'
    );

    // Asset retention state
    const [retentionDays, setRetentionDays] = useState('90');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Save toast + saving state
    const [showToast, setShowToast] = useState(false);
    const [saving, setSaving] = useState(false);

    // CRM state
    const [crmConnections, setCrmConnections] = useState<CrmConnection[]>([]);
    const [crmLoading, setCrmLoading] = useState(false);
    const [crmSyncing, setCrmSyncing] = useState<string | null>(null);
    const [crmFieldMappingOpen, setCrmFieldMappingOpen] = useState<string | null>(null);

    const crmAuthHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

    // Load persisted settings on mount
    useEffect(() => {
        if (!org?.id) return;
        (async () => {
            const { data } = await supabase
                .from('org_integrations')
                .select('platform, status, config')
                .eq('org_id', org.id);

            if (!data) return;
            for (const row of data) {
                const cfg = row.config as Record<string, unknown> ?? {};
                if (row.platform === 'teams')  setPlatforms(p => ({ ...p, teams: row.status as ConnectionStatus }));
                if (row.platform === 'zoom')   setPlatforms(p => ({ ...p, zoom:  row.status as ConnectionStatus }));
                if (row.platform === 'meet')   setPlatforms(p => ({ ...p, meet:  row.status as ConnectionStatus }));
                if (row.platform === 'recall_ai') {
                    setRecallActive(row.status === 'active');
                    if (cfg.api_key)     setRecallApiKey(cfg.api_key as string);
                    if (cfg.bot_name)    setBotName(cfg.bot_name as string);
                    if (cfg.auto_join)   setAutoJoin(cfg.auto_join as string);
                }
                if (row.platform === 'video_intelligence') {
                    if (cfg.body_language !== undefined)        setBodyLanguage(cfg.body_language as boolean);
                    if (cfg.prospect_engagement !== undefined)  setProspectEngagement(cfg.prospect_engagement as boolean);
                    if (cfg.slide_alignment !== undefined)      setSlideAlignment(cfg.slide_alignment as boolean);
                    if (cfg.frame_sampling)                     setFrameSampling(cfg.frame_sampling as string);
                    if (cfg.consent_message)                    setConsentMessage(cfg.consent_message as string);
                }
                if (row.platform === 'asset_retention') {
                    if (cfg.retention_days) setRetentionDays(String(cfg.retention_days));
                }
            }
        })();
    }, [org?.id]);

    // Load CRM connections from edge function
    const loadCrmConnections = useCallback(async () => {
        if (!crmAuthHeader) return;
        setCrmLoading(true);
        try {
            const res = await fetch(`${SUPABASE_FN}/crm-sync`, {
                method: 'POST',
                headers: { Authorization: crmAuthHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_status' }),
            });
            const json = await res.json();
            if (json.ok) setCrmConnections(json.data.connections ?? []);
        } finally {
            setCrmLoading(false);
        }
    }, [crmAuthHeader]);

    // On mount: load CRM connections + handle OAuth callback redirect
    useEffect(() => {
        if (!crmAuthHeader) return;
        loadCrmConnections();

        const provider = searchParams.get('provider');
        const code     = searchParams.get('code');
        if (provider && code) {
            // Exchange OAuth code for tokens
            fetch(`${SUPABASE_FN}/crm-sync`, {
                method:  'POST',
                headers: { Authorization: crmAuthHeader, 'Content-Type': 'application/json' },
                body:    JSON.stringify({ action: 'exchange_code', provider, code }),
            })
                .then(r => r.json())
                .then(json => {
                    if (json.ok) {
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 2500);
                        loadCrmConnections();
                    }
                })
                .catch(console.error)
                .finally(() => {
                    // Remove code from URL to prevent re-exchange on refresh
                    setSearchParams({}, { replace: true });
                });
        }
    }, [crmAuthHeader]);

    const disconnectCrm = async (provider: string) => {
        if (!crmAuthHeader) return;
        await fetch(`${SUPABASE_FN}/crm-sync`, {
            method:  'POST',
            headers: { Authorization: crmAuthHeader, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ action: 'disconnect', provider }),
        });
        await loadCrmConnections();
    };

    const manualSyncCrm = async (provider: string) => {
        if (!crmAuthHeader) return;
        setCrmSyncing(provider);
        try {
            await fetch(`${SUPABASE_FN}/crm-sync`, {
                method:  'POST',
                headers: { Authorization: crmAuthHeader, 'Content-Type': 'application/json' },
                body:    JSON.stringify({ action: 'manual_sync', limit: 20 }),
            });
            await loadCrmConnections();
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2500);
        } finally {
            setCrmSyncing(null);
        }
    };

    const saveCrmFieldMappings = async (provider: string, mappings: Record<string, unknown>) => {
        if (!crmAuthHeader) return;
        await fetch(`${SUPABASE_FN}/crm-sync`, {
            method:  'POST',
            headers: { Authorization: crmAuthHeader, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ action: 'update_field_mappings', provider, field_mappings: mappings }),
        });
        await loadCrmConnections();
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const upsertIntegration = useCallback(async (
        platform: string,
        status: string,
        config: Record<string, unknown>
    ) => {
        if (!org?.id) return;
        await supabase.from('org_integrations').upsert(
            { org_id: org.id, platform, status, config, updated_at: new Date().toISOString() },
            { onConflict: 'org_id,platform' }
        );
    }, [org?.id]);

    const handleSave = async (section: 'recall' | 'video' | 'retention') => {
        setSaving(true);
        if (section === 'recall') {
            await upsertIntegration('recall_ai', recallActive ? 'active' : 'inactive', {
                api_key: recallApiKey,
                bot_name: botName,
                auto_join: autoJoin,
            });
        } else if (section === 'video') {
            await upsertIntegration('video_intelligence', 'active', {
                body_language: bodyLanguage,
                prospect_engagement: prospectEngagement,
                slide_alignment: slideAlignment,
                frame_sampling: frameSampling,
                consent_message: consentMessage,
            });
        } else if (section === 'retention') {
            await upsertIntegration('asset_retention', 'active', {
                retention_days: Number(retentionDays),
            });
        }
        setSaving(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    const togglePlatform = async (platform: keyof PlatformState) => {
        if (!isRevIntel) return;
        const newStatus = platforms[platform] === 'connected' ? 'disconnected' : 'connected';
        setPlatforms(p => ({ ...p, [platform]: newStatus }));
        await upsertIntegration(platform, newStatus, {});
    };

    return (
        <div className="p-6 space-y-10 max-w-4xl mx-auto">
            <SaveToast visible={showToast} />

            {/* Header */}
            <div>
                <h1 className="text-2xl text-text-primary tracking-tight mb-1">INTEGRATIONS</h1>
                <p className="text-text-secondary text-sm">Configure your meeting capture sources and video intelligence settings.</p>
            </div>

            {/* ── Section 0: CRM Integrations ── */}
            <section>
                <SectionHeader
                    title="CRM Integrations"
                    subtitle="Push call scores, MEDDIC completion, and objections directly into HubSpot or Salesforce after every session."
                />
                <TierGate
                    preview={
                        <div className="card-os p-5 border border-border opacity-60 pointer-events-none">
                            <div className="flex items-center gap-3 mb-4">
                                <Building2 className="w-4 h-4 text-accent" />
                                <span className="text-sm text-text-primary">CRM Sync — Revenue Intelligence tier required</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {['HubSpot', 'Salesforce'].map(name => (
                                    <div key={name} className="card-os p-4 border border-border h-20" />
                                ))}
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* HubSpot + Salesforce cards */}
                        {(['hubspot', 'salesforce'] as const).map(provider => {
                            const conn = crmConnections.find(c => c.provider === provider);
                            const isActive = conn?.status === 'active';
                            const providerLabel = provider === 'hubspot' ? 'HubSpot' : 'Salesforce';
                            const mappingOpen = crmFieldMappingOpen === provider;

                            return (
                                <div key={provider} className="card-os border border-border">
                                    {/* Header row */}
                                    <div className="flex items-center justify-between p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-bg-raised border border-border flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-text-secondary" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-text-primary">{providerLabel}</p>
                                                {isActive && conn?.last_synced_at && (
                                                    <p className="text-[10px] text-text-muted mt-0.5">
                                                        Last synced: {new Date(conn.last_synced_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                                {isActive && !conn?.last_synced_at && (
                                                    <p className="text-[10px] text-text-muted mt-0.5">Connected — no syncs yet</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusChip status={isActive ? 'connected' : 'disconnected'} />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 px-5 pb-5">
                                        {!isActive ? (
                                            CRM_OAUTH_URLS[provider] ? (
                                            <a
                                                href={CRM_OAUTH_URLS[provider]!}
                                                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                                            >
                                                Connect {providerLabel}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                            ) : (
                                            <span className="text-xs text-text-muted border border-border px-4 py-2 opacity-50 cursor-not-allowed">
                                                Not Connected
                                            </span>
                                            )
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => manualSyncCrm(provider)}
                                                    disabled={crmSyncing === provider}
                                                    className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5 border border-border"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${crmSyncing === provider ? 'animate-spin' : ''}`} />
                                                    {crmSyncing === provider ? 'Syncing…' : 'Re-sync last 20'}
                                                </button>
                                                <button
                                                    onClick={() => setCrmFieldMappingOpen(prev => prev === provider ? null : provider)}
                                                    className="text-xs border border-border text-text-muted px-4 py-2 hover:border-border/60 transition-colors flex items-center gap-1.5"
                                                >
                                                    Field mapping
                                                    <ChevronRight className={`w-3 h-3 transition-transform ${mappingOpen ? 'rotate-90' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => disconnectCrm(provider)}
                                                    className="text-xs border border-status-danger/40 text-status-danger px-4 py-2 hover:bg-status-danger/5 transition-colors ml-auto"
                                                >
                                                    Disconnect
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Field mapping panel */}
                                    {isActive && mappingOpen && conn && (
                                        <div className="border-t border-border px-5 py-4 bg-bg-canvas space-y-3">
                                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                                                Field Mapping — OAST → {providerLabel}
                                            </p>
                                            {Object.entries(conn.field_mappings).map(([oastField, mapping]) => (
                                                <div key={oastField} className="grid grid-cols-2 gap-3 items-center">
                                                    <span className="text-xs text-text-secondary">{mapping.label}</span>
                                                    <input
                                                        type="text"
                                                        defaultValue={mapping.crm_field}
                                                        onBlur={e => {
                                                            const updated = {
                                                                ...conn.field_mappings,
                                                                [oastField]: { ...mapping, crm_field: e.target.value },
                                                            };
                                                            saveCrmFieldMappings(provider, updated);
                                                        }}
                                                        className="input-os text-xs py-1.5"
                                                        placeholder={`${providerLabel} field name`}
                                                    />
                                                </div>
                                            ))}
                                            <p className="text-[10px] text-text-muted opacity-60 pt-1">
                                                Changes auto-save on field blur. Use exact {providerLabel} API field names.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {crmLoading && (
                            <p className="text-xs text-text-muted animate-pulse">Loading CRM connections…</p>
                        )}
                    </div>
                </TierGate>
            </section>

            {/* ── Section 1: Meeting Platforms ── */}
            <section>
                <SectionHeader
                    title="Meeting Platforms"
                    subtitle="Connect your video conferencing accounts to auto-ingest meetings for analysis."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PlatformCard
                        name="Microsoft Teams"
                        description="Post-meeting transcripts via Graph API"
                        status={platforms.teams}
                        icon={Video}
                        isLocked={!isRevIntel}
                        connectLabel="Connect Microsoft"
                        onToggle={() => togglePlatform('teams')}
                        permissions={[
                            'CallRecords.Read.All',
                            'OnlineMeetings.Read.All',
                            'OnlineMeetingTranscripts.Read.All',
                        ]}
                    />
                    <PlatformCard
                        name="Zoom"
                        description="Meeting recordings and transcripts via Zoom OAuth"
                        status={platforms.zoom}
                        icon={Video}
                        isLocked={!isRevIntel}
                        connectLabel="Connect Zoom"
                        onToggle={() => togglePlatform('zoom')}
                        permissions={[
                            'cloud_recording:read',
                            'meeting:read',
                            'user:read',
                        ]}
                    />
                    <PlatformCard
                        name="Google Meet"
                        description="Meet recordings via Google Workspace API"
                        status={platforms.meet}
                        icon={Globe}
                        isLocked={!isRevIntel}
                        connectLabel="Connect Google"
                        onToggle={() => togglePlatform('meet')}
                        permissions={[
                            'https://www.googleapis.com/auth/calendar.readonly',
                            'https://www.googleapis.com/auth/drive.readonly',
                        ]}
                    />
                </div>
            </section>

            {/* ── Section 2: Meeting Bot (Recall.ai) ── */}
            <section>
                <SectionHeader
                    title="Meeting Bot"
                    subtitle="Recall.ai provides a universal bot that joins any meeting URL to record and analyse sessions."
                />
                <div className="card-os p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-accent" />
                            <span className="text-sm text-text-primary">Recall.ai Bot</span>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[11px] ${recallActive ? 'text-status-success' : 'text-text-muted'}`}>
                            <span className={`w-1.5 h-1.5 ${recallActive ? 'bg-status-success' : 'bg-text-muted'}`} />
                            {recallActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1.5">
                                <Key className="w-3 h-3" /> API Key
                            </label>
                            <input
                                type="password"
                                value={recallApiKey}
                                onChange={e => setRecallApiKey(e.target.value)}
                                placeholder="recall_live_••••••••••••••••"
                                className="input-os w-full text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2">
                                Bot Display Name
                            </label>
                            <input
                                type="text"
                                value={botName}
                                onChange={e => setBotName(e.target.value)}
                                className="input-os w-full text-sm"
                            />
                            <p className="text-[10px] text-text-muted mt-1">Visible to all meeting participants. Must disclose AI presence.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2">
                            Auto-join Rules
                        </label>
                        <select
                            value={autoJoin}
                            onChange={e => setAutoJoin(e.target.value)}
                            className="input-os text-sm w-full md:w-60"
                        >
                            <option value="all">All calendar meetings</option>
                            <option value="tagged">Tagged meetings only (default)</option>
                            <option value="manual">Manual dispatch only</option>
                        </select>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                        <button
                            onClick={() => setRecallActive(v => !v)}
                            className={`text-xs border px-4 py-2 transition-colors ${
                                recallActive
                                    ? 'border-status-danger/40 text-status-danger hover:bg-status-danger/5'
                                    : 'border-status-success/40 text-status-success hover:bg-status-success/5'
                            }`}
                        >
                            {recallActive ? 'Deactivate Bot' : 'Activate Bot'}
                        </button>
                        <button onClick={() => handleSave('recall')} disabled={saving} className="btn-primary text-xs px-5 py-2">
                            {saving ? 'Saving…' : 'Save Bot Settings'}
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Section 3: Video Intelligence ── */}
            <section>
                <SectionHeader
                    title="Video Intelligence"
                    subtitle="Control which AI analysis pipelines run on meeting recordings. Vision API usage is tracked per billing period."
                />
                <div className="card-os p-6 space-y-6">

                    <div className="space-y-5">
                        <ToggleRow
                            label="Enable body language analysis"
                            description="Scores eye contact, posture, gesture activity, and on-camera presence from rep video frames."
                            checked={bodyLanguage}
                            onChange={setBodyLanguage}
                        />
                        <ToggleRow
                            label="Enable prospect engagement scoring"
                            description="Analyses prospect camera feed for attention and engagement signals."
                            checked={prospectEngagement}
                            onChange={setProspectEngagement}
                            note="Prospect video analysis requires explicit consent disclosure to be enabled."
                        />
                        <ToggleRow
                            label="Enable slide alignment scoring"
                            description="Detects screen share slides and scores alignment between spoken words and slide content."
                            checked={slideAlignment}
                            onChange={setSlideAlignment}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> Frame Sampling Rate
                            </label>
                            <select
                                value={frameSampling}
                                onChange={e => setFrameSampling(e.target.value)}
                                className="input-os text-sm w-full"
                            >
                                <option value="2s">Every 2 seconds (high detail, higher cost)</option>
                                <option value="3s">Every 3 seconds — recommended</option>
                                <option value="5s">Every 5 seconds (balanced)</option>
                                <option value="10s">Every 10 seconds (cost-efficient)</option>
                            </select>
                            <p className="text-[10px] text-text-muted mt-1.5">Target cost: &lt;£0.15 per meeting at 3s rate.</p>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1.5">
                                <Eye className="w-3 h-3" /> Consent Disclosure Message
                            </label>
                            <textarea
                                value={consentMessage}
                                onChange={e => setConsentMessage(e.target.value)}
                                rows={4}
                                className="input-os w-full text-xs leading-relaxed resize-none"
                            />
                            <p className="text-[10px] text-text-muted mt-1.5">Shown to participants when the bot joins. Required for prospect analysis.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-border">
                        <button onClick={() => handleSave('video')} disabled={saving} className="btn-primary text-xs px-5 py-2">
                            {saving ? 'Saving…' : 'Save Intelligence Settings'}
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Section 4: Asset Retention ── */}
            <section>
                <SectionHeader
                    title="Asset Retention"
                    subtitle="Control how long meeting recordings and transcripts are stored. Deletion is irreversible."
                />
                <div className="card-os p-6 space-y-5">
                    <div className="flex items-center gap-6">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1.5">
                                <Monitor className="w-3 h-3" /> Retention Period
                            </label>
                            <select
                                value={retentionDays}
                                onChange={e => setRetentionDays(e.target.value)}
                                className="input-os text-sm w-48"
                            >
                                <option value="30">30 days</option>
                                <option value="60">60 days</option>
                                <option value="90">90 days (default)</option>
                                <option value="180">180 days</option>
                            </select>
                        </div>
                        <p className="text-xs text-text-muted mt-5 flex-1">
                            Recordings and screen shares are deleted after this period. Transcripts and scores are retained indefinitely unless manually deleted.
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => handleSave('retention')} disabled={saving} className="btn-primary text-xs px-5 py-2">
                            {saving ? 'Saving…' : 'Save Retention Settings'}
                        </button>
                    </div>

                    <div className="border-t border-border pt-5">
                        <p className="text-[10px] uppercase tracking-widest text-status-danger mb-3 flex items-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5" /> Danger Zone
                        </p>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="text-xs border border-status-danger/40 text-status-danger px-4 py-2 hover:bg-status-danger/5 transition-colors"
                            >
                                Delete all meeting assets
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <p className="text-xs text-status-danger">This will permanently delete all recordings, screen shares, and video frames. Are you sure?</p>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="text-xs border border-status-danger bg-status-danger/10 text-status-danger px-4 py-2 hover:bg-status-danger/20 transition-colors shrink-0"
                                >
                                    Yes, delete all
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="text-xs border border-border text-text-muted px-4 py-2 hover:bg-bg-raised transition-colors shrink-0"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
