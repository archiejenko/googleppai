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
    <div className="p-6 max-w-6xl mx-auto space-y-10">

      {/* Page header */}
      <div className="border-b border-[#2a2a2e] pb-5">
        <h1
          className="text-2xl font-black uppercase tracking-tight text-white mb-1"
          style={{ fontFamily: 'Oswald, sans-serif' }}
        >
          Cross-Layer Insights
        </h1>
        <p className="text-sm text-[#6b7280]">
          Training effectiveness · best practice extraction · onboarding acceleration
        </p>

        {/* Section nav */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {SECTIONS.map(({ id, label, Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-1.5 text-xs font-mono text-[#6b7280] hover:text-white transition-colors border border-[#2a2a2e] hover:border-[#6366F1] px-3 py-1.5"
            >
              <Icon size={12} />
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* X1 — Transfer Index */}
      <section id="transfer" className="scroll-mt-6">
        <TransferIndexPanel />
      </section>

      {/* X2 — Best Practice Playbooks */}
      <section id="playbooks" className="scroll-mt-6">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen size={18} className="text-[#6366F1]" />
            <h2 className="font-display font-bold text-white tracking-wide">WINNING PLAYBOOKS</h2>
          </div>
          <p className="text-xs text-[#6b7280]">
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
