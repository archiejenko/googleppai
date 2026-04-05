/**
 * TalkListenRatioDonut — L2 (per-call)
 *
 * PieChart donut: rep vs prospect split.
 * Benchmark arc as a second PieChart layer showing target max for the stage.
 * Green fill if within benchmark, coral if outside.
 * Stage selector dropdown to override the inferred stage.
 */

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { useTalkListenRatio, useUpdateCallStage } from '../../hooks/useTalkListen';
import {
  ALL_CALL_STAGES,
  CALL_STAGE_LABELS,
  TALK_RATIO_BENCHMARKS,
  type CallStage,
} from '../../config/benchmarks';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B';
const GREEN  = '#10B981';
const INDIGO = '#6366F1';
const GREY_TRACK = 'rgba(255,255,255,0.08)';
const BENCH_STROKE = 'rgba(255,255,255,0.25)';

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161618] border border-[rgb(var(--border-default))] px-3 py-2 text-xs">
      <span className="text-[rgb(var(--text-muted))]">{payload[0].name}: </span>
      <span className="font-bold tabular-nums" style={{ fontFamily: 'DM Mono, monospace' }}>
        {Math.round(payload[0].value)}%
      </span>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-3 w-32 bg-[rgb(var(--border-default))] rounded" />
      <div className="h-40 w-40 mx-auto rounded-full bg-[rgb(var(--border-default))]" />
      <div className="h-3 w-24 mx-auto bg-[rgb(var(--border-default))] rounded" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TalkListenRatioDonutProps {
  callId: string;
}

export default function TalkListenRatioDonut({ callId }: TalkListenRatioDonutProps) {
  const { data, isLoading } = useTalkListenRatio(callId);
  const updateStage = useUpdateCallStage(callId);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (isLoading) return <Skeleton />;

  if (!data || data.rep_talk_pct === null) {
    return (
      <div className="space-y-2">
        <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
          Talk / Listen Ratio
        </p>
        <p className="text-xs text-[rgb(var(--text-muted))]">
          Talk ratio data not yet available for this call.
        </p>
      </div>
    );
  }

  const repPct      = data.rep_talk_pct;
  const prospectPct = data.prospect_talk_pct ?? (100 - repPct);
  const withinBench = data.within_benchmark ?? true;
  const fillColor   = withinBench ? GREEN : CORAL;
  const benchMax    = data.benchmark_rep_max;

  // Donut data — rep + prospect
  const donutData = [
    { name: 'Rep', value: repPct },
    { name: 'Prospect', value: prospectPct },
  ];

  // Benchmark arc — show target max as a grey overlay arc
  // Represented as [benchMax, remainder] — only the first slice matters visually
  const benchData = [
    { name: 'Target', value: benchMax },
    { name: '', value: 100 - benchMax },
  ];

  function handleStageSelect(stage: CallStage) {
    updateStage.mutate(stage);
    setDropdownOpen(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
        Talk / Listen Ratio
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut chart */}
        <div className="relative" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              {/* Benchmark arc — outer ring, grey stroke no fill */}
              <Pie
                data={benchData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={68}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              >
                <Cell fill={BENCH_STROKE} />
                <Cell fill="transparent" />
              </Pie>

              {/* Main donut */}
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={56}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={fillColor} />
                <Cell fill={GREY_TRACK} />
              </Pie>

              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Centre label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-2xl font-black tabular-nums leading-none"
              style={{ fontFamily: 'Oswald, sans-serif', color: fillColor }}
            >
              {Math.round(repPct)}%
            </span>
            <span className="text-[9px] text-[rgb(var(--text-muted))] mt-0.5 uppercase tracking-wide">
              rep
            </span>
          </div>
        </div>

        {/* Stats + benchmark info */}
        <div className="space-y-3 flex-1 min-w-0">
          {/* Ratio split */}
          <div className="flex gap-6">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Rep</p>
              <p
                className="text-xl font-black tabular-nums"
                style={{ fontFamily: 'Oswald, sans-serif', color: fillColor }}
              >
                {Math.round(repPct)}%
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))]">Prospect</p>
              <p
                className="text-xl font-black tabular-nums"
                style={{ fontFamily: 'Oswald, sans-serif', color: INDIGO }}
              >
                {Math.round(prospectPct)}%
              </p>
            </div>
          </div>

          {/* Benchmark verdict */}
          <div
            className="text-xs border-l-2 pl-3 py-0.5"
            style={{ borderColor: fillColor }}
          >
            {withinBench ? (
              <span className="text-[rgb(var(--text-secondary))]">
                Within benchmark for{' '}
                <span className="font-bold text-[rgb(var(--text-primary))]">
                  {CALL_STAGE_LABELS[data.effective_stage]}
                </span>
                {' '}(max {benchMax}%)
              </span>
            ) : (
              <span className="text-[rgb(var(--text-secondary))]">
                <span style={{ color: CORAL }}>Above benchmark</span>
                {' '}for{' '}
                <span className="font-bold text-[rgb(var(--text-primary))]">
                  {CALL_STAGE_LABELS[data.effective_stage]}
                </span>
                {' '}(max {benchMax}% — you were {Math.round(repPct)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stage selector */}
      <div className="relative inline-block">
        <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-1.5">
          Call Stage
        </p>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 border border-[rgb(var(--border-default))] text-xs text-[rgb(var(--text-primary))] hover:border-[rgba(255,255,255,0.3)] transition-colors"
          aria-label="Select call stage"
        >
          {CALL_STAGE_LABELS[data.effective_stage]}
          <ChevronDown className="w-3 h-3 text-[rgb(var(--text-muted))]" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 top-full mt-1 z-20 bg-[#161618] border border-[rgb(var(--border-default))] shadow-xl min-w-[8rem]">
            {ALL_CALL_STAGES.map(stage => {
              const bench = TALK_RATIO_BENCHMARKS[stage].rep_max;
              return (
                <button
                  key={stage}
                  onClick={() => handleStageSelect(stage)}
                  className={[
                    'w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-4',
                    data.effective_stage === stage
                      ? 'bg-[rgba(255,255,255,0.06)] text-[rgb(var(--text-primary))]'
                      : 'text-[rgb(var(--text-secondary))] hover:bg-[rgba(255,255,255,0.04)]',
                  ].join(' ')}
                >
                  <span>{CALL_STAGE_LABELS[stage]}</span>
                  <span
                    className="text-[rgb(var(--text-muted))]"
                    style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}
                  >
                    ≤{bench}%
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {updateStage.isPending && (
        <p className="text-[10px] text-[rgb(var(--text-muted))]">Saving…</p>
      )}
    </div>
  );
}
