import { Link } from 'react-router-dom';

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="flex-shrink-0 mt-0.5"
      style={{ color: 'var(--mkt-accent)' }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LockedFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3" style={{ opacity: 0.45 }}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="flex-shrink-0 mt-0.5"
        style={{ color: 'var(--mkt-text-muted)' }}
      >
        <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span
        className="text-sm line-through"
        style={{
          color: 'var(--mkt-text-muted)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 400,
        }}
      >
        {children}
      </span>
    </li>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon />
      <span
        className="text-sm"
        style={{
          color: 'var(--mkt-text-secondary)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 400,
        }}
      >
        {children}
      </span>
    </li>
  );
}

export default function PricingTeaser() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
      {/* Section header */}
      <div className="text-center mb-16">
        <p
          className="text-[10px] uppercase tracking-[0.2em] mb-4 label-os"
          style={{ color: 'var(--mkt-accent)' }}
        >
          Pricing
        </p>
        <h2
          className="text-3xl md:text-5xl uppercase leading-tight text-white mb-4"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          Infrastructure Pricing. No Surprises.
        </h2>
        <p
          className="text-base max-w-xl mx-auto"
          style={{
            color: 'var(--mkt-text-secondary)',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 400,
          }}
        >
          Three tiers designed for teams at different stages of revenue maturity.
        </p>
      </div>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        {/* Card 1 — Performance Infrastructure */}
        <div
          className="p-8 flex flex-col"
          style={{
            background: 'var(--mkt-bg-surface)',
            border: '1px solid var(--mkt-border)',
            borderRadius: 0,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest mb-5 label-os"
            style={{ color: 'var(--mkt-text-muted)' }}
          >
            Performance Infrastructure
          </p>
          <div className="mb-1">
            <span
              className="text-4xl text-white"
              style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
            >
              £65
            </span>
            <span
              className="text-sm ml-2"
              style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
            >
              / user / month
            </span>
          </div>
          <p
            className="text-xs mb-6"
            style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
          >
            + £2,000 Strategic Deployment Fee
          </p>
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            For teams building repeatable sales motion
          </p>

          <ul className="space-y-3 mb-10 flex-1">
            <FeatureItem>Real-Time Coaching</FeatureItem>
            <FeatureItem>Performance Analytics</FeatureItem>
            <FeatureItem>Goal Tracking</FeatureItem>
            <FeatureItem>Leaderboards</FeatureItem>
            <LockedFeature>Meeting Intelligence</LockedFeature>
          </ul>

          <Link
            to="/pricing"
            className="w-full text-center py-3 text-sm tracking-wide transition-colors hover:border-white/50"
            style={{
              border: '1px solid var(--mkt-border-hover)',
              color: 'var(--mkt-text-primary)',
              borderRadius: 0,
              fontFamily: 'DM Sans, sans-serif',
              display: 'block',
            }}
          >
            Get Started →
          </Link>
        </div>

        {/* Card 2 — Revenue Intelligence Layer */}
        <div className="flex flex-col">
          <div
            className="p-8 flex flex-col flex-1"
            style={{
              background: 'var(--mkt-bg-surface)',
              border: '1px solid var(--mkt-border)',
              borderRadius: 0,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-widest mb-5 label-os"
              style={{ color: 'var(--mkt-text-muted)' }}
            >
              Revenue Intelligence Layer
            </p>
            <div className="mb-1">
              <span
                className="text-4xl text-white"
                style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
              >
                £185
              </span>
              <span
                className="text-sm ml-2"
                style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
              >
                / user / month
              </span>
            </div>
            <p
              className="text-xs mb-6"
              style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
            >
              + £2,000 Strategic Deployment Fee
            </p>
            <p
              className="text-sm mb-8"
              style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
            >
              For teams ready to correlate training with revenue outcomes
            </p>

            <ul className="space-y-3 mb-10 flex-1">
              <FeatureItem>Everything in Performance</FeatureItem>
              <FeatureItem>Meeting Intelligence</FeatureItem>
              <FeatureItem>Transfer Gap Analysis</FeatureItem>
              <FeatureItem>Deal Correlation</FeatureItem>
              <FeatureItem>Pipeline Health Scoring</FeatureItem>
              <FeatureItem>AI Revenue Coaching</FeatureItem>
            </ul>

            <Link
              to="/pricing"
              className="w-full text-center py-3 text-sm tracking-wide font-semibold transition-opacity hover:opacity-90"
              style={{
                background: 'var(--mkt-accent)',
                color: '#FFFFFF',
                borderRadius: 0,
                fontFamily: 'DM Sans, sans-serif',
                display: 'block',
              }}
            >
              Get Started →
            </Link>
          </div>
        </div>

        {/* Card 3 — Revenue Readiness */}
        <div
          className="p-8 flex flex-col"
          style={{
            background: 'var(--mkt-bg-surface)',
            border: '1px solid var(--mkt-border)',
            borderRadius: 0,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest mb-5 label-os"
            style={{ color: 'var(--mkt-text-muted)' }}
          >
            Revenue Readiness
          </p>
          <div className="mb-1">
            <span
              className="text-4xl text-white"
              style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
            >
              Custom
            </span>
          </div>
          <p
            className="text-xs mb-6"
            style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
          >
            &nbsp;
          </p>
          <p
            className="text-sm mb-8"
            style={{ color: 'var(--mkt-text-secondary)', fontFamily: 'DM Sans, sans-serif' }}
          >
            For enterprise teams building a readiness culture across the full revenue organisation.
          </p>

          <ul className="space-y-3 mb-10 flex-1">
            <FeatureItem>Everything in Revenue Intelligence</FeatureItem>
            <FeatureItem>Enterprise-wide readiness programmes</FeatureItem>
            <FeatureItem>Custom deployment & success support</FeatureItem>
            <FeatureItem>Dedicated revenue readiness partner</FeatureItem>
          </ul>

          <Link
            to="/design-partner"
            className="w-full text-center py-3 text-sm tracking-wide transition-colors hover:border-white/50"
            style={{
              border: '1px solid var(--mkt-border-hover)',
              color: 'var(--mkt-text-primary)',
              borderRadius: 0,
              fontFamily: 'DM Sans, sans-serif',
              display: 'block',
            }}
          >
            Talk to Us →
          </Link>
        </div>

      </div>

      {/* Footnote */}
      <p
        className="text-center text-xs"
        style={{
          color: 'var(--mkt-text-muted)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 400,
        }}
      >
        All plans require a one-time £2,000 Strategic Deployment Fee. Token usage charges apply on
        Revenue Intelligence Layer.
      </p>
    </section>
  );
}
