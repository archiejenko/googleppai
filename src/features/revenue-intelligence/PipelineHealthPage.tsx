import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import TierGate from '../../components/shared/TierGate';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface PipelineData {
  open_deals_count: number;
  total_pipeline_value_gbp?: number;
  avg_deal_value_gbp?: number;
  deals?: {
    id: string;
    company_name: string;
    deal_value_gbp: number;
    stage: string;
    probability: number;
    signal_score?: number;
  }[];
}

function PipelineHealthDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

  useEffect(() => {
    if (!authHeader) return;
    fetch(`${SUPABASE_FUNCTIONS_URL}/revenue-intelligence/pipeline`, {
      headers: { Authorization: authHeader },
    })
      .then(r => r.json())
      .then(json => {
        setData(json.data ?? null);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, [authHeader]);

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
            <BarChart3 className="w-6 h-6 text-[rgb(var(--accent-primary))]" />
            Pipeline Health
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Loading pipeline data..." />
        </div>
      ) : error ? (
        <div className="card-os p-6 border border-[rgb(var(--border-default))] text-center">
          <p className="text-sm text-[rgb(var(--text-muted))]">Failed to load pipeline data: {error}</p>
        </div>
      ) : !data ? (
        <div className="card-os p-12 border border-[rgb(var(--border-default))] text-center">
          <BarChart3 className="w-10 h-10 text-[rgb(var(--text-muted))] mx-auto mb-4" />
          <p className="text-sm text-[rgb(var(--text-muted))]">No pipeline data available yet.</p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-os p-5 border border-[rgb(var(--border-default))]">
              <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Open Deals</p>
              <p className="text-3xl font-black text-[rgb(var(--text-primary))]">{data.open_deals_count}</p>
            </div>
            {data.total_pipeline_value_gbp !== undefined && (
              <div className="card-os p-5 border border-[rgb(var(--border-default))]">
                <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Total Pipeline</p>
                <p className="text-3xl font-black text-[rgb(var(--accent-primary))]">
                  £{Math.round(data.total_pipeline_value_gbp / 1000)}k
                </p>
              </div>
            )}
            {data.avg_deal_value_gbp !== undefined && (
              <div className="card-os p-5 border border-[rgb(var(--border-default))]">
                <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1">Avg Deal Value</p>
                <p className="text-3xl font-black text-[rgb(var(--text-primary))]">
                  £{Math.round(data.avg_deal_value_gbp / 1000)}k
                </p>
              </div>
            )}
          </div>

          {/* Deals Table */}
          {data.deals && data.deals.length > 0 && (
            <div className="card-os border border-[rgb(var(--border-default))] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] text-xs uppercase tracking-widest">
                    <th className="px-5 py-3 text-left">Company</th>
                    <th className="px-5 py-3 text-right">Value</th>
                    <th className="px-5 py-3 text-left">Stage</th>
                    <th className="px-5 py-3 text-center">Probability</th>
                    {data.deals[0]?.signal_score !== undefined && (
                      <th className="px-5 py-3 text-center">Signal Score</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border-default))]">
                  {data.deals.map(deal => (
                    <tr key={deal.id} className="hover:bg-[rgb(var(--bg-raised))] transition-colors">
                      <td className="px-5 py-3 text-[rgb(var(--text-primary))] font-bold">{deal.company_name}</td>
                      <td className="px-5 py-3 text-right text-[rgb(var(--accent-primary))] font-mono font-bold">
                        £{Number(deal.deal_value_gbp).toLocaleString('en-GB')}
                      </td>
                      <td className="px-5 py-3 text-[rgb(var(--text-secondary))]">{deal.stage}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 font-bold ${
                          deal.probability >= 70
                            ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]'
                            : deal.probability >= 40
                            ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]'
                            : 'bg-[rgb(var(--bg-raised))] text-[rgb(var(--text-muted))]'
                        }`}>
                          {deal.probability}%
                        </span>
                      </td>
                      {deal.signal_score !== undefined && (
                        <td className="px-5 py-3 text-center text-[rgb(var(--text-secondary))] font-mono">
                          {deal.signal_score}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PipelineHealthPage() {
  return (
    <TierGate>
      <PipelineHealthDashboard />
    </TierGate>
  );
}
