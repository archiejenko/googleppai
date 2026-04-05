/**
 * CallsDashboard — /dashboard/calls
 *
 * Rep's own call analytics overview. Manager sees team aggregate; rep sees own.
 * RLS enforces data scoping — no client-side role checks needed for data.
 *
 * Components slot in order:
 *   L7  NextStepCommitmentRate (hero)  — wired in L7
 *   L2  TalkListenTrend
 *   L3  QuestionQualityTrend           — wired in L3
 *   L4  FillerWordTrend                — wired in L4
 *   L6  BuyingSignalTrend (TierGate)  — wired in L6
 *   L8  Pacing stat card (TierGate)   — wired in L8
 */

import { useAuth } from '../../context/AuthContext';
import { useTalkListenTrend } from '../../hooks/useTalkListen';
import { useQuestionQualityTrend } from '../../hooks/useCallQuestions';
import { useFillerWordTrend } from '../../hooks/useFillerWords';
import TalkListenTrend from './TalkListenTrend';
import QuestionQualityTrend from './QuestionQualityTrend';
import FillerWordTrend from './FillerWordTrend';
import ObjectionPatternChart from './ObjectionPatternChart';
import BuyingSignalTrend from './BuyingSignalTrend';
import NextStepCommitmentRate from './NextStepCommitmentRate';
import PacingStatCard from './PacingStatCard';

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-[rgb(var(--border-default))] p-5 space-y-4">
      <p className="text-[9px] uppercase tracking-widest text-[rgb(var(--text-muted))] font-bold">
        {title}
      </p>
      {children}
    </section>
  );
}

function FillerWordSection({ repId }: { repId: string }) {
  const { data, isLoading } = useFillerWordTrend(repId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-40 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-44 bg-[rgb(var(--border-default))] rounded" />
      </div>
    );
  }

  return <FillerWordTrend points={data ?? []} />;
}

function QuestionQualitySection({ repId }: { repId: string }) {
  const { data, isLoading } = useQuestionQualityTrend(repId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-40 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-44 bg-[rgb(var(--border-default))] rounded" />
      </div>
    );
  }

  return <QuestionQualityTrend points={data ?? []} />;
}

function TalkListenSection({ repId }: { repId: string }) {
  const { data, isLoading } = useTalkListenTrend(repId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-40 bg-[rgb(var(--border-default))] rounded" />
        <div className="h-44 bg-[rgb(var(--border-default))] rounded" />
      </div>
    );
  }

  if (!data) return null;

  return <TalkListenTrend data={data} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CallsDashboard() {
  const { user } = useAuth();
  const repId = user?.id ?? '';

  if (!repId) {
    return (
      <div className="p-8 text-[rgb(var(--text-muted))] text-sm">Loading…</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-black uppercase tracking-tight text-[rgb(var(--text-primary))]"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Call Analytics
        </h1>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Your live call performance trends
        </p>
      </div>

      {/* L7 Next Step Commitment Rate (hero) */}
      <SectionShell title="Next Step Commitment">
        <NextStepCommitmentRate />
      </SectionShell>

      {/* L2 Talk / Listen Ratio Trend */}
      <SectionShell title="Talk / Listen Ratio">
        <TalkListenSection repId={repId} />
      </SectionShell>

      {/* L3 Question Quality Trend */}
      <SectionShell title="Question Quality">
        <QuestionQualitySection repId={repId} />
      </SectionShell>
      {/* L4 Filler Word Trend */}
      <SectionShell title="Filler Words">
        <FillerWordSection repId={repId} />
      </SectionShell>
      {/* L4 FillerWordTrend — wired in L4 */}
      {/* L5 Objection Pattern Chart */}
      <SectionShell title="Objection Patterns">
        <ObjectionPatternChart />
      </SectionShell>
      {/* L6 Buying Signal Trend */}
      <SectionShell title="Buying Signals">
        <BuyingSignalTrend />
      </SectionShell>
      {/* L8 Pacing Stat Card */}
      <SectionShell title="Pacing">
        <PacingStatCard />
      </SectionShell>

    </div>
  );
}
