import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, RefreshCw, ChevronDown, ChevronUp, Check, Clock,
  TrendingUp, TrendingDown, MessageSquare, Target, Shield, Star,
  ArrowLeft, Building2, AlertTriangle,
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

function ScorePill({ label, value, target, lowerIsBetter }: {
  label: string;
  value: number | null;
  target: number;
  lowerIsBetter?: boolean;
}) {
  if (value === null) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))]">{label}</span>
      <span className="text-sm font-black text-[rgb(var(--text-muted))]">—</span>
    </div>
  );

  const good = lowerIsBetter ? value <= target : value >= target;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))]">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`text-sm font-black ${good ? 'text-green-400' : 'text-[rgb(var(--accent-primary))]'}`}>
          {value}{label.toLowerCase().includes('ratio') ? '%' : ''}
        </span>
        {good
          ? <TrendingUp className="w-3 h-3 text-green-400" />
          : <TrendingDown className="w-3 h-3" style={{ color: ACCENT }} />}
      </div>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({ title, icon, count, children }: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))]"
         style={{ boxShadow: '4px 4px 0 0 rgb(30 41 59)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgb(var(--bg-raised))] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">{title}</span>
          {count !== undefined && (
            <span className="px-1.5 py-0.5 text-[10px] font-black bg-[rgb(var(--bg-raised))] text-[rgb(var(--text-muted))]">
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[rgb(var(--text-muted))]" /> : <ChevronDown className="w-4 h-4 text-[rgb(var(--text-muted))]" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[rgb(var(--border-default))]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MEDDIC element with toggle ───────────────────────────────────────────────

function MeddicRow({ item, onToggle }: {
  item: MeddicItem;
  onToggle: (element: string) => void;
}) {
  const confirmed = item.status === 'confirmed';
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[rgb(var(--border-default)/0.4)] last:border-0">
      <button
        onClick={() => onToggle(item.element)}
        className={`flex-shrink-0 w-5 h-5 border flex items-center justify-center transition-colors mt-0.5
          ${confirmed
            ? 'bg-green-500/20 border-green-500'
            : 'border-[rgb(var(--border-default))] hover:border-[rgb(var(--accent-primary))]'}`}
      >
        {confirmed && <Check className="w-3 h-3 text-green-400" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--accent-primary))]">
          {item.element}
        </span>
        <p className={`text-xs mt-0.5 ${confirmed ? 'line-through text-[rgb(var(--text-muted))]' : 'text-[rgb(var(--text-secondary))]'}`}>
          {item.question}
        </p>
      </div>
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

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[rgb(var(--bg-canvas))]">

      {/* Header */}
      <div className="border-b border-[rgb(var(--border-default))] px-6 py-4 bg-[rgb(var(--bg-surface))] flex-shrink-0">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 mt-0.5 p-1.5 hover:bg-[rgb(var(--bg-raised))] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[rgb(var(--text-muted))]" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border"
                    style={{ borderColor: ACCENT, color: ACCENT }}>
                {SESSION_TYPE_LABELS[sessionType] ?? sessionType}
              </span>
              {brief && (
                <span className="text-[10px] text-[rgb(var(--text-muted))]">
                  Generated {new Date(brief.generated_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight text-[rgb(var(--text-primary))] truncate">
              {sessionTitle}
            </h1>
            {prospectCompany && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[rgb(var(--text-muted))]">
                <Building2 className="w-3.5 h-3.5" />
                {prospectCompany}
              </div>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Zap className="w-4 h-4" /> {brief ? 'Regenerate' : 'Generate Brief'}</>}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-[rgb(var(--accent-primary))]" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 border border-[rgb(var(--accent-primary)/0.4)] bg-[rgb(var(--accent-primary)/0.06)] mb-6">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
            <span className="text-xs text-[rgb(var(--text-secondary))]">{error}</span>
          </div>
        )}

        {!loading && !brief && !generating && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center gap-4"
          >
            <div className="w-16 h-16 border-2 flex items-center justify-center"
                 style={{ borderColor: ACCENT }}>
              <Zap className="w-8 h-8" style={{ color: ACCENT }} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-[rgb(var(--text-primary))]">No brief yet</p>
              <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
                Click Generate Brief to create an AI-powered prep for this call.
              </p>
            </div>
          </motion.div>
        )}

        {brief && !loading && (
          <div className="space-y-4 max-w-3xl">

            {/* Rep perf context strip */}
            <div className="flex gap-6 px-4 py-3 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))]">
              <ScorePill label="Avg Score 30d" value={brief.avg_score_30d} target={75} />
              <ScorePill label="Talk Ratio 30d" value={brief.avg_talk_ratio_30d} target={50} lowerIsBetter />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))]">MEDDIC Progress</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-[rgb(var(--text-primary))]">
                    {confirmedCount}/{meddicState.length}
                  </span>
                  <div className="w-20 h-1.5 bg-[rgb(var(--bg-raised))]">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${(confirmedCount / Math.max(meddicState.length, 1)) * 100}%`, background: ACCENT }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-4 py-4 border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))]"
                 style={{ boxShadow: '4px 4px 0 0 rgb(30 41 59)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-[rgb(var(--accent-primary))] mb-2">
                Brief Summary
              </p>
              <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
                {brief.brief_summary}
              </p>
            </div>

            {/* Key talking points */}
            <Section
              title="Key Talking Points"
              icon={<MessageSquare className="w-4 h-4" style={{ color: ACCENT }} />}
              count={brief.key_talking_points.length}
            >
              <div className="space-y-3 mt-2">
                {brief.key_talking_points.map((tp, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-black border"
                          style={{ borderColor: ACCENT, color: ACCENT }}>{i + 1}</span>
                    <div>
                      <p className="text-xs font-black text-[rgb(var(--text-primary))]">{tp.point}</p>
                      <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">{tp.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Objection prep */}
            <Section
              title="Objection Prep"
              icon={<Shield className="w-4 h-4" style={{ color: ACCENT }} />}
              count={brief.objection_prep.length}
            >
              <div className="space-y-3 mt-2">
                {brief.objection_prep.map((op, i) => (
                  <div key={i} className="border-l-2 pl-3 py-1" style={{ borderColor: ACCENT }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[rgb(var(--accent-primary))]">
                      Objection
                    </p>
                    <p className="text-xs text-[rgb(var(--text-primary))] mt-0.5 mb-2">&ldquo;{op.objection}&rdquo;</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[rgb(var(--text-muted))]">
                      Response Strategy
                    </p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{op.suggested_response}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* MEDDIC checklist */}
            <Section
              title="MEDDIC Checklist"
              icon={<Target className="w-4 h-4" style={{ color: ACCENT }} />}
              count={meddicState.length}
            >
              <div className="mt-2">
                {meddicState.map(item => (
                  <MeddicRow key={item.element} item={item} onToggle={toggleMeddic} />
                ))}
              </div>
            </Section>

            {/* Success metrics */}
            <Section
              title="Success Looks Like"
              icon={<Star className="w-4 h-4" style={{ color: ACCENT }} />}
              count={brief.success_metrics.length}
            >
              <ul className="mt-2 space-y-2">
                {brief.success_metrics.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[rgb(var(--text-secondary))]">
                    <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-green-400" />
                    {m}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Competitive notes */}
            {brief.competitive_notes && (
              <Section
                title="Competitive Context"
                icon={<TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />}
              >
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-2 leading-relaxed">
                  {brief.competitive_notes}
                </p>
              </Section>
            )}

            {/* CTA */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => navigate(`/training?scenario=${sessionType}&title=${encodeURIComponent(sessionTitle)}`)}
                className="btn-primary flex items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Start Training Drill
              </button>
              <button
                onClick={() => navigate(-1)}
                className="btn-ghost flex items-center gap-2"
              >
                <Clock className="w-4 h-4" /> Back to Schedule
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
