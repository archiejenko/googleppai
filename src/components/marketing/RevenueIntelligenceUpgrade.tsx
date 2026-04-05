import { motion } from 'framer-motion';

const bullets = [
  'Pipeline health scoring across every open deal',
  'Automatic meeting capture and conversation analytics',
  'Forecast accuracy and risk flags in real time',
];

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
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
      <span
        className="text-sm leading-relaxed"
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

export default function RevenueIntelligenceUpgrade() {
  return (
    <section className="py-24 px-6 md:px-12 relative z-10" style={{ background: 'var(--mkt-bg-canvas)' }}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="p-10 md:p-14"
          style={{
            background: '#1a1a1c',
            border: '1px solid var(--mkt-border)',
            borderRadius: 0,
          }}
        >
          {/* Premium Upgrade chip — border-only coral treatment */}
          <div className="mb-8 inline-block">
            <span
              className="text-[9px] uppercase tracking-[0.25em]"
              style={{
                color: 'var(--mkt-accent)',
                border: '1px solid var(--mkt-accent)',
                padding: '4px 10px',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
              }}
            >
              Premium Upgrade
            </span>
          </div>

          <h2
            className="text-3xl md:text-4xl uppercase leading-tight mb-6"
            style={{
              color: 'var(--mkt-text-primary)',
              fontFamily: 'Oswald, sans-serif',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Go Deeper With Revenue Intelligence
          </h2>

          <p
            className="text-base leading-relaxed mb-10"
            style={{
              color: 'var(--mkt-text-secondary)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 400,
              maxWidth: '560px',
            }}
          >
            For teams that want pipeline-level visibility, Revenue Intelligence layers deal health
            scoring, meeting capture, and forecast analytics directly on top of your OAST coaching
            foundation. Available from £185/user/month.
          </p>

          <ul className="space-y-4 mb-10">
            {bullets.map((bullet) => (
              <BulletItem key={bullet}>{bullet}</BulletItem>
            ))}
          </ul>

          <a
            href="#pricing"
            className="text-sm font-medium transition-opacity hover:opacity-80 inline-flex items-center gap-1"
            style={{
              color: 'var(--mkt-accent)',
              fontFamily: 'DM Sans, sans-serif',
              textDecoration: 'none',
            }}
          >
            See Revenue Intelligence →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
