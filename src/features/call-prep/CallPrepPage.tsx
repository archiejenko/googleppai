import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, RefreshCw, ChevronDown, Check, Clock,
  TrendingUp, TrendingDown, AlertTriangle, Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TalkingPoint {
  point: string;
  rationale: string;
}
interface ObjectionPrep {
  objection: string;
  suggested_response: string;
}
interface MeddicItem {
  element: string;
  question: string;
  status: 'pending' | 'confirmed' | 'unknown';
}
interface CallPrepBrief {
  id: string;
  session_id: string;
  session_title: string;
  session_type: string;
  prospect_company: string | null;
  brief_summary: string;
  key_talking_points: TalkingPoint[];
  objection_prep: ObjectionPrep[];
  meddic_checklist: MeddicItem[];
  competitive_notes: string;
  success_metrics: string[];
  avg_score_30d: number | null;
  avg_talk_ratio_30d: number | null;
  generated_at: string;
}

const ACCENT = '#ff6b6b';

const SESSION_TYPE_LABELS: Record<string, string> = {
  discovery:       'Discovery',
  demo:            'Demo',
  proposal:        'Proposal',
  negotiation:     'Negotiation',
  'check-in':      'Check-In',
  'follow-up':     'Follow-Up',
  closing:         'Closing',
  'team-training': 'Team Training',
};

const SESSION_TYPE_ICONS: Record<string, string> = {
  discovery:       '🎯',
  demo:            '📊',
  proposal:        '📝',
  negotiation:     '🤝',
  'check-in':      '🔄',
  'follow-up':     '🔄',
  closing:         '💰',
  'team-training': '👥',
};

// ─── Helper: ScorePill ───────────────────────────────────────────────────────

function ScorePill({ label, value, target, lowerIsBetter }: {
  label: string;
  value: number | null;
  target: number;
  lowerIsBetter?: boolean;
}) {
  if (value === null) return (
    <div className="flex flex-col gap-0.5">
      <span className="stat-label">{label}</span>
      <span className="text-sm font-semibold text-[rgb(var(--text-muted))]" style={{ fontFamily: "'Oswald', sans-serif" }}>&mdash;</span>
    </div>
  );

  const good = lowerIsBetter ? value <= target : value >= target;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="stat-label">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`text-sm font-semibold ${good ? 'text-[var(--color-green)]' : 'text-[var(--color-coral)]'}`}
              style={{ fontFamily: "'Oswald', sans-serif" }}>
          {value}{label.toLowerCase().includes('ratio') ? '%' : ''}
        </span>
        {good
          ? <TrendingUp className="w-3 h-3 text-[var(--color-green)]" />
          : <TrendingDown className="w-3 h-3 text-[var(--color-coral)]" />}
      </div>
    </div>
  );
}

// ─── Helper: MeddicRow ───────────────────────────────────────────────────────

