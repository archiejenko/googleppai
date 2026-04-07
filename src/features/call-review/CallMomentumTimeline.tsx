/**
 * CallMomentumTimeline — L1
 *
 * Line chart showing call quality score across 2-minute windows.
 * Flagged segments marked with coloured dots.
 * Threshold reference lines at 40 (coral) and 70 (green).
 */

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts';
import { useCallSegments } from '../../hooks/useCallSegments';
import type { CallSegment } from '../../hooks/useCallSegments';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B';
const GREEN  = '#10B981';
const AMBER  = '#F59E0B';
const GREY   = 'rgba(255,255,255,0.35)';
const LINE   = '#6366F1';
const GRID   = 'rgba(255,255,255,0.04)';
const AXIS   = 'rgba(255,255,255,0.25)';

// ── Flag colours ─────────────────────────────────────────────────────────────

const FLAG_COLOR: Record<string, string> = {
  objection:          CORAL,
  buying_signal:      GREEN,
  competitor_mention: AMBER,
  silence_gap:        GREY,
  filler_spike:       AMBER,
};

const FLAG_LABEL: Record<string, string> = {
  objection:          'Objection',
  buying_signal:      'Buying signal',
  competitor_mention: 'Competitor',
  silence_gap:        'Silence gap',
  filler_spike:       'Filler spike',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMinutes(secs: number): string {
  const m = Math.floor(secs / 60);
  return `${m}m`;
}

function primaryFlag(flags: string[]): string | null {
  // Priority order
  const order = ['objection', 'buying_signal', 'competitor_mention', 'silence_gap', 'filler_spike'];
  for (const f of order) {
    if (flags.includes(f)) return f;
  }
  return null;
}

// ── Custom dot ────────────────────────────────────────────────────────────────

interface DotPayload {
  flags:                 string[];
  segment_start_seconds: number;
  segment_score:         number | null;
}

function FlagDot(props: {
  cx?: number; cy?: number; payload?: DotPayload;
  onDotClick: (seg: DotPayload) => void;
}) {
  const { cx, cy, payload, onDotClick } = props;
  if (!payload || cx === undefined || cy === undefined) return null;
  if (payload.segment_score === null) return null;

  const flag = primaryFlag(payload.flags);
  if (!flag) return <Dot cx={cx} cy={cy} r={3} fill={LINE} stroke="none" />;

  const color = FLAG_COLOR[flag] ?? GREY;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      stroke="#0f0f10"
      strokeWidth={1.5}
      style={{ cursor: 'pointer' }}
      onClick={() => onDotClick(payload)}
      aria-label={FLAG_LABEL[flag] ?? flag}
    />
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { payload: DotPayload; value: number | null }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const flag = primaryFlag(d.flags);

  return (
    <div className="bg-[#161618] border border-[rgb(var(--border-default))] px-3 py-2 text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[rgb(var(--text-muted))]">
          {fmtMinutes(d.segment_start_seconds)}–{fmtMinutes(d.segment_start_seconds + 120)}
        </span>
        <span
          className="font-black tabular-nums"
          style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14 }}
        >
          {d.segment_score !== null ? Math.round(d.segment_score) : '—'}
        </span>
      </div>
      {flag && (
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2-full inline-block"
            style={{ backgroundColor: FLAG_COLOR[flag] }}
          />
          <span className="text-[rgb(var(--text-secondary))]">{FLAG_LABEL[flag]}</span>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-40 bg-[rgb(var(--border-default))]" />
      <div className="h-48 bg-[rgb(var(--border-default))]" />
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: CORAL, label: 'Objection' },
    { color: GREEN, label: 'Buying signal' },
    { color: AMBER, label: 'Competitor / Filler' },
    { color: GREY,  label: 'Silence gap' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5-full inline-block shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[10px] text-[rgb(var(--text-muted))]">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CallMomentumTimelineProps {
  callId:               string;
  onTimestampSelect?:   (seconds: number) => void;
}

export default function CallMomentumTimeline({
  callId,
  onTimestampSelect,
}: CallMomentumTimelineProps) {
  const { data: segments, isLoading, error } = useCallSegments(callId);
  const [activeSegment, setActiveSegment] = useState<DotPayload | null>(null);

  if (isLoading) return <Skeleton />;

  if (error) {
    return (
      <div className="border border-[rgb(var(--border-default))] p-4 text-xs text-[rgb(var(--text-muted))]">
        Could not load call timeline.
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="border border-[rgb(var(--border-default))] p-6 text-center space-y-1">
        <p className="text-sm text-[rgb(var(--text-muted))]">No segment data for this call.</p>
        <p className="text-xs text-[rgb(var(--text-muted))]">
          Segment scoring runs post-call — check back shortly.
        </p>
      </div>
    );
  }

  // Chart data — null scores produce gaps (connectNulls={false})
  const chartData = segments.map((s: CallSegment) => ({
    segment_start_seconds: s.segment_start_seconds,
    segment_score:         s.segment_score,
    flags:                 s.flags,
    transcript_excerpt:    s.transcript_excerpt,
  }));

  function handleDotClick(seg: DotPayload) {
    setActiveSegment(seg);
    onTimestampSelect?.(seg.segment_start_seconds);
  }

  // Scored segments count for header
  const scored   = segments.filter(s => s.segment_score !== null).length;
  const avgScore = scored
    ? Math.round(segments.reduce((acc, s) => acc + (s.segment_score ?? 0), 0) / scored)
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-0.5">
            Call Momentum
          </p>
          <p className="text-xs text-[rgb(var(--text-secondary))]">
            {segments.length} segments · {scored} scored
            {avgScore !== null && (
              <>
                {' '}·{' '}
                <span
                  className="font-black"
                  style={{
                    fontFamily: 'Oswald, sans-serif',
                    color: avgScore >= 70 ? GREEN : avgScore >= 40 ? AMBER : CORAL,
                  }}
                >
                  avg {avgScore}
                </span>
              </>
            )}
          </p>
        </div>
        <Legend />
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" />

            <XAxis
              dataKey="segment_start_seconds"
              tickFormatter={fmtMinutes}
              tick={{ fill: AXIS, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: AXIS, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />

            {/* Threshold reference lines */}
            <ReferenceLine
              y={70}
              stroke={GREEN}
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: 'Strong', fill: GREEN, fontSize: 9, position: 'right' }}
            />
            <ReferenceLine
              y={40}
              stroke={CORAL}
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: 'Coaching', fill: CORAL, fontSize: 9, position: 'right' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="segment_score"
              stroke={LINE}
              strokeWidth={2}
              connectNulls={false}
              dot={(dotProps) => (
                <FlagDot
                  key={`dot-${dotProps.payload?.segment_start_seconds}`}
                  cx={dotProps.cx}
                  cy={dotProps.cy}
                  payload={dotProps.payload as DotPayload}
                  onDotClick={handleDotClick}
                />
              )}
              activeDot={{ r: 5, fill: LINE, stroke: '#0f0f10', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Active segment info */}
      {activeSegment && (
        <div
          className="border-l-2 pl-3 py-1 text-xs space-y-0.5"
          style={{ borderColor: FLAG_COLOR[primaryFlag(activeSegment.flags) ?? ''] ?? LINE }}
        >
          <p className="text-[rgb(var(--text-muted))]">
            Minute {Math.floor(activeSegment.segment_start_seconds / 60)}
            {activeSegment.flags.length > 0 && (
              <>
                {' '}·{' '}
                <span style={{ color: FLAG_COLOR[primaryFlag(activeSegment.flags)!] }}>
                  {activeSegment.flags.map(f => FLAG_LABEL[f] ?? f).join(', ')}
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
