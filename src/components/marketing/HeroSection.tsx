import { useState } from 'react';
import { motion } from 'framer-motion';
import RevenueReadinessModal from '../pricing/RevenueReadinessModal';

export default function HeroSection() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  const scrollToDemoVideo = () => {
    const el = document.getElementById('demo-video');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section
        className="relative z-10 min-h-[100vh] flex flex-col items-center justify-center text-center px-6 md:px-12 pt-32 pb-24 overflow-hidden"
        style={{ background: 'var(--mkt-bg-canvas)' }}
      >
        {/* CSS-only noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '4px 4px',
          }}
        />

        {/* Subtle coral radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(255,107,107,0.07) 0%, transparent 65%)',
          }}
        />

        {/* Pre-headline chip */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 inline-flex items-center gap-2 px-4 py-2 mb-10 cursor-default"
          style={{
            background: 'var(--mkt-accent-tint)',
            border: '1px solid var(--mkt-border-accent)',
            borderRadius: 0,
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full opacity-75"
              style={{ background: 'var(--mkt-accent)' }}
            />
            <span
              className="relative inline-flex h-2 w-2"
              style={{ background: 'var(--mkt-accent)' }}
            />
          </span>
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--mkt-text-accent)' }}
          >
            Revenue Operating System
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9 }}
          className="relative z-10 text-[2.5rem] md:text-[4.5rem] uppercase leading-[0.9] tracking-tighter text-white max-w-5xl mx-auto mb-8"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          The Revenue Operating System{' '}
          <span style={{ color: 'var(--mkt-accent)' }}>Your Pipeline Has Been Missing</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative z-10 text-lg max-w-[600px] mx-auto mb-12 leading-relaxed"
          style={{
            color: 'var(--mkt-text-secondary)',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 400,
          }}
        >
          OAST measures the gap between training performance and live call results — and closes it
          automatically.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="relative z-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <button
            onClick={() => setEnquiryOpen(true)}
            className="text-white font-semibold text-sm tracking-wide transition-opacity hover:opacity-90"
            style={{
              background: 'var(--mkt-accent)',
              height: '48px',
              minWidth: '200px',
              borderRadius: 0,
              border: 'none',
              fontFamily: 'DM Sans, sans-serif',
              padding: '0 2rem',
            }}
          >
            Request Early Access
          </button>
          <button
            onClick={scrollToDemoVideo}
            className="text-white font-semibold text-sm tracking-wide transition-all hover:border-white/60"
            style={{
              background: 'transparent',
              height: '48px',
              minWidth: '200px',
              borderRadius: 0,
              border: '1px solid rgba(255,255,255,0.4)',
              fontFamily: 'DM Sans, sans-serif',
              padding: '0 2rem',
            }}
          >
            See How It Works
          </button>
        </motion.div>
      </section>

      <RevenueReadinessModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </>
  );
}
