import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface MissedOpportunity {
  id: string;
  company_name: string | null;
  deal_value_gbp: number | null;
  recovery_score: number | null;
  lost_reason_category: string | null;
  contact_name?: string | null;
  last_signal_date?: string | null;
}

function MissedOpportunitiesDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [opps, setOpps] = useState<MissedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

  useEffect(() => {
    if (!authHeader) return;
    fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/missed-opportunities`, {
      headers: { Authorization: authHeader },
    })
      .then(r => r.json())
      .then(json => {
        setOpps(json.data ?? []);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [authHeader]);

  const totalAtRisk = opps.reduce((s, o) => s + (o.deal_value_gbp || 0), 0);

  return (
    <div className="pb-12 space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/revenue-intel')}
          className="p-2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--text-muted))] mb-0.5">Revenue Intelligence</p>
          <h1 className="text-2xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-[rgb(var(--accent-primary))]" />
            Missed Opportunities
          </h1>
        </div>
      </div>

      {/* Summary banner */}
      <div className="card-os p-5 border border-[rgb(var(--border-default))]">
        <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Total ARR at Risk</p>
        <p className="text-3xl font-black text-[rgb(var(--accent-primary))]">
          £{Math.round(totalAtRisk / 1000)}k
        </p>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-1">{opps.length} open opportunities with recovery potential</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Loading opportunities..." />
        </div>
      ) : error ? (
        <div className="card-os p-6 border border-[rgb(var(--border-default))] text-center">
          <p className="text-sm text-[rgb(var(--text-muted))]">Failed to load opportunities: {error}</p>
        </div>
      ) : opps.length === 0 ? (
        <div className="card-os p-12 border border-[rgb(var(--border-default))] text-center">
          <AlertCircle className="w-10 h-10 text-[rgb(var(--text-muted))] mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--text-muted))]">No missed opportunities found. Great work!</p>
        </div>
      ) : (
        <div className="card-os border border-[rgb(var(--border-default))] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] text-xs uppercase tracking-widest">
                <th className="px-5 py-3 text-left">Company</th>
                <th className="px-5 py-3 text-right">Deal Value</th>
                <th className="px-5 py-3 text-center">Recovery Score</th>
                <th className="px-5 py-3 text-left">Lost Reason</th>
                <th className="px-5 py-3 text-left">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border-default))]">
              {opps.map(opp => (
                <tr key={opp.id} className="hover:bg-[rgb(var(--bg-raised))] transition-colors">
                  <td className="px-5 py-3 text-[rgb(var(--text-primary))] font-bold">{opp.company_name || '—'}</td>
                  <td className="px-5 py-3 text-right text-[rgb(var(--accent-primary))] font-mono font-bold">
                    {opp.deal_value_gbp ? `£${Number(opp.deal_value_gbp).toLocaleString('en-GB')}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 font-bold ${
                      (opp.recovery_score || 0) >= 70
                        ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]'
                        : (opp.recovery_score || 0) >= 40
                        ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]'
                        : 'bg-[rgb(var(--bg-raised))] text-[rgb(var(--text-muted))]'
                    }`}>
                      {Math.round(opp.recovery_score || 0)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[rgb(var(--text-muted))] text-xs">{opp.lost_reason_category || '—'}</td>
                  <td className="px-5 py-3 text-[rgb(var(--text-secondary))] text-xs">{opp.contact_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MissedOpportunitiesPage() {
  return (
    <TierGate>
      <MissedOpportunitiesDashboard />
    </TierGate>
  );
}
