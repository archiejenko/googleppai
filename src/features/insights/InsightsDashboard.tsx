/**
 * InsightsDashboard — /dashboard/insights
 *
 * Cross-layer analytics hub. Manager/admin only.
 *
 * X1: TransferIndexPanel     — which training content produces real-world improvement
 * X2: PlaybookPanel          — AI-generated best practice playbooks
 * X3: OnboardingAcceleration — new rep trajectory to 80% of team avg call score
 */

import TransferIndexPanel from './TransferIndexPanel'
import PlaybookPanel from './PlaybookPanel'
import OnboardingAccelerationPanel from './OnboardingAccelerationPanel'
import { BarChart2, BookOpen, Rocket } from 'lucide-react'

const SECTIONS = [
  { id: 'transfer',   label: 'Transfer Index',  Icon: BarChart2 },
  { id: 'playbooks',  label: 'Playbooks',        Icon: BookOpen  },
  { id: 'onboarding', label: 'Onboarding',       Icon: Rocket    },
]

export default function InsightsDashboard() {
  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="page-kicker">Intelligence</div>
          <div className="page-title">Insights</div>
          <div className="page-desc">
            Training engagement, skill progression, and AI coaching recommendations across your team.
          </div>
        </div>
      </div>

      {/* Section nav */}
      <div className="flex items-center gap-2 flex-wrap">
        {SECTIONS.map(({ id, label, Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors border border-[rgb(var(--border-default))] hover:border-[rgba(255,107,107,0.3)] rounded-lg px-3 py-1.5"
          >
            <Icon size={12} />
            {label}
          </a>
        ))}
      </div>

      {/* X1 — Transfer Index */}
      <section id="transfer" className="scroll-mt-6">
        <TransferIndexPanel />
      </section>

      {/* X2 — Best Practice Playbooks */}
      <section id="playbooks" className="scroll-mt-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-[#FF6B6B]" />
            <h2 className="card-title !mb-0">Winning Playbooks</h2>
          </div>
          <p className="text-xs text-[rgb(var(--text-muted))]">
            AI-generated from top performers · regenerated every Monday · assign to underperforming reps
          </p>
        </div>
        <PlaybookPanel />
      </section>

      {/* X3 — Onboarding Acceleration */}
      <section id="onboarding" className="scroll-mt-6">
        <OnboardingAccelerationPanel />
      </section>

    </div>
  )
}
