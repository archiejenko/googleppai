import { useState } from 'react';
import { Link } from 'react-router-dom';
import DemoEnquiryModal from '../components/pricing/DemoEnquiryModal';
import {
  Phone,
  BarChart2,
  BrainCircuit,
  BookOpen,
  Trophy,
  TrendingUp,
  Users,
  AlertTriangle,
  Target,
  FileText,
  Zap,
  UserCheck,
  Shield,
  Video,
  Activity,
} from 'lucide-react';

// ─── Persona data ────────────────────────────────────────────────────────────

const personas = [
  {
    id: 'bdm',
    label: 'BDM',
    fullTitle: 'Business Development Representative',
    pain: 'Low call-to-meeting conversion, inconsistent pitch quality, no structured feedback loop.',
    northStar: { label: 'Training Score', value: '87%', description: 'Your benchmark for live-call readiness' },
    cta: { text: 'See how Business Development Representatives use OAST', href: '#' },
    capabilities: [
      {
        Icon: Phone,
        name: 'Pre-Call Simulation Drills',
        outcome: 'Practice every objection before the live call that counts.',
      },
      {
        Icon: Activity,
        name: 'Real-Time Pitch Analysis',
        outcome: 'Know what is working mid-call and self-correct before the deal slips.',
      },
      {
        Icon: BrainCircuit,
        name: 'AI Coaching (Alex)',
        outcome: 'Personalised, volume-based improvement after every session.',
      },
      {
        Icon: BookOpen,
        name: 'Drill Library',
        outcome: 'Targeted skills development mapped to your specific gaps.',
      },
      {
        Icon: Trophy,
        name: 'Leaderboard',
        outcome: 'Healthy competition and peer visibility to keep momentum high.',
      },
      {
        Icon: BarChart2,
        name: 'Training Score',
        outcome: 'A structured progression path so you always know where you stand.',
      },
    ],
  },
  {
    id: 'director',
    label: 'Sales Director',
    fullTitle: 'Sales Director / VP of Sales',
    pain: "No visibility into rep readiness, can't diagnose why deals slip, reactive coaching.",
    northStar: { label: 'Transfer Gap', value: '−26pts', description: 'Close this and pipeline converts' },
    cta: { text: 'See how Sales Directors use OAST', href: '#' },
    capabilities: [
      {
        Icon: TrendingUp,
        name: 'Transfer Gap Metric',
        outcome: 'Correlate training scores with live call performance — quantified.',
      },
      {
        Icon: Users,
        name: 'Team Analytics Dashboard',
        outcome: 'Rep-by-rep readiness view so you know exactly who needs attention.',
      },
      {
        Icon: AlertTriangle,
        name: 'Manager Insight',
        outcome: 'Flag at-risk reps before they damage pipeline — not after.',
      },
      {
        Icon: Target,
        name: 'Revenue Intelligence Layer',
        outcome: 'Deal health signals and MEDDIC scoring across every open opportunity.',
      },
      {
        Icon: FileText,
        name: 'Win / Loss Engine',
        outcome: 'Root cause diagnosis on every lost deal — patterns, not anecdotes.',
      },
      {
        Icon: BarChart2,
        name: 'Forecast Agent',
        outcome: 'Data-driven pipeline confidence for every forecast review.',
      },
    ],
  },
  {
    id: 'leader',
    label: 'Sales Leader',
    fullTitle: 'Sales Leader / CRO / RevOps',
    pain: "Inconsistent ramp time, no standardised methodology, can't prove coaching ROI.",
    northStar: { label: 'Ramp Time', value: '−34%', description: 'Faster to quota with structured ramp' },
    cta: { text: 'See how Sales Leaders use OAST', href: '#' },
    capabilities: [
      {
        Icon: UserCheck,
        name: 'Onboarding Agent',
        outcome: 'Structured ramp path with 48-hour activation target per new hire.',
      },
      {
        Icon: Shield,
        name: 'MEDDIC Methodology Backbone',
        outcome: 'Embedded qualification at every stage — no rep goes off-script.',
      },
      {
        Icon: Zap,
        name: 'Revenue Readiness Tier',
        outcome: 'Executive briefing and custom deployment for enterprise rollout.',
      },
      {
        Icon: FileText,
        name: 'Investor-Grade Reporting',
        outcome: 'Proof of productivity lift in the format your board expects.',
      },
      {
        Icon: BrainCircuit,
        name: 'Agent Fleet',
        outcome: 'BDR and admin tasks automated so reps spend time closing deals.',
      },
    ],
  },
];

// ─── Cross-role capabilities ──────────────────────────────────────────────────

