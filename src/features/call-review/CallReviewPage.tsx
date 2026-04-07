/**
 * CallReviewPage — /calls/:id
 *
 * Individual call review shell. Components slot in below in order:
 *   L1 CallMomentumTimeline (hero)
 *   L2 TalkListenRatioDonut
 *   L3 QuestionQualityPanel
 *   L4 FillerWordCard
 *   L5 ObjectionAnalysisPanel (TierGate)
 *   L6 BuyingSignalPanel (TierGate)
 *   L8 PacingAnalysisChart (TierGate)
 *
 * RLS enforces data access — reps see own calls, managers see team calls.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import { useCallScore } from '../../hooks/useCallSegments';
import CallMomentumTimeline from './CallMomentumTimeline';
import TalkListenRatioDonut from './TalkListenRatioDonut';
import QuestionQualityPanel from './QuestionQualityPanel';
import FillerWordCard from './FillerWordCard';
import ObjectionAnalysisPanel from './ObjectionAnalysisPanel';
import BuyingSignalPanel from './BuyingSignalPanel';
import PacingAnalysisChart from './PacingAnalysisChart';
import TranscriptViewer from './TranscriptViewer';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[rgb(var(--text-muted))]">—</span>;
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#FF6B6B';
  return (
    <span
      className="text-3xl font-black tabular-nums"
      style={{ fontFamily: 'Oswald, sans-serif', color }}
    >
      {Math.round(score)}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CallReviewPage() {
  const { id: callId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTimestamp, setActiveTimestamp] = useState<number | null>(null);

  const { data: callScore, isLoading } = useCallScore(callId ?? '');

  if (!callId) {
    return (
      <div className="p-8 text-[rgb(var(--text-muted))] text-sm">Invalid call ID.</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* Call header */}
      <div className="border border-[rgb(var(--border-default))] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 border border-[rgb(var(--border-default))] flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4 text-[rgb(var(--text-muted))]" />
          </div>
          <div>
            {isLoading ? (
              <div className="animate-pulse space-y-1.5">
                <div className="h-4 w-40 bg-[rgb(var(--border-default))] rounded" />
                <div className="h-3 w-28 bg-[rgb(var(--border-default))] rounded" />
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-[rgb(var(--text-primary))]">
                  {callScore?.prospect_name ?? 'Unknown prospect'}
                  {callScore?.company_name && (
                    <span className="font-normal text-[rgb(var(--text-secondary))]">
                      {' '}· {callScore.company_name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  {formatDate(callScore?.call_started_at ?? null)}
                  {' · '}
                  {formatDuration(callScore?.duration_secs ?? null)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Overall score */}
        <div className="text-right shrink-0">
          <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] mb-0.5">
            Overall Score
          </p>
          <ScorePill score={callScore?.overall_score ?? null} />
        </div>
      </div>

      {/* L1 — Call Momentum Timeline (hero) */}
      <section className="border border-[rgb(var(--border-default))] p-5">
        <CallMomentumTimeline
          callId={callId}
          onTimestampSelect={setActiveTimestamp}
        />
      </section>

      {/* L2 — Talk / Listen Ratio Donut */}
      <section className="border border-[rgb(var(--border-default))] p-5">
        <TalkListenRatioDonut callId={callId} />
      </section>

      {/* L3 — Question Quality */}
      <section className="border border-[rgb(var(--border-default))] p-5">
        <QuestionQualityPanel callId={callId} onTimestampSelect={setActiveTimestamp} />
      </section>

      {/* L4 — Filler Word Card */}
      <section className="border border-[rgb(var(--border-default))] p-5">
        <FillerWordCard callId={callId} />
      </section>

      {/* L5 — Objection Analysis */}
      <section className="border border-[rgb(var(--border-default))] p-5">
        <ObjectionAnalysisPanel callId={callId} onTimestampSelect={setActiveTimestamp} />
      </section>

      {/* L6 — Buying Signal Panel */}
      <section className="border border-[rgb(var(--border-default))] p-5">
        <BuyingSignalPanel callId={callId} />
      </section>

      {/* Transcript viewer — stub */}
      <TranscriptViewer callId={callId} activeTimestamp={activeTimestamp} />

      {/* L8 — Pacing Analysis */}
      <section className="border border-[rgb(var(--border-default))] p-5">
        <PacingAnalysisChart callId={callId} />
      </section>

    </div>
  );
}
