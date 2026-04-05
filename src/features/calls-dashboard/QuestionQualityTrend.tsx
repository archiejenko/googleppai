/**
 * QuestionQualityTrend — L3 (per-rep trend)
 *
 * Implication question rate over last 20 calls.
 * 20% target reference line.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { QuestionTrendPoint } from '../../hooks/useCallQuestions';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B';
const GREEN  = '#10B981';
const INDIGO = '#6366F1';
const GRID   = 'rgba(255,255,255,0.04)';
const AXIS   = 'rgba(255,255,255,0.25)';

const IMPLICATION_TARGET = 20;   // 20%

// ── Tooltip ───────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: QuestionTrendPoint; value: number | null }[];
}) {
  if (!active || !payload?.length) return null;
  const d   = payload[0].payload;
  const val = payload[0].value;
  return (
    <div className="bg-[#161618] border border-[rgb(var(--border-default))] px-3 py-2 text-xs space-y-1">
      <p className="text-[rgb(var(--text-muted))]">
        {new Date(d.call_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </p>
      <p>
        <span className="text-[rgb(var(--text-muted))]">Implication rate: </span>
        <span className="font-bold" style={{ fontFamily: 'DM Mono, monospace' }}>
          {val !== null ? `${Math.round(val)}%` : '—'}
        </span>
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface QuestionQualityTrendProps {
  points: QuestionTrendPoint[];
}

export default function QuestionQualityTrend({ points }: QuestionQualityTrendProps) {
  if (points.length === 0) {
    return (
      <div className="border border-[rgb(var(--border-default))] p-6 text-center">
        <p className="text-sm text-[rgb(var(--text-muted))]">No question data yet.</p>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
          Data populates after calls are scored.
        </p>
      </div>
    );
  }

  const aboveTarget = points.filter(
    p => p.implication_rate !== null && p.implication_rate >= IMPLICATION_TARGET
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-0.5">
            Implication Question Rate
          </p>
          <p className="text-xs text-[rgb(var(--text-secondary))]">
            Last {points.length} calls ·{' '}
            <span style={{ color: GREEN }}>{aboveTarget} at target</span>
            {' / '}
            <span style={{ color: CORAL }}>{points.length - aboveTarget} below</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Target</p>
          <p
            className="text-xs font-bold"
            style={{ fontFamily: 'DM Mono, monospace', color: INDIGO }}
          >
            ≥20%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" />
            <XAxis
              dataKey="call_date"
              tickFormatter={v => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              tick={{ fill: AXIS, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fill: AXIS, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `${v}%`}
            />
            <ReferenceLine
              y={IMPLICATION_TARGET}
              stroke={INDIGO}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: '20% target', fill: INDIGO, fontSize: 9, position: 'right' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="implication_rate"
              stroke={INDIGO}
              strokeWidth={2}
              connectNulls={false}
              dot={({ cx, cy, payload }) => {
                if (payload.implication_rate === null) return <g key={`dot-${cx}-${cy}`} />;
                const color = payload.implication_rate >= IMPLICATION_TARGET ? GREEN : CORAL;
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx} cy={cy} r={4}
                    fill={color}
                    stroke="#0f0f10" strokeWidth={1.5}
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
