/**
 * QuestionQualityPanel — L3 (per-call)
 *
 * Stacked bar showing closed/surface_open/implication distribution.
 * List of all questions with type pill + timestamp (click → transcript jump).
 * Coaching nudge if implication_rate < 20%.
 */

import { BookOpen } from 'lucide-react';
import { useCallQuestions, computeQuestionSummary } from '../../hooks/useCallQuestions';
import type { CallQuestion, QuestionType } from '../../hooks/useCallQuestions';

// ── Design tokens ─────────────────────────────────────────────────────────────

const CORAL  = '#FF6B6B';
const AMBER  = '#F59E0B';
const GREEN  = '#10B981';


const TYPE_COLOR: Record<QuestionType, string> = {
  closed:       CORAL,
  surface_open: AMBER,
  implication:  GREEN,
};

const TYPE_LABEL: Record<QuestionType, string> = {
  closed:       'Closed',
  surface_open: 'Surface Open',
  implication:  'Implication',
};

const IMPLICATION_TARGET = 0.20;   // 20% minimum

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypePill({ type }: { type: QuestionType }) {
  return (
    <span
      className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 shrink-0"
      style={{
        color:           TYPE_COLOR[type],
        backgroundColor: `${TYPE_COLOR[type]}20`,
        border:          `1px solid ${TYPE_COLOR[type]}40`,
      }}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

function StackedBar({ closed, surfaceOpen, implication, total }: {
  closed: number; surfaceOpen: number; implication: number; total: number;
}) {
  if (total === 0) return null;

  const closedPct      = (closed / total) * 100;
  const surfacePct     = (surfaceOpen / total) * 100;
  const implicationPct = (implication / total) * 100;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-3 w-full overflow-hidden gap-px">
        {closedPct > 0 && (
          <div
            className="h-full transition-all"
            style={{ width: `${closedPct}%`, backgroundColor: CORAL }}
            title={`Closed: ${closed}`}
          />
        )}
        {surfacePct > 0 && (
          <div
            className="h-full transition-all"
            style={{ width: `${surfacePct}%`, backgroundColor: AMBER }}
            title={`Surface Open: ${surfaceOpen}`}
          />
        )}
        {implicationPct > 0 && (
          <div
            className="h-full transition-all"
            style={{ width: `${implicationPct}%`, backgroundColor: GREEN }}
            title={`Implication: ${implication}`}
          />
        )}
      </div>

      {/* Legend counts */}
      <div className="flex gap-4 text-[10px]">
        {[
          { label: 'Closed', count: closed, color: CORAL },
          { label: 'Surface Open', count: surfaceOpen, color: AMBER },
          { label: 'Implication', count: implication, color: GREEN },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 shrink-0 inline-block" style={{ backgroundColor: color }} />
            <span className="text-[rgb(var(--text-muted))]">{label}</span>
            <span
              className="font-bold tabular-nums"
              style={{ fontFamily: 'DM Mono, monospace', color }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachingNudge() {
  return (
    <div
      className="flex items-start gap-3 border-l-2 pl-3 py-2"
      style={{ borderColor: CORAL }}
    >
      <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: CORAL }} />
      <p className="text-xs text-[rgb(var(--text-secondary))]">
        Less than 20% of your questions were implication-based.{' '}
        <span className="text-[rgb(var(--text-primary))] font-medium">
          See Discovery coaching module
        </span>{' '}
        to develop consequence-focused questioning.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-3 w-40 bg-[rgb(var(--border-default))] rounded" />
      <div className="h-3 w-full bg-[rgb(var(--border-default))] rounded" />
      <div className="h-24 bg-[rgb(var(--border-default))] rounded" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface QuestionQualityPanelProps {
  callId:            string;
  onTimestampSelect?: (seconds: number) => void;
}

export default function QuestionQualityPanel({
  callId,
  onTimestampSelect,
}: QuestionQualityPanelProps) {
  const { data: questions, isLoading } = useCallQuestions(callId);

  if (isLoading) return <Skeleton />;

  if (!questions || questions.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
          Question Quality
        </p>
        <p className="text-xs text-[rgb(var(--text-muted))]">
          No questions detected in this call.
        </p>
      </div>
    );
  }

  const summary = computeQuestionSummary(questions);
  const showNudge = summary.implication_rate !== null
    && summary.implication_rate < IMPLICATION_TARGET * 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold mb-0.5">
            Question Quality
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[rgb(var(--text-secondary))]">
              {summary.total} questions detected
            </span>
            {summary.quality_score !== null && (
              <span
                className="text-lg font-black tabular-nums"
                style={{
                  fontFamily: 'Oswald, sans-serif',
                  color: summary.quality_score >= 60 ? GREEN : summary.quality_score >= 40 ? AMBER : CORAL,
                }}
              >
                {Math.round(summary.quality_score)}
              </span>
            )}
            {summary.implication_rate !== null && (
              <span className="text-xs text-[rgb(var(--text-muted))]">
                <span
                  className="font-bold"
                  style={{
                    color: summary.implication_rate >= 20 ? GREEN : CORAL,
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  {Math.round(summary.implication_rate)}%
                </span>
                {' '}implication
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stacked bar */}
      <StackedBar
        closed={summary.closed}
        surfaceOpen={summary.surface_open}
        implication={summary.implication}
        total={summary.total}
      />

      {/* Coaching nudge */}
      {showNudge && <CoachingNudge />}

      {/* Question list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {questions.map((q: CallQuestion) => (
          <button
            key={q.id}
            onClick={() => onTimestampSelect?.(q.timestamp_seconds)}
            className="w-full text-left flex items-start gap-3 px-2 py-2 hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
          >
            <span
              className="text-[10px] tabular-nums shrink-0 mt-0.5 text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))]"
              style={{ fontFamily: 'DM Mono, monospace', minWidth: '3rem' }}
            >
              {fmtTimestamp(q.timestamp_seconds)}
            </span>
            <span className="flex-1 text-xs text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))] text-left leading-relaxed">
              {q.question_text}
            </span>
            <TypePill type={q.question_type} />
          </button>
        ))}
      </div>
    </div>
  );
}
