/**
 * TalkListenTrend — L2 (per-rep trend)
 *
 * Line chart: rep_talk_pct over last 20 calls.
 * Flat benchmark reference line at stage-aware threshold.
 * Dominant call stage across the window determines the benchmark.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CALL_STAGE_LABELS } from '../../config/benchmarks';
import type { TalkListenTrendData } from '../../hooks/useTalkListen';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B';
const GREEN  = '#10B981';
const INDIGO = '#6366F1';
const GRID   = 'rgba(255,255,255,0.04)';
const AXIS   = 'rgba(255,255,255,0.25)';

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: { call_date: string; rep_talk_pct: number | null }; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const val = payload[0].value;
  return (
    <div className="bg-[#161618] border border-[rgb(var(--border-default))] px-3 py-2 text-xs space-y-1">
      <p className="text-[rgb(var(--text-muted))]">
        {new Date(d.call_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </p>
      <p className="font-bold tabular-nums" style={{ fontFamily: 'DM Mono, monospace' }}>
        {val !== null ? `${Math.round(val)}%` : '—'} rep talk
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TalkListenTrendProps {
  data: TalkListenTrendData;
}

export default function TalkListenTrend({ data }: TalkListenTrendProps) {
  const { points, dominant_stage, benchmark_rep_max } = data;

  if (points.length === 0) {
    return (
      <div className="border border-[rgb(var(--border-default))] p-6 text-center">
        <p className="text-sm text-[rgb(var(--text-muted))]">No talk ratio data yet.</p>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
          Data populates after calls are scored.
        </p>
      </div>
    );
  }

  // Determine dot colour per point
  const chartData = points.map(p => ({
    ...p,
    fill: p.rep_talk_pct !== null && p.rep_talk_pct > benchmark_rep_max ? CORAL : GREEN,
  }));

  // Count calls above/within benchmark
  const aboveCount   = points.filter(p => p.rep_talk_pct !== null && p.rep_talk_pct > benchmark_rep_max).length;
  const withinCount  = points.length - aboveCount;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-0.5">
            Talk Ratio Trend
          </p>
          <p className="text-xs text-[rgb(var(--text-secondary))]">
            Last {points.length} calls ·{' '}
            <span style={{ color: GREEN }}>{withinCount} within</span>
            {' / '}
            <span style={{ color: CORAL }}>{aboveCount} above</span>
            {' '}benchmark
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">
            Benchmark stage
          </p>
          <p
            className="text-xs font-bold text-[rgb(var(--text-primary))]"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            {CALL_STAGE_LABELS[dominant_stage]} · ≤{benchmark_rep_max}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" />
            <XAxis
              dataKey="call_date"
              tickFormatter={v => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              tick={{ fill: AXIS, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: AXIS, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
            />

            {/* Benchmark reference line */}
            <ReferenceLine
              y={benchmark_rep_max}
              stroke={INDIGO}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: `${CALL_STAGE_LABELS[dominant_stage]} max ${benchmark_rep_max}%`,
                fill: INDIGO,
                fontSize: 9,
                position: 'right',
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="rep_talk_pct"
              stroke={INDIGO}
              strokeWidth={2}
              connectNulls={false}
              dot={({ cx, cy, payload }) => {
                if (payload.rep_talk_pct === null) return <g key={`dot-${cx}-${cy}`} />;
                const color = payload.rep_talk_pct > benchmark_rep_max ? CORAL : GREEN;
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke="#0f0f10"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 5, stroke: '#0f0f10', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
