import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { ArrowLeft, AlertTriangle, TrendingDown, RefreshCw, GitCompareArrows } from 'lucide-react';
import TierGate from '../components/shared/TierGate';
import {
  useTransferGapEfficacy,
  useTransferGapTeam,
  useTransferGapRepDetail,
  type TeamRepRow,
} from '../hooks/useTransferGap';
import { useQueryClient } from '@tanstack/react-query';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = '#ff6b6b';
const BLUE = '#60a5fa';

const DIMENSION_KEYS = [
  { label: 'Talk Ratio', gapKey: 'talk_ratio_gap' },
  { label: 'Discovery', gapKey: 'discovery_gap' },
  { label: 'Engagement', gapKey: 'engagement_gap' },
  { label: 'Objections', gapKey: 'objection_handling_gap' },
  { label: 'Overall', gapKey: 'transfer_gap_overall' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function gapColor(gap: number): string {
  if (gap >= 20) return 'text-status-danger';
  if (gap >= 10) return 'text-status-warning';
  return 'text-status-success';
}

function gapBg(gap: number): string {
  if (gap >= 20) return 'bg-status-danger/10 text-status-danger border-status-danger/30';
  if (gap >= 10) return 'bg-status-warning/10 text-status-warning border-status-warning/30';
  return 'bg-status-success/10 text-status-success border-status-success/30';
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-6">
      <div className="w-16 h-16 flex items-center justify-center bg-accent/10 border border-accent/30">
        <GitCompareArrows className="w-8 h-8 text-accent" />
      </div>
      <div>
        <h2 className="text-xl text-text-primary mb-2">No Transfer Gap data yet</h2>
        <p className="text-sm text-text-secondary max-w-sm mx-auto">
          Complete AI training sessions and live call sessions to unlock Transfer Gap insights.
          The correlation engine analyses the delta between how your reps perform in training versus real calls.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => navigate('/training')} className="btn-primary text-xs px-5">
          Start Training
        </button>
        <button onClick={() => navigate('/live-scores')} className="btn-ghost text-xs px-5 border border-border">
          View Live Scores
        </button>
      </div>
    </div>
  );
}

// ── Org Summary Cards ─────────────────────────────────────────────────────────

function OrgSummary() {
  const { data: efficacy, isLoading } = useTransferGapEfficacy();

  const repsWithDecay = efficacy?.reps_with_decay ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="card-os p-5 border border-border h-24 animate-pulse bg-bg-raised" />
        ))}
      </div>
    );
  }

  if (!efficacy || efficacy.total_reps_analysed === 0) return null;

  const avgGap = efficacy.avg_transfer_gap ?? 0;

  const stats = [
    {
      label: 'Avg Transfer Gap',
      value: `${avgGap.toFixed(1)} pts`,
      sub: 'training score minus live score',
      color: avgGap >= 15 ? 'text-status-danger' : avgGap >= 8 ? 'text-status-warning' : 'text-status-success',
    },
    {
      label: 'Reps With Decay',
      value: `${repsWithDecay} / ${efficacy.total_reps_analysed}`,
      sub: 'skill declining over 90 days',
      color: repsWithDecay > 0 ? 'text-status-warning' : 'text-status-success',
    },
    {
      label: 'Pressure Regression',
      value: `${efficacy.reps_with_pressure_regression}`,
      sub: 'score drops on calls >15 min',
      color: efficacy.reps_with_pressure_regression > 0 ? 'text-status-warning' : 'text-status-success',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map(s => (
        <div key={s.label} className="card-os p-5 border border-border space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">{s.label}</p>
          <p className={`text-3xl ${s.color}`}>{s.value}</p>
          <p className="text-xs text-text-muted">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Team Bar Chart ────────────────────────────────────────────────────────────

function TeamBarChart({ rows, onSelectRep }: { rows: TeamRepRow[]; onSelectRep: (id: string) => void }) {
  const chartData = [...rows]
    .sort((a, b) => b.transfer_gap_overall - a.transfer_gap_overall)
    .map(r => ({
      rep: r.rep_name.split(' ')[0], // first name only for X-axis
      repId: r.rep_id,
      gap: Math.round(r.transfer_gap_overall * 10) / 10,
      decay: r.knowledge_decay_detected,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="card-os border border-border p-5">
      <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Transfer Gap by Rep</p>
      <p className="text-xs text-text-secondary mb-4">
        Points above zero = training score higher than live score. Click a bar to drill in.
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} onClick={(d: any) => { if (d?.activePayload?.[0]?.payload?.repId) onSelectRep(d.activePayload[0].payload.repId); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59)" />
          <XAxis
            dataKey="rep"
            tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10, fontFamily: 'Oswald' }}
          />
          <YAxis
            tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10, fontFamily: 'Oswald' }}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: 'rgb(15 23 42)',
              border: '1px solid rgb(30 41 59)',
              borderRadius: 0,
              fontFamily: 'Oswald',
              fontSize: 11,
            }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: ACCENT }}
            formatter={(value: any) => [`${value} pts`, 'Transfer Gap']}
          />
          <Bar
            dataKey="gap"
            fill={ACCENT}
            fillOpacity={0.8}
            cursor="pointer"
            radius={0}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-text-muted mt-2">Click any bar to view rep detail</p>
    </div>
  );
}

