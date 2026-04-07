import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

function CountUp({ target, duration = 2 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}</span>;
}

export default function TransferGapCallout() {
  return (
    <section
      id="transfer-gap"
      className="py-28 relative overflow-hidden"
      style={{ background: 'var(--mkt-bg-canvas)' }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-16 items-center">

          {/* Left column — copy */}
          <div>
            <p
              className="text-xs uppercase mb-6"
              style={{
                color: 'var(--mkt-accent)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                letterSpacing: '2px',
              }}
            >
              The Transfer Gap
            </p>

            <h2
              className="text-[2rem] md:text-[3rem] uppercase leading-[0.95] mb-6 text-white"
              style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
            >
              Your reps train well.{' '}
              <span style={{ color: 'var(--mkt-accent)' }}>They sell differently.</span>
            </h2>

            <p
              className="text-base font-semibold mb-8"
              style={{
                color: 'var(--mkt-text-primary)',
                fontFamily: 'DM Sans, sans-serif',
                maxWidth: '520px',
              }}
            >
              The gap between your training room and your pipeline is costing you deals.
            </p>

            <p
              className="text-base leading-relaxed mb-10"
              style={{
                color: 'var(--mkt-text-secondary)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 400,
                maxWidth: '520px',
              }}
            >
              89% of sales training fails to transfer to live calls within 90 days. Most teams have
              no way to measure it. OAST's Transfer Gap metric is the first system purpose-built to
              quantify, visualise, and close that disconnect.
            </p>

            <a
              href="/capabilities#transfer-gap"
              className="text-sm font-medium transition-opacity hover:opacity-80 inline-flex items-center gap-1"
              style={{
                color: 'var(--mkt-accent)',
                fontFamily: 'DM Sans, sans-serif',
                textDecoration: 'none',
              }}
            >
              See How We Measure It →
            </a>
          </div>

          {/* Right column — CSS scorecard */}
          <div
            className="p-8"
            style={{
              background: 'var(--mkt-bg-surface)',
              border: '1px solid var(--mkt-border)',
              borderRadius: 0,
            }}
          >
            {/* Training Score row */}
            <div className="flex justify-between items-center py-5" style={{ borderBottom: '1px solid var(--mkt-border)' }}>
              <div>
                <p
                  className="text-xs uppercase tracking-widest mb-1"
                  style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Training Score
                </p>
                <p
                  className="text-[2.8rem] leading-none text-white"
                  style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
                >
                  <CountUp target={87} />
                  <span className="text-2xl">%</span>
                </p>
              </div>
              <div
                className="text-xs uppercase tracking-widest px-2 py-1"
                style={{
                  color: '#4ade80',
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Training
              </div>
            </div>

            {/* Live Score row */}
            <div className="flex justify-between items-center py-5" style={{ borderBottom: '1px solid var(--mkt-border)' }}>
              <div>
                <p
                  className="text-xs uppercase tracking-widest mb-1"
                  style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Live Call Score
                </p>
                <p
                  className="text-[2.8rem] leading-none text-white"
                  style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
                >
                  <CountUp target={61} />
                  <span className="text-2xl">%</span>
                </p>
              </div>
              <div
                className="text-xs uppercase tracking-widest px-2 py-1"
                style={{
                  color: 'var(--mkt-text-secondary)',
                  background: 'rgba(136,153,187,0.1)',
                  border: '1px solid rgba(136,153,187,0.2)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Live
              </div>
            </div>

            {/* Transfer Gap row — coral accent */}
            <div className="flex justify-between items-center py-5">
              <div>
                <p
                  className="text-xs uppercase tracking-widest mb-1"
                  style={{ color: 'var(--mkt-accent)', fontFamily: 'DM Sans, sans-serif' }}
                >
                  Transfer Gap
                </p>
                <p
                  className="text-[2.8rem] leading-none"
                  style={{ color: 'var(--mkt-accent)', fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
                >
                  −26<span className="text-2xl">pts</span>
                </p>
              </div>
              <div
                className="text-xs uppercase tracking-widest px-2 py-1"
                style={{
                  color: 'var(--mkt-accent)',
                  background: 'var(--mkt-accent-tint)',
                  border: '1px solid var(--mkt-border-accent)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Gap
              </div>
            </div>

            <p
              className="text-xs mt-4 leading-relaxed"
              style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
            >
              Average across 120 enterprise revenue teams. OAST closes this gap automatically.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
