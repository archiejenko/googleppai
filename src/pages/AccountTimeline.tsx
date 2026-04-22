import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { showSuccess, showError } from '../utils/toast';
import { ArrowLeft, ArrowUp, ArrowDown, Minus, RotateCcw, AlertTriangle, Clock } from 'lucide-react';

interface CallSummary {
  id: string;
  call_number: number;
  sentiment_delta: number;
  stage_transition: string | null;
  key_takeaways: string[];
  objections_raised: { objection: string; handled_well: boolean; rep_response_summary: string }[];
  commitments_made: { commitment: string; made_by: string; fulfilled: boolean | null }[];
  credibility_events: { event: string; impact: string; detail: string }[];
  call_quality_signals: Record<string, boolean>;
  created_at: string;
}

interface AccountState {
  id: string;
  current_stage: string;
  sentiment_score: number;
  relationship_notes: {
    unresolved_objections?: string[];
    commitments_made_by_rep?: string[];
    commitments_fulfilled?: string[];
    key_moments?: string[];
    credibility_score?: number;
    rapport_level?: number;
  };
  call_count: number;
  last_interaction_at: string | null;
  company: { name: string } | null;
  persona: { name: string; title: string } | null;
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  cold:        { bg: '#333', text: '#999' },
  discovery:   { bg: '#1a3a5c', text: '#5b9bd5' },
  evaluation:  { bg: '#3d1f1f', text: '#FF6B6B' },
  negotiation: { bg: '#3d3018', text: '#f0ad4e' },
  closed_won:  { bg: '#1a3d1a', text: '#5cb85c' },
  closed_lost: { bg: '#3d1a1a', text: '#d9534f' },
  ghosted:     { bg: '#222', text: '#666' },
};

