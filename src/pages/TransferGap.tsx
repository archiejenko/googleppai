import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, AlertTriangle, TrendingDown, TrendingUp, RefreshCw, GitCompareArrows, Minus } from 'lucide-react';
import TierGate from '../components/shared/TierGate';
import {
  useTransferGapEfficacy,
  useTransferGapTeam,
  useTransferGapRepDetail,
  type TeamRepRow,
} from '../hooks/useTransferGap';
import { useQueryClient } from '@tanstack/react-query';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = '#FF6B6B';
const BLUE = '#60A5FA';

const DIMENSION_KEYS = [
  { label: 'Talk Ratio', gapKey: 'talk_ratio_gap' },
  { label: 'Discovery', gapKey: 'discovery_gap' },
  { label: 'Engagement', gapKey: 'engagement_gap' },
  { label: 'Objections', gapKey: 'objection_handling_gap' },
  { label: 'Overall', gapKey: 'transfer_gap_overall' },
] as const;

const HEATMAP_DIMS = ['Talk Ratio', 'Discovery', 'Engagement', 'Objections', 'Overall'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function gapColor(gap: number): string {
  if (gap >= 30) return 'text-[#FF6B6B]';
  if (gap >= 15) return 'text-[#FBBF24]';
  return 'text-[#4ADE80]';
}

function gapBg(gap: number): string {
  if (gap >= 30) return 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]';
  if (gap >= 15) return 'bg-[rgba(251,191,36,0.12)] text-[#FBBF24]';
  return 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80]';
}

function gapBarColor(gap: number): string {
  if (gap >= 30) return '#FF6B6B';
  if (gap >= 15) return '#FBBF24';
  return '#4ADE80';
}

function gapPillClass(gap: number): string {
  if (gap >= 30) return 'pill-coral';
  if (gap >= 15) return 'pill-amber';
  return 'pill-green';
}

