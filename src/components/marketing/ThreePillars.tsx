import { motion } from 'framer-motion';
import { Play, Star, ArrowRightLeft } from 'lucide-react';

const pillars = [
  {
    Icon: Play,
    title: 'Simulate',
    description: 'Reps practise against AI-powered objection scenarios before they ever face a live prospect. Structured repetition at scale.',
  },
  {
    Icon: Star,
    title: 'Score',
    description: 'Every simulation is scored across technique, messaging adherence, and objection handling. Objective, consistent, instant.',
  },
  {
    Icon: ArrowRightLeft,
    title: 'Measure Transfer',
    description: "OAST's Transfer Gap metric maps simulation scores to live call outcomes — showing exactly where training translates and where it doesn't.",
  },
];

export default function ThreePillars() {
  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
      <div className="text-center mb-14">
        <p
          className="text-[10px] uppercase tracking-[0.2em] mb-4 label-os"
          style={{ color: 'var(--mkt-accent)' }}
        >
          The Coaching Loop
        </p>
        <h2
          className="text-3xl md:text-5xl uppercase leading-tight text-white max-w-2xl mx-auto"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          Three steps. One closed loop.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pillars.map(({ Icon, title, description }, idx) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: idx * 0.15 }}
            className="relative group overflow-hidden p-8"
            style={{
              background: 'var(--mkt-bg-surface)',
              border: '1px solid var(--mkt-border)',
              borderRadius: 0,
            }}
          >
            {/* Coral left accent strip on hover */}
            <div
              className="absolute left-0 top-0 h-full w-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'var(--mkt-accent)' }}
            />

            <Icon size={32} className="mb-5" style={{ color: 'var(--mkt-accent)' }} />
            <h3
              className="text-xl uppercase mb-3 text-white"
              style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
            >
              {title}
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: 'var(--mkt-text-secondary)',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 400,
              }}
            >
              {description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
