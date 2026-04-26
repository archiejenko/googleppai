import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const INDUSTRIES = [
  {
    name: 'SaaS & Technology',
    description:
      'Compress ramp time for AEs and correlate product-led signals with rep performance to drive consistent pipeline execution.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="0" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    name: 'Financial Services',
    description:
      'Maintain regulatory compliance in every call while coaching reps to higher close rates through real-time performance benchmarks.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: 'Recruitment & Staffing',
    description:
      'Reduce time-to-bill by accelerating consultant onboarding and embedding objection handling directly into their daily workflow.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    name: 'Professional Services',
    description:
      'Equip consultants with consistent discovery frameworks and live performance benchmarks that scale knowledge across the entire firm.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    name: 'Healthcare & Life Sciences',
    description:
      'Train reps on complex solution selling with real-time compliance guardrails that keep every conversation both effective and within protocol.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    name: 'Manufacturing & Distribution',
    description:
      'Close the gap between technical product knowledge and commercial execution in complex, multi-stakeholder sales cycles.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 20h20M4 20V10l4-4h8l4 4v10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    ),
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55 },
};

export default function IndustriesMarketing() {
  return (
    <div
      className="w-full min-h-screen"
      style={{ background: 'var(--mkt-bg-canvas)' }}
    >
      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xs font-mono uppercase tracking-[0.25em] mb-6"
          style={{ color: 'var(--mkt-accent)', fontFamily: 'DM Sans, sans-serif' }}
        >
          Who We Serve
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="text-4xl md:text-6xl uppercase leading-[0.95] tracking-tight text-white max-w-4xl mx-auto mb-6"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          Built for the industries that run on{' '}
          <span style={{ color: 'var(--mkt-accent)' }}>relationships</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="text-lg max-w-xl mx-auto leading-relaxed"
          style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
        >
          OAST is designed to be sector agnostic, the core of the problem we are trying to solve is true within every industry. Each industry has specific pain-points which we are devoted to solving.
        </motion.p>
      </section>

      {/* Industry grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INDUSTRIES.map((industry, i) => (
            <motion.div
              key={industry.name}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="group flex flex-col p-8 transition-all duration-200"
              style={{
                background: 'var(--mkt-bg-surface)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: '2px solid transparent',
                borderRadius: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderLeft = '2px solid var(--mkt-accent)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderLeft = '2px solid transparent';
              }}
            >
              {/* Icon */}
              <div className="mb-5" style={{ color: 'var(--mkt-accent)' }}>
                {industry.icon}
              </div>

              {/* Name */}
              <h3
                className="text-lg uppercase tracking-wide text-white mb-3"
                style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600 }}
              >
                {industry.name}
              </h3>

              {/* Description */}
              <p
                className="text-sm leading-relaxed flex-1 mb-6"
                style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
              >
                {industry.description}
              </p>

              {/* Per-card CTA */}
              <Link
                to="/#demo-video"
                className="text-sm transition-opacity hover:opacity-70"
                style={{ color: 'var(--mkt-accent)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
              >
                See how OAST works for {industry.name} →
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Challenges Section */}
      <section style={{ background: '#111820', padding: '80px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#FF6B6B', marginBottom: '12px' }}>
              UNIVERSAL
            </p>
            <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '36px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', maxWidth: '640px', margin: '0 auto' }}>
              COMMON SALES CHALLENGES OAST SOLVES ACROSS EVERY INDUSTRY
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {[
              { num: '01', title: 'NEW HIRE RAMP', desc: 'Cut onboarding time by 60% with structured progression, AI practice calls, and Transfer Gap tracking from day one.' },
              { num: '02', title: 'OBJECTION READINESS', desc: 'Reps practice against the exact objections they\'ll face, scored on real-time performance, not just knowledge checks.' },
              { num: '03', title: 'SKILL CONSISTENCY', desc: 'Close the variance gap between your best and worst reps. Identify specific skill breakdowns and coach with precision.' },
              { num: '04', title: 'MANAGER VISIBILITY', desc: 'Sales directors get real-time dashboards on team training, live call performance, and Transfer Gap trends without shadowing every call.' },
            ].map((card) => (
              <div key={card.num} style={{ background: '#151c25', border: '1px solid #1e2a38', borderRadius: '12px', padding: '28px', display: 'flex', gap: '16px' }}>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '28px', fontWeight: 700, color: '#FF6B6B', lineHeight: 1, flexShrink: 0 }}>{card.num}</span>
                <div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '15px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', marginBottom: '4px' }}>{card.title}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#7d8a98', lineHeight: 1.5 }}>{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        className="py-20 px-6 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <motion.div {...fadeUp} className="max-w-lg mx-auto">
          <h2
            className="text-3xl md:text-4xl uppercase tracking-tight text-white mb-4"
            style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
          >
            Don't see your industry?
          </h2>
          <p
            className="text-base mb-8"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            Let's talk. If your team closes deals, OAST can close the gap.
          </p>
          <a
            href="mailto:hello@oast.app?subject=Industries%20enquiry"
            className="inline-block px-8 py-4 text-sm font-semibold text-white uppercase tracking-[0.12em] transition-opacity hover:opacity-90"
            style={{
              background: 'var(--mkt-accent)',
              borderRadius: 0,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Let's Talk
          </a>
        </motion.div>
      </section>
    </div>
  );
}