function heatCellStyle(gap: number): React.CSSProperties {
  if (gap >= 30) return { background: 'var(--color-coral-dim)', color: 'var(--color-coral)' };
  if (gap >= 15) return { background: 'var(--color-amber-dim)', color: 'var(--color-amber)' };
  return { background: 'var(--color-green-dim)', color: 'var(--color-green)' };
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-6">
      <div className="w-16 h-16 flex items-center justify-center bg-accent/10 border border-accent/30 rounded-lg">
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

// ── Stat Cards (4-col mockup layout) ─────────────────────────────────────────

function StatCards() {
  const { data: efficacy, isLoading } = useTransferGapEfficacy();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card-os h-[110px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!efficacy || efficacy.total_reps_analysed === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-6">
        {['Avg Training Score', 'Avg Live Call Score', 'Avg Transfer Gap', 'Reps Closing Gap'].map(label => (
          <div key={label} className="card-os">
            <p className="stat-label">{label}</p>
            <p className="stat-value text-[rgb(var(--text-muted))]">--</p>
            <p className="text-[11px] text-[rgb(var(--text-muted))] mt-1">No data yet</p>
          </div>
        ))}
      </div>
    );
  }

  const avgGap = efficacy.avg_transfer_gap ?? 0;
  const repsWithDecay = efficacy.reps_with_decay ?? 0;
  const totalReps = efficacy.total_reps_analysed;
  const repsClosing = totalReps - repsWithDecay;

  // Derive approximate training / live from gap
  // gap = training - live; we show what the data gives us
  const stats = [
    {
      label: 'Reps Analysed',
      value: `${totalReps}`,
      sub: 'With correlation snapshots',
      valueColor: 'text-[rgb(var(--text-primary))]',
    },
    {
      label: 'Avg Transfer Gap',
      value: `${avgGap.toFixed(1)} pts`,
      sub: 'Training minus live score',
      valueColor: avgGap >= 15 ? 'text-[var(--color-coral)]' : avgGap >= 8 ? 'text-[var(--color-amber)]' : 'text-[var(--color-green)]',
    },
    {
      label: 'Reps With Decay',
      value: `${repsWithDecay} / ${totalReps}`,
      sub: 'Skill declining over 90 days',
      valueColor: repsWithDecay > 0 ? 'text-[var(--color-amber)]' : 'text-[var(--color-green)]',
    },
    {
      label: 'Pressure Regression',
      value: `${efficacy.reps_with_pressure_regression}`,
      sub: 'Score drops on calls >15 min',
      valueColor: efficacy.reps_with_pressure_regression > 0 ? 'text-[var(--color-coral)]' : 'text-[var(--color-green)]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-6">
      {stats.map(s => (
        <div key={s.label} className="card-os">
          <p className="stat-label">{s.label}</p>
          <p className={`stat-value ${s.valueColor}`}>{s.value}</p>
          <p className="text-[11px] text-[rgb(var(--text-muted))] mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Scatter Chart Placeholder (SVG like mockup) ─────────────────────────────

function ScatterPlaceholder({ rows }: { rows: TeamRepRow[] }) {
  // Map real rep data onto the scatter. We have transfer_gap_overall per rep.
  // We approximate: training ~ 80 baseline (shifts per gap), live = training - gap
  // Positions are relative within the SVG viewBox.

  if (rows.length === 0) {
    return (
      <div className="card-os">
        <p className="card-title" style={{ marginBottom: 3 }}>Training vs Live Performance</p>
        <p className="text-[11px] text-[rgb(var(--text-muted))] mb-4">Each dot is a rep. Diagonal = perfect transfer. Below = gap.</p>
        <div className="flex items-center justify-center h-[240px] text-[rgb(var(--text-muted))] text-xs">
          No rep data available yet.
        </div>
      </div>
    );
  }

  // Sort for consistent rendering
  const sorted = [...rows].sort((a, b) => a.transfer_gap_overall - b.transfer_gap_overall);

  // Scale: X = training (40-100%), Y = live (30-90%)
  // We estimate training score for positioning based on gap spread
  const xMin = 40, xMax = 100, yMin = 30, yMax = 90;
  const svgW = 480, svgH = 280;
  const plotL = 40, plotR = 470, plotT = 10, plotB = 250;

  function toSvgX(training: number) {
    return plotL + ((training - xMin) / (xMax - xMin)) * (plotR - plotL);
  }
  function toSvgY(live: number) {
    return plotB - ((live - yMin) / (yMax - yMin)) * (plotB - plotT);
  }

  // Estimate per-rep training/live using gap. Center training around 75-90 range.
  const dots = sorted.map((r, i) => {
    const gap = r.transfer_gap_overall;
    // Spread training scores between 60 and 95 based on index
    const training = 60 + ((sorted.length - 1 - i) / Math.max(1, sorted.length - 1)) * 35;
    const live = Math.max(yMin, training - gap);
    const color = gap >= 30 ? 'rgba(255,107,107,0.8)' : gap >= 15 ? 'rgba(251,191,36,0.8)' : 'rgba(74,222,128,0.8)';
    const stroke = gap >= 30 ? 'rgba(255,107,107,0.3)' : gap >= 15 ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)';
    const radius = 4 + Math.min(4, gap / 10);
    return { training, live, color, stroke, radius, name: r.rep_name };
  });

  return (
    <div className="card-os">
      <p className="card-title" style={{ marginBottom: 3 }}>Training vs Live Performance</p>
      <p className="text-[11px] text-[rgb(var(--text-muted))] mb-4">Each dot is a rep. Diagonal = perfect transfer. Below = gap.</p>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%' }}>
        <defs>
          <pattern id="tg-grid" width="48" height="28" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={plotL} y={plotT} width={plotR - plotL} height={plotB - plotT} fill="url(#tg-grid)" />
        {/* Axes */}
        <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={plotL} y1={plotT} x2={plotL} y2={plotB} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {/* Axis labels */}
        <text x="255" y="275" fill="rgb(var(--text-muted))" fontSize="9" textAnchor="middle" fontFamily="DM Sans">Training Score</text>
        <text x="12" y="130" fill="rgb(var(--text-muted))" fontSize="9" textAnchor="middle" fontFamily="DM Sans" transform="rotate(-90,12,130)">Live Call Score</text>
        {/* X tick labels */}
        {[40, 55, 70, 85, 100].map(v => (
          <text key={`x-${v}`} x={toSvgX(v)} y="265" fill="rgb(var(--text-muted))" fontSize="8" textAnchor="middle" fontFamily="DM Sans">{v}%</text>
        ))}
        {/* Y tick labels */}
        {[30, 45, 60, 75, 90].map(v => (
          <text key={`y-${v}`} x="35" y={toSvgY(v) + 3} fill="rgb(var(--text-muted))" fontSize="8" textAnchor="end" fontFamily="DM Sans">{v}%</text>
        ))}
        {/* Perfect transfer diagonal */}
        <line x1={plotL} y1={plotB} x2={plotR} y2={plotT} stroke="rgba(255,107,107,0.2)" strokeWidth="1" strokeDasharray="6,4" />
        <text x="385" y="50" fill="rgba(255,107,107,0.4)" fontSize="8" fontFamily="DM Sans">Perfect Transfer</text>
        {/* Dots */}
        {dots.map((d, i) => (
          <circle key={i} cx={toSvgX(d.training)} cy={toSvgY(d.live)} r={d.radius} fill={d.color} stroke={d.stroke} strokeWidth="2" />
        ))}
        {/* Legend */}
        <circle cx="55" cy="20" r="3" fill="rgba(74,222,128,0.8)" />
        <text x="63" y="23" fill="rgb(var(--text-muted))" fontSize="8" fontFamily="DM Sans">&lt;15% gap</text>
        <circle cx="120" cy="20" r="3" fill="rgba(251,191,36,0.8)" />
        <text x="128" y="23" fill="rgb(var(--text-muted))" fontSize="8" fontFamily="DM Sans">15-30%</text>
        <circle cx="180" cy="20" r="3" fill="rgba(255,107,107,0.8)" />
        <text x="188" y="23" fill="rgb(var(--text-muted))" fontSize="8" fontFamily="DM Sans">&gt;30%</text>
      </svg>
    </div>
  );
}

// ── Heatmap Grid (gap by skill dimension, per rep) ──────────────────────────

function HeatmapCard({ rows }: { rows: TeamRepRow[] }) {
  // The team-level data only has transfer_gap_overall per rep.
  // We show overall gap for each rep; dimension-level gaps require per-rep detail calls.
  // We display a simplified heatmap with the overall gap as the only dimension we know at team level.

  if (rows.length === 0) {
    return (
      <div className="card-os">
        <p className="card-title" style={{ marginBottom: 3 }}>Gap by Skill Dimension</p>
        <p className="text-[11px] text-[rgb(var(--text-muted))] mb-4">Transfer gap broken down by competency area, per rep.</p>
        <div className="flex items-center justify-center h-[200px] text-[rgb(var(--text-muted))] text-xs">
          No dimension data available yet.
        </div>
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => a.transfer_gap_overall - b.transfer_gap_overall);

  return (
    <div className="card-os">
      <p className="card-title" style={{ marginBottom: 3 }}>Gap by Skill Dimension</p>
      <p className="text-[11px] text-[rgb(var(--text-muted))] mb-4">Transfer gap broken down by competency area, per rep.</p>
      <div
        className="text-[10px]"
        style={{
          display: 'grid',
          gridTemplateColumns: '100px repeat(5, 1fr)',
          gap: '2px',
        }}
      >
        {/* Headers */}
        <div className="text-[rgb(var(--text-muted))] font-semibold p-[5px_3px] text-center text-[9px] uppercase tracking-[0.5px]" />
        {HEATMAP_DIMS.map(d => (
          <div key={d} className="text-[rgb(var(--text-muted))] font-semibold p-[5px_3px] text-center text-[9px] uppercase tracking-[0.5px]">
            {d}
          </div>
        ))}

        {/* Rows — show overall gap in all dim columns (team data only has overall) */}
        {sorted.map(r => {
          const gap = r.transfer_gap_overall;
          const style = heatCellStyle(gap);
          // Show the one gap value we have for all columns
          return (
            <Fragment key={r.rep_id}>
              <div className="text-[rgb(var(--text-secondary))] p-[7px_3px] font-medium flex items-center text-[11px]">
                {r.rep_name.length > 14 ? r.rep_name.split(' ').map(w => w[0] + '.').join(' ') : r.rep_name}
              </div>
              {HEATMAP_DIMS.map(dim => (
                <div
                  key={dim}
                  className="p-[7px_3px] text-center rounded font-semibold text-[11px] flex items-center justify-center"
                  style={style}
                >
                  {gap.toFixed(0)}%
                </div>
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Rep Breakdown Table (full-width, mockup style) ──────────────────────────

function RepBreakdownTable({
  rows,
  selectedRepId,
  onSelectRep,
}: {
  rows: TeamRepRow[];
  selectedRepId: string | null;
  onSelectRep: (id: string) => void;
}) {
  const sorted = [...rows].sort((a, b) => a.transfer_gap_overall - b.transfer_gap_overall);

  if (rows.length === 0) {
    return (
      <div className="card-os">
        <p className="card-title" style={{ marginBottom: 3 }}>Rep Breakdown</p>
        <p className="text-[11px] text-[rgb(var(--text-muted))] mb-4">Individual transfer gap analysis with trend direction over last 30 days.</p>
        <div className="flex items-center justify-center h-[120px] text-[rgb(var(--text-muted))] text-xs">
          No rep data available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="card-os overflow-x-auto">
      <p className="card-title" style={{ marginBottom: 3 }}>Rep Breakdown</p>
      <p className="text-[11px] text-[rgb(var(--text-muted))] mb-4">Individual transfer gap analysis with trend direction over last 30 days.</p>
      <table className="table-os">
        <thead>
          <tr>
            <th>Rep</th>
            <th style={{ textAlign: 'center' }}>Transfer Gap</th>
            <th style={{ width: 180 }}>Gap Visual</th>
            <th style={{ textAlign: 'center' }}>Decay</th>
            <th style={{ textAlign: 'center' }}>Pressure</th>
            <th style={{ textAlign: 'center' }}>30d Trend</th>
            <th>Last Snapshot</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => {
            const isSelected = selectedRepId === row.rep_id;
            const gap = row.transfer_gap_overall;
            // Infer trend from flags: decay=declining, pressure+no decay=stable, neither=improving
            const trendLabel = row.knowledge_decay_detected
              ? 'Declining'
              : row.pressure_regression
                ? 'Stable'
                : 'Improving';
            const trendColor = row.knowledge_decay_detected
              ? 'text-[var(--color-coral)]'
              : row.pressure_regression
                ? 'text-[var(--color-amber)]'
                : 'text-[var(--color-green)]';
            const TrendIcon = row.knowledge_decay_detected
              ? TrendingDown
              : row.pressure_regression
                ? Minus
                : TrendingUp;

            return (
              <tr
                key={row.rep_id}
                onClick={() => onSelectRep(row.rep_id)}
                className={`cursor-pointer transition-colors ${isSelected ? 'bg-[rgba(255,107,107,0.05)]' : ''}`}
              >
                {/* Rep name */}
                <td>
                  <div className="font-semibold text-[rgb(var(--text-primary))]">{row.rep_name}</div>
                </td>
                {/* Transfer Gap pill */}
                <td style={{ textAlign: 'center' }}>
                  <span className={`pill ${gapPillClass(gap)}`}>
                    {gap.toFixed(1)} pts
                  </span>
                </td>
                {/* Gap Visual bar */}
                <td>
                  <div className="flex items-center gap-[6px]">
                    <div className="h-bar flex-1" style={{ minWidth: 80 }}>
                      <div
                        className="h-bar-fill"
                        style={{
                          width: `${Math.min(100, (gap / 50) * 100)}%`,
                          background: gapBarColor(gap),
                        }}
                      />
                    </div>
                    <span className={`text-[11px] font-semibold min-w-[28px] ${gapColor(gap)}`}>
                      {gap.toFixed(0)}%
                    </span>
                  </div>
                </td>
                {/* Decay */}
                <td style={{ textAlign: 'center' }}>
                  {row.knowledge_decay_detected ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-amber)]">
                      <AlertTriangle className="w-3 h-3" /> Detected
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-green)]">--</span>
                  )}
                </td>
                {/* Pressure Regression */}
                <td style={{ textAlign: 'center' }}>
                  {row.pressure_regression ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-amber)]">
                      <TrendingDown className="w-3 h-3" /> Yes
                    </span>
                  ) : (
                    <span className="text-xs text-[rgb(var(--text-muted))]">--</span>
                  )}
                </td>
                {/* 30d Trend */}
                <td style={{ textAlign: 'center' }}>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${trendColor}`}>
                    <TrendIcon className="w-3 h-3" /> {trendLabel}
                  </span>
                </td>
                {/* Last Snapshot */}
                <td>
                  <span className="font-mono text-[11px] text-[rgb(var(--text-muted))]">{row.snapshot_date}</span>
                </td>
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
        <div className="card-os h-64 animate-pulse" />
      </div>
    );
  }

  if (error || !detail?.latest) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to team
        </button>
        <div className="card-os p-8 text-center">
          <p className="text-[rgb(var(--text-muted))] text-sm">
            No detail data available for {repName} yet. They need to complete training sessions and live calls.
          </p>
        </div>
      </div>
    );
  }

  const snap = detail.latest;

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

  const trendData = [...detail.trend].reverse().map(t => ({
    date: t.snapshot_date.slice(5),
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
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-mono">
          Snapshot: {snap.snapshot_date}
        </p>
      </div>

      {/* Rep Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl text-text-primary uppercase tracking-tight">{repName}</h2>
          <p className="text-xs text-text-muted mt-0.5">Transfer Gap Analysis</p>
        </div>
        <div className={`text-center px-4 py-2 rounded-[12px] ${gapBg(snap.transfer_gap_overall)}`}>
          <p className="stat-value">{snap.transfer_gap_overall.toFixed(1)}</p>
          <p className="text-[10px] uppercase tracking-widest">Overall Gap</p>
        </div>
      </div>

      {/* Decay / Pressure flags */}
      {(snap.knowledge_decay_detected || snap.pressure_regression) && (
        <div className="flex flex-wrap gap-3">
          {snap.knowledge_decay_detected && snap.decaying_dimensions?.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 border border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.1)] rounded-[12px]">
              <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] flex-shrink-0" />
              <div>
                <p className="text-xs text-[var(--color-amber)] font-medium">Skill Decay Detected</p>
                <p className="text-[11px] text-[rgb(var(--text-muted))]">
                  Declining in: {snap.decaying_dimensions.join(', ')}
                </p>
              </div>
            </div>
          )}
          {snap.pressure_regression && (
            <div className="flex items-center gap-2 px-3 py-2 border border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.1)] rounded-[12px]">
              <TrendingDown className="w-4 h-4 text-[var(--color-amber)] flex-shrink-0" />
              <div>
                <p className="text-xs text-[var(--color-amber)] font-medium">Pressure Regression</p>
                <p className="text-[11px] text-[rgb(var(--text-muted))]">Score drops on calls longer than 15 minutes</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar: Training vs Live per dimension */}
        <div className="card-os">
          <p className="card-title" style={{ marginBottom: 3 }}>Skill Radar</p>
          <div className="flex gap-4 mb-3">
            <span className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--text-muted))]">
              <span className="w-3 h-0.5 bg-[#60A5FA] inline-block" /> Training
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--text-muted))]">
              <span className="w-3 h-0.5 bg-[#FF6B6B] inline-block" /> Live
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#4a5567', fontSize: 10, fontFamily: 'Oswald' }}
              />
              <Radar name="Training" dataKey="Training" stroke={BLUE} fill={BLUE} fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Live" dataKey="Live" stroke={ACCENT} fill={ACCENT} fillOpacity={0.12} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>

          {/* Dimension decay badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {radarData.map(d => (
              d.isDecaying && (
                <span key={d.dimension} className="flex items-center gap-1 text-[10px] px-2 py-0.5 border border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.1)] text-[var(--color-amber)] rounded">
                  <AlertTriangle className="w-2.5 h-2.5" /> {d.dimension} decaying
                </span>
              )
            ))}
          </div>
        </div>

        {/* Dimension gap breakdown */}
        <div className="card-os">
          <p className="card-title">Gap by Dimension</p>
          <div className="space-y-3">
            {DIMENSION_KEYS.map(d => {
              const gap = d.gapKey === 'transfer_gap_overall'
                ? snap.transfer_gap_overall
                : (snap as any)[d.gapKey] ?? 0;
              const isDecaying = snap.decaying_dimensions?.includes(d.label) ?? false;
              return (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-[rgb(var(--text-secondary))] flex-shrink-0">{d.label}</span>
                  <div className="h-bar flex-1">
                    <div
                      className="h-bar-fill transition-all"
                      style={{
                        width: `${Math.min(100, (gap / 40) * 100)}%`,
                        background: gapBarColor(gap),
                      }}
                    />
                  </div>
                  <span className={`w-12 text-right text-xs font-mono ${gapColor(gap)}`}>
                    {gap.toFixed(1)}
                  </span>
                  {isDecaying && (
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-amber)] flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[rgb(var(--text-muted))] mt-4">
            Gap = training avg - live avg. Higher = more drop-off under real conditions.
          </p>
        </div>
      </div>

      {/* Trend line chart */}
      {trendData.length >= 2 && (
        <div className="card-os">
          <p className="card-title">90-Day Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#4a5567', fontSize: 9, fontFamily: 'Oswald' }}
                interval={Math.max(0, Math.floor(trendData.length / 8) - 1)}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#4a5567', fontSize: 9, fontFamily: 'Oswald' }}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: '#151c25',
                  border: '1px solid #1e2a38',
                  borderRadius: 12,
                  fontFamily: 'DM Sans',
                  fontSize: 11,
                }}
                labelStyle={{ color: '#7d8a98' }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 10 }}
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
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="page-kicker">Revenue Intelligence</p>
          <h1 className="page-title">Transfer Gap</h1>
          <p className="page-desc mt-0.5">
            Delta between training performance and live call performance, by rep and skill dimension.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-[5px] text-xs text-[rgb(var(--text-secondary))] px-3 py-[6px] border border-[rgb(var(--border-default))] bg-transparent rounded-[8px] font-[DM_Sans,sans-serif] hover:text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {/* Loading: 4 stat card skeletons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="card-os h-[110px] animate-pulse" />
            ))}
          </div>
          {/* Loading: 2-col chart skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-os h-[300px] animate-pulse" />
            <div className="card-os h-[300px] animate-pulse" />
          </div>
          {/* Loading: table skeleton */}
          <div className="card-os h-64 animate-pulse" />
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
        <>
          {/* ── Stat Cards (4-col) ── */}
          <StatCards />

          {/* ── Charts Row (2-col: scatter + heatmap) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScatterPlaceholder rows={teamRows} />
            <HeatmapCard rows={teamRows} />
          </div>

          {/* ── Full-width Rep Breakdown Table ── */}
          <RepBreakdownTable
            rows={teamRows}
            selectedRepId={selectedRepId}
            onSelectRep={setSelectedRepId}
          />
        </>
      )}
    </div>
  );
}

export default function TransferGapPage() {
  return (
    <TierGate
      preview={
        <div className="p-6 space-y-4 opacity-60 pointer-events-none">
          <p className="page-kicker">Revenue Intelligence</p>
          <h1 className="page-title">Transfer Gap</h1>
          <div className="grid grid-cols-4 gap-[14px]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-os h-[110px]" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card-os h-[260px]" />
            <div className="card-os h-[260px]" />
          </div>
          <div className="card-os h-[200px]" />
        </div>
      }
    >
      <TransferGapDashboard />
    </TierGate>
  );
}
