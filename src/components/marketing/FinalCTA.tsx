import { useState } from 'react';
import RevenueReadinessModal from '../pricing/RevenueReadinessModal';

interface Props {
  onDemoClick?: () => void;
}

export default function FinalCTA({ onDemoClick }: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const handleClick = onDemoClick ?? (() => setLocalOpen(true));

  return (
    <>
      <section className="py-32 text-center bg-bg-canvas relative overflow-hidden">
        {/* Coral radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,107,107,0.15) 0%, transparent 65%)',
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent label-os mb-6">
            Ready to close the gap?
          </p>
          <h2 className="text-4xl md:text-6xl uppercase leading-[0.95] mb-10 text-text-primary">
            Your pipeline can&apos;t afford guesswork.
          </h2>
          <button onClick={handleClick} className="btn-primary px-10 py-4 text-sm tracking-[0.2em]">
            Request Demo →
          </button>
        </div>
      </section>

      {!onDemoClick && (
        <RevenueReadinessModal open={localOpen} onClose={() => setLocalOpen(false)} />
      )}
    </>
  );
}
