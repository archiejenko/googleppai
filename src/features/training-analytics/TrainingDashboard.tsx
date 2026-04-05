import { useState } from 'react';
import TransferGapHero from './TransferGapHero';
import SkillCompetencyBreakdown from './SkillCompetencyBreakdown';
import RepPerformanceMatrix from './RepPerformanceMatrix';
import RetentionDecayCurve from './RetentionDecayCurve';
import SessionEngagementHeatmap from './SessionEngagementHeatmap';
import PainPointsGrid from './PainPointsGrid';
import CoachingQueue from './CoachingQueue';
import TeamObjectionHeatmap from './TeamObjectionHeatmap';
import BuyingSignalInsightCard from './BuyingSignalInsightCard';
import NextStepLeaderboard from './NextStepLeaderboard';
import ScenarioDifficultyAnalysis from './ScenarioDifficultyAnalysis';
import CoachingROITracker from './CoachingROITracker';
import RoleReadinessScores from './RoleReadinessScores';
import TeamPeerBenchmarking from './TeamPeerBenchmarking';
import LowTransferIndexAlert from './LowTransferIndexAlert';
import { useCoachingTriggers } from '../../hooks/useCoachingTriggers';

/**
 * /dashboard/training — Manager-only training analytics hub.
 *
 * T1: TransferGapHero          — hero metric + per-rep sparklines
 * T2: SkillCompetencyBreakdown — horizontal bars + benchmark ticks
 * T3: RepPerformanceMatrix     — sortable table + inline skill expansion
 * T4: RetentionDecayCurve      — 3-bucket retention analysis
 * T5: SessionEngagementHeatmap — 8-week engagement grid
 * T6: PainPointsGrid           — AI-identified pain points
 * T7: CoachingQueue            — spaced repetition trigger queue
 * T8: ScenarioDifficultyAnalysis — per-scenario difficulty + rep attempt history
 * T9: CoachingROITracker         — coaching session log + pre/post skill deltas
 * T10: RoleReadinessScores       — composite readiness score + 5-factor leaderboard
 * T11: TeamPeerBenchmarking      — team percentile table, cohort-aware, sortable
 *
 * Period state is owned here and shared across T2, T3, T4.
 * Coaching trigger count badge is derived from the same React Query cache
 * as CoachingQueue (no extra fetch).
 */

const PERIOD_OPTIONS = [
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
] as const

type Period = 30 | 60 | 90

export default function TrainingDashboard() {
  const [days, setDays] = useState<Period>(30)

  // Coaching trigger count badge — React Query deduplicates with CoachingQueue's query
  const { data: triggers } = useCoachingTriggers()
  const criticalCount = triggers?.filter(t => t.severity === 'critical').length ?? 0

  return (
    <div className="space-y-10">

      {/* Page header + shared period toggle */}
      <div className="border-b border-[rgb(var(--border-default))] pb-5 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-3xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight"
              style={{ fontFamily: 'Oswald, sans-serif' }}
            >
              Training Analytics
            </h1>
            {/* Coaching queue critical badge */}
            {criticalCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 bg-[#FF6B6B18] text-[#FF6B6B] border border-[#FF6B6B44] shrink-0">
                {criticalCount} critical
              </span>
            )}
          </div>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
            Transfer Gap · Skill competency · Rep readiness · Coaching signals
          </p>
        </div>

        {/* Shared period toggle — controls T2, T3, T4 */}
        <div className="flex border border-[rgb(var(--border-default))] shrink-0">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              aria-pressed={days === opt.days}
              className={[
                'px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors duration-150',
                days === opt.days
                  ? 'bg-[rgb(var(--accent-primary))] text-white'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] bg-transparent',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* T1 — Transfer Gap (no period dependency — uses its own 90d window) */}
      <section>
        <TransferGapHero />
      </section>

      {/* T2 — Skill Competency Breakdown */}
      <section>
        <SkillCompetencyBreakdown days={days} />
      </section>

      {/* T3 — Rep Performance Matrix */}
      <section>
        <RepPerformanceMatrix days={days} />
      </section>

      {/* T4 — Retention Decay Curve */}
      <section>
        <RetentionDecayCurve days={days} />
      </section>

      {/* T5 — Session Engagement Heatmap (fixed 8-week window, ignores days prop) */}
      <section>
        <SessionEngagementHeatmap days={days} />
      </section>

      {/* T6 — AI-Identified Pain Points */}
      <section>
        <PainPointsGrid days={days} />
      </section>

      {/* T7 — Coaching Queue + L7 Next Step Leaderboard (side by side) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <CoachingQueue days={days} />
          {/* L6 — Buying signal footnote below queue */}
          <div className="mt-3">
            <BuyingSignalInsightCard days={days} />
          </div>
        </div>
        <div>
          <NextStepLeaderboard days={days} />
        </div>
      </section>

      {/* L5 — Team Objection Handling Heatmap */}
      <section>
        <TeamObjectionHeatmap days={days} />
      </section>

      {/* T8 — Scenario Difficulty & Attempt Analysis */}
      <section>
        <ScenarioDifficultyAnalysis days={days} />
      </section>

      {/* T9 — Coaching ROI Tracker */}
      <section>
        <CoachingROITracker days={days} />
      </section>

      {/* T10 — Role Readiness Scores */}
      <section>
        <RoleReadinessScores days={days} />
      </section>

      {/* T11 — Team Peer Benchmarking */}
      <section>
        <TeamPeerBenchmarking days={days} />
      </section>

      {/* X1 — Low Transfer Index Alert */}
      <section>
        <LowTransferIndexAlert />
      </section>

    </div>
  );
}