function MeddicRow({ item, onToggle }: {
  item: MeddicItem;
  onToggle: (element: string) => void;
}) {
  const confirmed = item.status === 'confirmed';
  return (
    <div
      className={`flex items-center gap-[10px] px-3 py-2 rounded-lg border cursor-pointer transition-all ${
        confirmed
          ? 'border-[rgb(var(--border-subtle))] bg-[rgb(var(--bg-surface-raised))]'
          : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))]'
      }`}
      onClick={() => onToggle(item.element)}
    >
      {/* Toggle switch */}
      <div className="relative flex-shrink-0" style={{ width: 30, height: 16 }}>
        <div
          className="w-full h-full rounded-[8px] transition-colors"
          style={{ background: confirmed ? 'var(--color-coral-dim)' : 'rgba(255,255,255,0.1)' }}
        />
        <div
          className="absolute top-[2px] w-3 h-3 rounded-full transition-all"
          style={{
            left: confirmed ? 16 : 2,
            background: confirmed ? 'var(--color-coral)' : 'rgb(var(--text-muted))',
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium" style={{
          color: confirmed ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))',
        }}>
          {item.element}: {item.question}
        </span>
      </div>
      <span className="text-[10px] font-semibold" style={{
        color: confirmed ? 'var(--color-green)' : 'rgb(var(--text-muted))',
      }}>
        {confirmed ? 'Confirmed' : 'Pending'}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CallPrepPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session: authSession } = useAuth();

  const sessionTitle    = decodeURIComponent(searchParams.get('title') ?? 'Upcoming Call');
  const sessionType     = searchParams.get('type') ?? 'discovery';
  const prospectCompany = searchParams.get('company') ?? null;

  const [brief,      setBrief]      = useState<CallPrepBrief | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [meddicState, setMeddicState] = useState<MeddicItem[]>([]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  const callEdge = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/call-prep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authSession?.access_token ?? ''}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error ?? 'Edge function error');
    return json.data;
  }, [supabaseUrl, authSession]);

  // Load existing brief on mount
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    callEdge({ action: 'get_brief', session_id: sessionId })
      .then(data => {
        if (data?.brief) {
          setBrief(data.brief);
          setMeddicState(data.brief.meddic_checklist ?? []);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId, callEdge]);

  const handleGenerate = async () => {
    if (!sessionId) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await callEdge({
        action:           'generate_brief',
        session_id:       sessionId,
        session_title:    sessionTitle,
        session_type:     sessionType,
        prospect_company: prospectCompany,
      });
      setBrief(data);
      setMeddicState(data.meddic_checklist ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate brief');
    } finally {
      setGenerating(false);
    }
  };

  const toggleMeddic = (element: string) => {
    setMeddicState(prev => prev.map(item =>
      item.element === element
        ? { ...item, status: item.status === 'confirmed' ? 'pending' : 'confirmed' }
        : item
    ));
  };

  const confirmedCount = meddicState.filter(m => m.status === 'confirmed').length;

  // Determine difficulty based on avg score
  const difficultyLevel = brief?.avg_score_30d
    ? brief.avg_score_30d >= 75 ? 7 : brief.avg_score_30d >= 60 ? 5 : 3
    : 5;
  const difficultyLabel = difficultyLevel >= 7 ? 'Tough' : difficultyLevel >= 4 ? 'Moderate' : 'Easy';

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[rgb(var(--bg-canvas))]">

      {/* Page header */}
      <div className="px-7 pt-6 pb-5 flex-shrink-0">
        <p className="page-kicker">Practice</p>
        <h1 className="page-title">Pre-Call Setup</h1>
        <p className="page-desc">
          Configure your AI training call. Select a scenario, review the brief, and launch.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-7 mb-4 flex items-center gap-3 px-4 py-3 border rounded-[var(--radius-md)]"
             style={{ borderColor: 'rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.06)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
          <span className="text-xs text-[rgb(var(--text-secondary))]">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-[rgb(var(--accent-primary))]" />
        </div>
      )}

      {/* Main two-column layout */}
      {!loading && (
        <div className="flex-1 px-7 pb-7">
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 360px' }}>

            {/* ═══ LEFT COLUMN: Setup Sections ═══ */}
            <div className="flex flex-col gap-5">

              {/* Step 1: Session Type / Scenario chips */}
              <div>
                <div className="flex items-center gap-[6px] mb-[10px]"
                     style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>
                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold"
                        style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: "'Oswald', sans-serif" }}>1</span>
                  Scenario Type
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SESSION_TYPE_LABELS).map(([key, label]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-[6px] px-[14px] py-2 rounded-lg text-xs font-medium cursor-default border transition-all ${
                        key === sessionType
                          ? 'border-[var(--color-coral)] text-[var(--color-coral)]'
                          : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-surface-raised))]'
                      }`}
                      style={{
                        background: key === sessionType ? 'var(--color-coral-dim)' : undefined,
                      }}
                    >
                      <span className="text-sm">{SESSION_TYPE_ICONS[key] ?? '⚙️'}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Target Context */}
              <div>
                <div className="flex items-center gap-[6px] mb-[10px]"
                     style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>
                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold"
                        style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: "'Oswald', sans-serif" }}>2</span>
                  Target Context
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col gap-1 px-[14px] py-[10px] rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))]">
                    <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>Session</span>
                    <div className="flex items-center justify-between text-[13px] font-medium text-[rgb(var(--text-primary))]">
                      {sessionTitle}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 px-[14px] py-[10px] rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))]">
                    <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>Type</span>
                    <div className="flex items-center justify-between text-[13px] font-medium text-[rgb(var(--text-primary))]">
                      {SESSION_TYPE_LABELS[sessionType] ?? sessionType}
                      <ChevronDown className="w-3 h-3 text-[rgb(var(--text-muted))]" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 px-[14px] py-[10px] rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))]">
                    <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>Company</span>
                    <div className="flex items-center justify-between text-[13px] font-medium"
                         style={{ color: prospectCompany ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))' }}>
                      {prospectCompany ?? 'Not specified'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 px-[14px] py-[10px] rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))]">
                    <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>Session ID</span>
                    <div className="flex items-center justify-between text-[13px] font-medium text-[rgb(var(--text-muted))]"
                         style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      {sessionId ? `${sessionId.slice(0, 8)}...` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Difficulty / Performance Context */}
              <div>
                <div className="flex items-center gap-[6px] mb-[10px]"
                     style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>
                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold"
                        style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: "'Oswald', sans-serif" }}>3</span>
                  Performance Context
                </div>
                <div className="card-os">
                  {brief ? (
                    <>
                      <div className="flex gap-6 mb-4">
                        <ScorePill label="Avg Score 30d" value={brief.avg_score_30d} target={75} />
                        <ScorePill label="Talk Ratio 30d" value={brief.avg_talk_ratio_30d} target={50} lowerIsBetter />
                        <div className="flex flex-col gap-0.5">
                          <span className="stat-label">MEDDIC Progress</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[rgb(var(--text-primary))]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                              {confirmedCount}/{meddicState.length}
                            </span>
                            <div className="w-20 h-1.5 rounded-full" style={{ background: 'rgb(var(--border-default))' }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${(confirmedCount / Math.max(meddicState.length, 1)) * 100}%`, background: ACCENT }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Difficulty track */}
                      <div className="px-1">
                        <div className="flex items-center gap-0 mt-1">
                          {Array.from({ length: 10 }).map((_, i) => {
                            const color = i < 3 ? 'var(--color-green)' : i < 6 ? 'var(--color-amber)' : 'var(--color-coral)';
                            const opacity = i <= difficultyLevel ? 0.8 - (Math.abs(i - 3) * 0.05) : 0.2;
                            return (
                              <div key={i} className="relative flex-1" style={{
                                height: 6,
                                background: color,
                                opacity: Math.max(opacity, 0.15),
                                borderRadius: i === 0 ? '3px 0 0 3px' : i === 9 ? '0 3px 3px 0' : 0,
                              }}>
                                {i === difficultyLevel - 1 && (
                                  <div className="absolute -top-1 -right-[3px] w-[14px] h-[14px] rounded-full"
                                       style={{ background: color, border: '2px solid rgb(var(--bg-canvas))' }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-[6px]">
                          <span className="text-[9px] text-[rgb(var(--text-muted))]">Easy</span>
                          <span className="text-[9px] text-[rgb(var(--text-muted))]">Moderate</span>
                          <span className="text-[9px] font-semibold" style={{ color: difficultyLevel >= 7 ? 'var(--color-coral)' : difficultyLevel >= 4 ? 'var(--color-amber)' : 'var(--color-green)' }}>
                            {difficultyLabel} ({difficultyLevel}/10)
                          </span>
                          <span className="text-[9px] text-[rgb(var(--text-muted))]">Hostile</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-6 text-xs text-[rgb(var(--text-muted))]">
                      Generate a brief to see performance context
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Key Talking Points */}
              <div>
                <div className="flex items-center gap-[6px] mb-[10px]"
                     style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>
                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold"
                        style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: "'Oswald', sans-serif" }}>4</span>
                  Key Talking Points
                </div>
                <div className="card-os">
                  {brief && brief.key_talking_points.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {brief.key_talking_points.map((tp, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded"
                                style={{ border: `1px solid ${ACCENT}`, color: ACCENT, fontFamily: "'Oswald', sans-serif" }}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[rgb(var(--text-primary))]">{tp.point}</p>
                            <p className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">{tp.rationale}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-6 text-xs text-[rgb(var(--text-muted))]">
                      {brief ? 'No talking points available' : 'Generate a brief to see talking points'}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 5: Objection Prep */}
              <div>
                <div className="flex items-center gap-[6px] mb-[10px]"
                     style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>
                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold"
                        style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: "'Oswald', sans-serif" }}>5</span>
                  Objection Prep
                </div>
                <div className="card-os">
                  {brief && brief.objection_prep.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {brief.objection_prep.map((op, i) => (
                        <div key={i} className="py-1 pl-3" style={{ borderLeft: `2px solid ${ACCENT}` }}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-coral)]">Objection</p>
                          <p className="text-xs text-[rgb(var(--text-primary))] mt-0.5 mb-2">&ldquo;{op.objection}&rdquo;</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--text-muted))]">Response Strategy</p>
                          <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{op.suggested_response}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-6 text-xs text-[rgb(var(--text-muted))]">
                      {brief ? 'No objections prepared' : 'Generate a brief to see objection prep'}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 6: MEDDIC Checklist (toggle-style) */}
              <div>
                <div className="flex items-center gap-[6px] mb-[10px]"
                     style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))' }}>
                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-[9px] font-bold"
                        style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: "'Oswald', sans-serif" }}>6</span>
                  MEDDIC Checklist
                </div>
                <div className="flex flex-col gap-[6px]">
                  {meddicState.length > 0 ? (
                    meddicState.map(item => (
                      <MeddicRow key={item.element} item={item} onToggle={toggleMeddic} />
                    ))
                  ) : (
                    <div className="card-os flex items-center justify-center py-6 text-xs text-[rgb(var(--text-muted))]">
                      {brief ? 'No MEDDIC items' : 'Generate a brief to see the MEDDIC checklist'}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ═══ RIGHT COLUMN: Sticky Preview Panel ═══ */}
            <div className="flex flex-col gap-[14px]" style={{ position: 'sticky', top: 68, alignSelf: 'start' }}>

              {/* Session Preview Card */}
              <div className="relative overflow-hidden rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))] p-5">
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px]"
                     style={{ background: 'linear-gradient(90deg, var(--color-coral), var(--color-purple))' }} />

                <p className="mb-[14px]"
                   style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgb(var(--text-muted))' }}>
                  Session Preview
                </p>

                {/* Persona info */}
                <div className="flex items-center gap-[14px] mb-4">
                  <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center"
                       style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700 }}>
                    {(sessionTitle[0] ?? 'S').toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 600, color: 'rgb(var(--text-primary))' }}>
                      {sessionTitle}
                    </p>
                    <p className="text-[11px] text-[rgb(var(--text-muted))] mt-[1px]">
                      {prospectCompany ? `${prospectCompany} · ` : ''}{SESSION_TYPE_LABELS[sessionType] ?? sessionType}
                    </p>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">Scenario</span>
                  <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))]">{SESSION_TYPE_LABELS[sessionType] ?? sessionType}</span>
                </div>
                {prospectCompany && (
                  <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-[11px] text-[rgb(var(--text-muted))]">Company</span>
                    <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))]">{prospectCompany}</span>
                  </div>
                )}
                {brief && (
                  <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-[11px] text-[rgb(var(--text-muted))]">Difficulty</span>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--color-coral)' }}>{difficultyLevel}/10 ({difficultyLabel})</span>
                  </div>
                )}
                {brief && (
                  <div className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-[11px] text-[rgb(var(--text-muted))]">MEDDIC</span>
                    <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))]">{confirmedCount}/{meddicState.length} confirmed</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">Est. Duration</span>
                  <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))]">5-8 mins</span>
                </div>

                {/* Scenario brief */}
                {brief?.brief_summary && (
                  <div className="mt-[14px] p-3 rounded-lg border border-[rgb(var(--border-default))]"
                       style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgb(var(--text-muted))', marginBottom: 6 }}>
                      Scenario Brief
                    </p>
                    <p className="text-[11px] leading-relaxed italic text-[rgb(var(--text-secondary))]">
                      &ldquo;{brief.brief_summary}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* AI Recommendation Card */}
              {brief && (
                <div className="relative overflow-hidden rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))] p-4">
                  <div className="absolute top-0 left-0 right-0 h-[3px]"
                       style={{ background: 'linear-gradient(90deg, var(--color-green), var(--color-blue))' }} />
                  <div className="flex items-center gap-2 mb-[10px]">
                    <div className="w-6 h-6 rounded-[6px] flex items-center justify-center"
                         style={{ background: 'var(--color-green-dim)' }}>
                      <Zap className="w-3 h-3 text-[var(--color-green)]" />
                    </div>
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-green)' }}>
                      Training Agent Recommendation
                    </span>
                  </div>
                  {brief.competitive_notes ? (
                    <>
                      <p className="text-[11px] leading-relaxed text-[rgb(var(--text-secondary))]">
                        {brief.competitive_notes}
                      </p>
                      {brief.avg_score_30d !== null && (
                        <span className="inline-block mt-2 text-[9px] font-semibold px-[6px] py-[2px] rounded-[3px]"
                              style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)' }}>
                          Avg Score: {brief.avg_score_30d} (30d)
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-[rgb(var(--text-muted))]">
                      Recommendation will appear after brief generation.
                    </p>
                  )}
                </div>
              )}

              {/* Launch / Generate Button */}
              <button
                onClick={brief ? () => navigate(`/training?scenario=${sessionType}&title=${encodeURIComponent(sessionTitle)}`) : handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-[14px] rounded-[10px] border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--color-coral)',
                  color: '#fff',
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                }}
              >
                {generating ? (
                  <><RefreshCw className="w-[18px] h-[18px] animate-spin" /> Generating...</>
                ) : brief ? (
                  <><Phone className="w-[18px] h-[18px]" /> Start Call</>
                ) : (
                  <><Zap className="w-[18px] h-[18px]" /> Generate Brief</>
                )}
              </button>

              {/* Secondary actions */}
              {brief && (
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="btn-ghost flex-1 flex items-center justify-center gap-2 text-xs"
                  >
                    <Clock className="w-3.5 h-3.5" /> Back
                  </button>
                </div>
              )}

              {/* Success Metrics as mini-card */}
              {brief && brief.success_metrics.length > 0 && (
                <div className="rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))] p-4">
                  <p className="mb-[10px]"
                     style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgb(var(--text-muted))' }}>
                    Success Looks Like
                  </p>
                  <div className="flex flex-col gap-2">
                    {brief.success_metrics.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-[rgb(var(--text-secondary))]">
                        <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--color-green)]" />
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Empty state when no brief and not generating */}
          {!brief && !generating && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center gap-4 mt-4"
            >
              <div className="w-16 h-16 border-2 rounded-xl flex items-center justify-center"
                   style={{ borderColor: ACCENT }}>
                <Zap className="w-8 h-8" style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[rgb(var(--text-primary))]"
                   style={{ fontFamily: "'Oswald', sans-serif" }}>
                  No brief yet
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                  Click Generate Brief to create an AI-powered prep for this call.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