const sharedCapabilities = [
  {
    Icon: Video,
    name: 'Meeting Intelligence (Revenue Intelligence Layer only)',
    description:
      'Every customer conversation automatically captured, transcribed, and scored. Shared insight across rep, manager, and leader views.',
  },
  {
    Icon: BarChart2,
    name: 'Performance Analytics',
    description:
      'Live rep rankings, trajectory tracking, and team benchmarking in a single dashboard. Visible at every level of the org.',
  },
  {
    Icon: BrainCircuit,
    name: 'AI Coaching Feedback Loop',
    description:
      'Automated weekly digests per rep. Coaching recommendations derived from actual call data.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserJourney() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [demoOpen, setDemoOpen] = useState(false);
  const active = personas[activeIdx];

  const handleTabChange = (idx: number) => {
    if (idx === activeIdx) return;
    setVisible(false);
    setTimeout(() => {
      setActiveIdx(idx);
      setVisible(true);
    }, 150);
  };

  return (
    <div className="w-full bg-bg-canvas text-text-primary min-h-screen">

      {/* ── Hero ── */}
      <section className="pt-16 pb-12 px-6 md:px-12 max-w-7xl mx-auto border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent label-os mb-6">
          OAST — User Journey
        </p>
        <h1
          className="text-5xl md:text-7xl lg:text-8xl uppercase leading-[0.9] tracking-tighter text-text-primary mb-6 max-w-5xl"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          Built for every layer of your revenue team
        </h1>
        <p
          className="text-lg text-text-secondary max-w-xl"
          style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
        >
          Different roles. Different problems. One platform that serves them all.
        </p>
      </section>

      {/* ── Persona tab switcher + panel ── */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto pt-10 pb-0">

        {/* Desktop tabs */}
        <div className="hidden md:flex border-b border-white/[0.08]">
          {personas.map((p, i) => (
            <button
              key={p.id}
              onClick={() => handleTabChange(i)}
              className={[
                'px-8 py-4 text-[13px] uppercase tracking-[0.1em] transition-colors duration-150 border-b-2 -mb-px',
                i === activeIdx
                  ? 'text-white border-[#FF6B6B]'
                  : 'text-text-muted border-transparent hover:text-text-secondary',
              ].join(' ')}
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Mobile select */}
        <div className="md:hidden">
          <select
            value={activeIdx}
            onChange={(e) => handleTabChange(Number(e.target.value))}
            className="w-full bg-bg-surface text-text-primary text-sm px-4 py-3 border border-white/10 focus:outline-none focus:border-[#FF6B6B]"
            style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
          >
            {personas.map((p, i) => (
              <option key={p.id} value={i}>
                {p.fullTitle}
              </option>
            ))}
          </select>
        </div>

        {/* Persona panel — opacity fade, no remount */}
        <div
          className="py-10"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 150ms ease' }}
        >
          <div
            className="p-8 md:p-12"
            style={{ background: '#161618', borderRadius: '12px' }}
          >
            {/* Role header */}
            <div className="mb-10">
              <h2
                className="text-2xl md:text-4xl uppercase text-white mb-3"
                style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
              >
                {active.fullTitle}
              </h2>
              <p
                className="text-sm text-text-secondary max-w-xl"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
              >
                <span className="text-text-muted uppercase tracking-widest text-[10px] label-os mr-2">Core pain:</span>
                {active.pain}
              </p>
            </div>

            {/* Capabilities grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04] border border-white/[0.06] mb-10">
              {active.capabilities.map(({ Icon, name, outcome }) => (
                <div key={name} className="bg-[#161618] p-6 flex items-start gap-4">
                  <div className="w-8 h-8 flex-shrink-0 bg-[rgba(255,107,107,0.1)] border border-[rgba(255,107,107,0.25)] flex items-center justify-center mt-0.5">
                    <Icon size={15} className="text-[#FF6B6B]" />
                  </div>
                  <div>
                    <p
                      className="text-[13px] uppercase tracking-[0.06em] text-white mb-1"
                      style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
                    >
                      {name}
                    </p>
                    <p
                      className="text-[13px] text-text-muted leading-relaxed"
                      style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
                    >
                      {outcome}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* North star metric */}
            <div
              className="inline-flex flex-col gap-1 border px-6 py-4 mb-8"
              style={{ borderColor: '#FF6B6B', borderRadius: 0 }}
            >
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#FF6B6B] label-os">
                North Star Metric — {active.northStar.label}
              </span>
              <span
                className="text-4xl text-white"
                style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
              >
                {active.northStar.value}
              </span>
              <span
                className="text-[12px] text-text-muted"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
              >
                {active.northStar.description}
              </span>
            </div>

            {/* Panel CTA */}
            <div>
              <a
                href={active.cta.href}
                className="text-sm transition-opacity hover:opacity-70 inline-flex items-center gap-1"
                style={{ color: '#FF6B6B', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
              >
                {active.cta.text} →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cross-role section ── */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto py-20 border-t border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent label-os mb-4">
          Shared Infrastructure
        </p>
        <h2
          className="text-3xl md:text-5xl uppercase leading-tight text-text-primary mb-4 max-w-3xl"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          Shared infrastructure across every role
        </h2>
        <p
          className="text-base text-text-secondary max-w-xl mb-14"
          style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
        >
          OAST operates as a core function across full sales teams, our insight serves everyone within sales, from your BDR to Sales Director.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sharedCapabilities.map(({ Icon, name, description }) => (
            <div
              key={name}
              className="p-8"
              style={{ background: '#161618', borderRadius: '12px' }}
            >
              <div className="w-10 h-10 bg-[rgba(255,107,107,0.1)] border border-[rgba(255,107,107,0.25)] flex items-center justify-center mb-6">
                <Icon size={18} className="text-[#FF6B6B]" />
              </div>
              <h3
                className="text-[14px] uppercase tracking-[0.06em] text-white mb-3"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
              >
                {name}
              </h3>
              <p
                className="text-[13px] text-text-secondary leading-relaxed"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
              >
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto py-20 border-t border-white/[0.06]">
        <h2
          className="text-3xl md:text-5xl uppercase text-white mb-10"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          Which role are you?
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/register"
            className="px-8 py-4 text-[13px] uppercase tracking-[0.12em] bg-accent text-white text-center shadow-[6px_6px_0px_0px_rgba(255,107,107,0.3)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
          >
            I'm a Rep →
          </Link>
          <button
            onClick={() => setDemoOpen(true)}
            className="px-8 py-4 text-[13px] uppercase tracking-[0.12em] border border-white/20 text-text-secondary text-center hover:border-white/40 hover:text-white transition-colors duration-150"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
          >
            I'm a Leader →
          </button>
        </div>
      </section>

      <DemoEnquiryModal open={demoOpen} onClose={() => setDemoOpen(false)} />

    </div>
  );
}