function StageBadge({ stage }: { stage: string }) {
  const colors = STAGE_COLORS[stage] || STAGE_COLORS.cold;
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        padding: '4px 12px',
        borderRadius: '0px',
        fontFamily: "'Oswald', sans-serif",
        textTransform: 'uppercase',
        fontSize: '13px',
        letterSpacing: '0.5px',
        fontWeight: 500,
      }}
    >
      {stage.replace('_', ' ')}
    </span>
  );
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  let color = '#d9534f';
  if (pct > 60) color = '#5cb85c';
  else if (pct > 35) color = '#f0ad4e';

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#999' }}>{label}</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#ccc' }}>{Math.round(value)}</span>
      </div>
      <div style={{ background: '#222', height: '8px', width: '100%' }}>
        <div style={{ background: color, height: '100%', width: `${pct}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function RapportPips({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#999', marginRight: '8px' }}>Rapport</span>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: '16px',
            height: '16px',
            background: i <= level ? '#FF6B6B' : '#333',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function DeltaArrow({ delta }: { delta: number }) {
  if (delta > 0) return <span style={{ color: '#5cb85c', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><ArrowUp size={14} />+{delta}</span>;
  if (delta < 0) return <span style={{ color: '#d9534f', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><ArrowDown size={14} />{delta}</span>;
  return <span style={{ color: '#666', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><Minus size={14} />0</span>;
}

export default function AccountTimeline() {
  const { accountStateId } = useParams<{ accountStateId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<AccountState | null>(null);
  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (accountStateId) fetchData();
  }, [accountStateId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: accountState, error: asErr } = await supabase
      .from('account_states')
      .select('*, company:simulated_companies(name), persona:simulated_personas(name, title)')
      .eq('id', accountStateId!)
      .single();

    if (asErr || !accountState) {
      showError('Account not found');
      setLoading(false);
      return;
    }
    setState(accountState as AccountState);

    const { data: summaries } = await supabase
      .from('call_summaries')
      .select('*')
      .eq('account_state_id', accountStateId!)
      .is('archived_at', null)
      .order('call_number', { ascending: false });

    setCalls((summaries as CallSummary[]) || []);
    setLoading(false);
  };

  const handleReset = async () => {
    setResetting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setResetting(false); return; }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-api/accounts/${accountStateId}/reset`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (res.ok) {
      showSuccess('Account reset', 'All call history has been archived. Ready for a fresh start.');
      setShowResetConfirm(false);
      fetchData();
    } else {
      const body = await res.json().catch(() => ({}));
      showError('Reset failed', body.error || 'Unknown error');
    }
    setResetting(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: '#666', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ padding: '32px', color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
        Account not found.
      </div>
    );
  }

  const notes = state.relationship_notes || {};
  const unresolvedObjections = notes.unresolved_objections || [];
  const commitmentsByRep = notes.commitments_made_by_rep || [];
  const commitmentsFulfilled = notes.commitments_fulfilled || [];
  const credibility = notes.credibility_score ?? 50;
  const rapport = notes.rapport_level ?? 3;
  const unfulfilled = commitmentsByRep.filter(c => !commitmentsFulfilled.includes(c));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '24px',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14px',
          padding: 0,
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: '28px',
          fontWeight: 600,
          color: '#fff',
          margin: '0 0 4px 0',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {state.company?.name || 'Unknown Company'}
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '16px',
          color: '#999',
          margin: '0 0 16px 0',
        }}>
          {state.persona?.name || 'Unknown'} — {state.persona?.title || ''}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <StageBadge stage={state.current_stage} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#666' }}>
            {state.call_count} call{state.call_count !== 1 ? 's' : ''}
          </span>
          {state.last_interaction_at && (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Last: {new Date(state.last_interaction_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Scores */}
      <div style={{
        background: '#161618',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <ScoreBar label="Sentiment" value={state.sentiment_score} />
        <ScoreBar label="Credibility" value={credibility} />
        <RapportPips level={rapport} />
      </div>

      {/* Unresolved objections */}
      {unresolvedObjections.length > 0 && (
        <div style={{
          background: '#161618',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '24px',
          borderLeft: '3px solid #f0ad4e',
        }}>
          <h3 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '15px',
            color: '#f0ad4e',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertTriangle size={16} /> Unresolved Objections
          </h3>
          {unresolvedObjections.map((obj, i) => (
            <div key={i} style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              color: '#ccc',
              padding: '6px 0',
              borderBottom: i < unresolvedObjections.length - 1 ? '1px solid #222' : 'none',
            }}>
              {obj}
            </div>
          ))}
        </div>
      )}

      {/* Unfulfilled commitments */}
      {unfulfilled.length > 0 && (
        <div style={{
          background: '#161618',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '24px',
          borderLeft: '3px solid #FF6B6B',
        }}>
          <h3 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: '15px',
            color: '#FF6B6B',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 12px 0',
          }}>
            Unfulfilled Commitments
          </h3>
          {unfulfilled.map((c, i) => (
            <div key={i} style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              color: '#ccc',
              padding: '6px 0',
              borderBottom: i < unfulfilled.length - 1 ? '1px solid #222' : 'none',
            }}>
              {c}
            </div>
          ))}
        </div>
      )}

      {/* Call timeline */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: '18px',
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '16px',
        }}>
          Call History
        </h2>

        {calls.length === 0 ? (
          <div style={{
            background: '#161618',
            borderRadius: '14px',
            padding: '32px',
            textAlign: 'center',
            fontFamily: "'DM Sans', sans-serif",
            color: '#666',
          }}>
            No calls yet. Start a training session to build this relationship.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {calls.map(call => (
              <div key={call.id} style={{
                background: '#161618',
                borderRadius: '14px',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontSize: '15px',
                      color: '#fff',
                    }}>
                      Call #{call.call_number}
                    </span>
                    <DeltaArrow delta={call.sentiment_delta} />
                    {call.stage_transition && (
                      <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '12px',
                        color: '#5b9bd5',
                        background: '#1a3a5c',
                        padding: '2px 8px',
                      }}>
                        {call.stage_transition}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: '#666',
                  }}>
                    {new Date(call.created_at).toLocaleDateString()}
                  </span>
                </div>

                {call.key_takeaways && call.key_takeaways.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {call.key_takeaways.map((t, i) => (
                      <div key={i} style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '13px',
                        color: '#aaa',
                        padding: '2px 0',
                      }}>
                        • {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset button */}
      <div style={{ borderTop: '1px solid #222', paddingTop: '24px' }}>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            style={{
              background: 'none',
              border: '1px solid #333',
              color: '#666',
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RotateCcw size={14} /> Reset this account
          </button>
        ) : (
          <div style={{
            background: '#1a1012',
            border: '1px solid #FF6B6B',
            borderRadius: '14px',
            padding: '20px',
          }}>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              color: '#ccc',
              margin: '0 0 16px 0',
            }}>
              This will reset the account to cold stage, clear all relationship data, and archive call history. You can re-run the scenario from scratch.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleReset}
                disabled={resetting}
                style={{
                  background: '#FF6B6B',
                  border: 'none',
                  color: '#0f0f10',
                  padding: '10px 20px',
                  cursor: resetting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 500,
                  opacity: resetting ? 0.5 : 1,
                }}
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  background: 'none',
                  border: '1px solid #333',
                  color: '#999',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