// ── Team Table ────────────────────────────────────────────────────────────────

function TeamTable({
  rows,
  selectedRepId,
  onSelectRep,
}: {
  rows: TeamRepRow[];
  selectedRepId: string | null;
  onSelectRep: (id: string) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.transfer_gap_overall - a.transfer_gap_overall);

  return (
    <div className="card-os border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
            <th className="px-5 py-3 text-left">Rep</th>
            <th className="px-5 py-3 text-center">Transfer Gap</th>
            <th className="px-5 py-3 text-center">Decay</th>
            <th className="px-5 py-3 text-center">Pressure Regression</th>
            <th className="px-5 py-3 text-left">Last Snapshot</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map(row => {
            const isSelected = selectedRepId === row.rep_id;
            return (
              <tr
                key={row.rep_id}
                onClick={() => onSelectRep(row.rep_id)}
                className={`cursor-pointer transition-colors ${isSelected ? 'bg-accent/5 border-l-2 border-l-accent' : 'hover:bg-bg-raised'}`}
              >
                <td className="px-5 py-3 text-text-primary font-medium">{row.rep_name}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 border ${gapBg(row.transfer_gap_overall)}`}>
                    {row.transfer_gap_overall.toFixed(1)} pts
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  {row.knowledge_decay_detected ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-status-warning">
                      <AlertTriangle className="w-3 h-3" /> Detected
                    </span>
                  ) : (
                    <span className="text-xs text-status-success">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {row.pressure_regression ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-status-warning">
                      <TrendingDown className="w-3 h-3" /> Yes
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-text-muted">{row.snapshot_date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Rep Detail Panel ──────────────────────────────────────────────────────────

function RepDetailPanel({ repId, repName, onBack }: { repId: string; repName: string; onBack: () => void }) {
  const { data: detail, isLoading, error } = useTransferGapRepDetail(repId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to team
        </button>
        <div className="card-os border border-border p-8 animate-pulse bg-bg-raised h-64" />
      </div>
    );
  }

  if (error || !detail?.latest) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to team
        </button>
        <div className="card-os border border-border p-8 text-center">
          <p className="text-text-muted text-sm">
            No detail data available for {repName} yet. They need to complete training sessions and live calls.
          </p>
        </div>
      </div>
    );
  }

  const snap = detail.latest;

  // Build radar data: training = training_avg_overall (same baseline for all dims),
  // live is inferred: training_avg - dimension_gap (gap = training - live)
  const radarData = DIMENSION_KEYS.map(d => {
    const gap = d.gapKey === 'transfer_gap_overall'
      ? snap.transfer_gap_overall
      : (snap as any)[d.gapKey] ?? 0;
    return {
      dimension: d.label,
      Training: Math.round(snap.training_avg_overall),
      Live: Math.round(Math.max(0, snap.training_avg_overall - gap)),
      isDecaying: snap.decaying_dimensions?.includes(d.label) ?? false,
    };
  });

  // Build trend chart data (chronological order)
  const trendData = [...detail.trend].reverse().map(t => ({
    date: t.snapshot_date.slice(5), // MM-DD
    Training: Math.round(t.training_avg_overall),
    Live: Math.round(t.live_avg_overall),
    Gap: Math.round(t.transfer_gap_overall * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to team
        </button>
        <p className="text-[10px] uppercase tracking-widest text-text-muted">
          Snapshot: {snap.snapshot_date}
        </p>
      </div>

      {/* Rep Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl text-text-primary uppercase tracking-tight">{repName}</h2>
          <p className="text-xs text-text-muted mt-0.5">Transfer Gap Analysis</p>
        </div>
        <div className={`text-center px-4 py-2 border ${gapBg(snap.transfer_gap_overall)}`}>
          <p className="text-2xl">{snap.transfer_gap_overall.toFixed(1)}</p>
          <p className="text-[10px] uppercase tracking-widest">Overall Gap</p>
        </div>
      </div>

      {/* Decay / Pressure flags */}
      {(snap.knowledge_decay_detected || snap.pressure_regression) && (
        <div className="flex flex-wrap gap-3">
          {snap.knowledge_decay_detected && snap.decaying_dimensions?.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 border border-status-warning/40 bg-status-warning/10">
              <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />
              <div>
                <p className="text-xs text-status-warning font-medium">Skill Decay Detected</p>
                <p className="text-[11px] text-text-muted">
                  Declining in: {snap.decaying_dimensions.join(', ')}
                </p>
              </div>
            </div>
          )}
          {snap.pressure_regression && (
            <div className="flex items-center gap-2 px-3 py-2 border border-status-warning/40 bg-status-warning/10">
              <TrendingDown className="w-4 h-4 text-status-warning flex-shrink-0" />
              <div>
                <p className="text-xs text-status-warning font-medium">Pressure Regression</p>
                <p className="text-[11px] text-text-muted">Score drops on calls longer than 15 minutes</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar: Training vs Live per dimension */}
        <div className="card-os border border-border p-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Skill Radar — Training vs Live</p>
          <div className="flex gap-4 mb-3">
            <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="w-3 h-0.5 bg-[#60a5fa] inline-block" /> Training
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <span className="w-3 h-0.5 bg-accent inline-block" /> Live
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgb(30 41 59)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10, fontFamily: 'Oswald' }}
              />
              <Radar name="Training" dataKey="Training" stroke={BLUE} fill={BLUE} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Live" dataKey="Live" stroke={ACCENT} fill={ACCENT} fillOpacity={0.12} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>

          {/* Dimension decay badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {radarData.map(d => (
              d.isDecaying && (
                <span key={d.dimension} className="flex items-center gap-1 text-[10px] px-2 py-0.5 border border-status-warning/40 bg-status-warning/10 text-status-warning">
                  <AlertTriangle className="w-2.5 h-2.5" /> {d.dimension} decaying
                </span>
              )
            ))}
          </div>
        </div>

        {/* Dimension gap breakdown */}
        <div className="card-os border border-border p-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-4">Gap by Dimension</p>
          <div className="space-y-3">
            {DIMENSION_KEYS.map(d => {
              const gap = d.gapKey === 'transfer_gap_overall'
                ? snap.transfer_gap_overall
                : (snap as any)[d.gapKey] ?? 0;
              const isDecaying = snap.decaying_dimensions?.includes(d.label) ?? false;
              return (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-text-secondary flex-shrink-0">{d.label}</span>
                  <div className="flex-1 h-1.5 bg-bg-raised">
                    <div
                      className={`h-full transition-all ${gap >= 20 ? 'bg-status-danger' : gap >= 10 ? 'bg-status-warning' : 'bg-status-success'}`}
                      style={{ width: `${Math.min(100, (gap / 40) * 100)}%` }}
                    />
                  </div>
                  <span className={`w-12 text-right text-xs font-mono ${gapColor(gap)}`}>
                    {gap.toFixed(1)}
                  </span>
                  {isDecaying && (
                    <AlertTriangle className="w-3.5 h-3.5 text-status-warning flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-text-muted mt-4">
            Gap = training avg − live avg. Higher = more drop-off under real conditions.
          </p>
        </div>
      </div>

      {/* Trend line chart */}
      {trendData.length >= 2 && (
        <div className="card-os border border-border p-5">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-4">90-Day Trend — Training vs Live</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 9, fontFamily: 'Oswald' }}
                interval={Math.max(0, Math.floor(trendData.length / 8) - 1)}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 9, fontFamily: 'Oswald' }}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgb(15 23 42)',
                  border: '1px solid rgb(30 41 59)',
                  borderRadius: 0,
                  fontFamily: 'Oswald',
                  fontSize: 11,
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'Oswald', fontSize: 10 }}
              />
              <Line type="monotone" dataKey="Training" stroke={BLUE} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              <Line type="monotone" dataKey="Live" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function TransferGapDashboard() {
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const { data: teamRows = [], isLoading: teamLoading } = useTransferGapTeam();
  const { data: efficacy, isLoading: efficacyLoading } = useTransferGapEfficacy();
  const queryClient = useQueryClient();

  const isLoading = teamLoading || efficacyLoading;
  const hasData = (efficacy?.total_reps_analysed ?? 0) > 0;

  const selectedRep = teamRows.find(r => r.rep_id === selectedRepId);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['transfer-gap-efficacy'] });
    queryClient.invalidateQueries({ queryKey: ['transfer-gap-team'] });
    if (selectedRepId) {
      queryClient.invalidateQueries({ queryKey: ['transfer-gap-rep', selectedRepId] });
    }
  };

  return (
    <div className="pb-12 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">Revenue Intelligence</p>
          <h1 className="text-2xl text-text-primary uppercase tracking-tight">Transfer Gap</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Delta between training performance and live call performance, by rep and skill dimension.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn-ghost flex items-center gap-2 text-xs py-2 px-3"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="card-os border border-border h-24 animate-pulse bg-bg-raised" />
            ))}
          </div>
          <div className="card-os border border-border h-64 animate-pulse bg-bg-raised" />
        </div>
      ) : !hasData ? (
        <EmptyState />
      ) : selectedRepId && selectedRep ? (
        <RepDetailPanel
          repId={selectedRepId}
          repName={selectedRep.rep_name}
          onBack={() => setSelectedRepId(null)}
        />
      ) : (
        <div className="space-y-6">
          <OrgSummary />
          <TeamBarChart rows={teamRows} onSelectRep={setSelectedRepId} />
          <TeamTable
            rows={teamRows}
            selectedRepId={selectedRepId}
            onSelectRep={setSelectedRepId}
          />
        </div>
      )}
    </div>
  );
}

export default function TransferGapPage() {
  return (
    <TierGate
      preview={
        <div className="p-6 space-y-4 opacity-60 pointer-events-none">
          <h1 className="text-2xl text-text-primary">Transfer Gap</h1>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-os p-5 border border-border h-28 bg-bg-surface" />
            ))}
          </div>
        </div>
      }
    >
      <TransferGapDashboard />
    </TierGate>
  );
}
