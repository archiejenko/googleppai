import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { CapabilitySectionData } from '../../data/capabilitiesData';

interface Props {
  section: CapabilitySectionData;
  index: number;
}

export default function CapabilityDeepDive({ section, index }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const isEven = index % 2 === 0;

  return (
    <motion.section
      id={section.id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-white/[0.06]"
    >
      <div
        className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 md:gap-20 items-center`}
      >
        {/* Image / Video */}
        <div
          className="flex-1 relative overflow-hidden w-full"
          style={{ borderRadius: '12px' }}
        >
          {section.videoUrl ? (
            <video
              src={section.videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full object-cover"
              style={{ maxHeight: '400px', display: 'block' }}
            />
          ) : (
            <>
              {!imgLoaded && (
                <div className="bg-[#161618] animate-pulse aspect-video w-full" />
              )}
              <img
                src={section.imageUrl}
                alt={section.navLabel}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                className="w-full object-cover"
                style={{ display: imgLoaded ? 'block' : 'none', maxHeight: '400px' }}
              />
            </>
          )}
        </div>

        {/* Text */}
        <div className="flex-1">
          <span className="inline-block text-[10px] uppercase tracking-widest text-accent border border-accent/30 px-2 py-0.5 label-os mb-5">
            {section.navLabel}
          </span>

          <h2 className="text-3xl md:text-5xl uppercase leading-tight text-text-primary mb-8">
            {section.headline}
          </h2>

          <ul className="space-y-5 mb-8">
            {section.deepDiveBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <Check size={16} className="text-accent mt-0.5 flex-shrink-0" />
                <span
                  className="text-sm text-text-secondary leading-relaxed"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
                >
                  {bullet}
                </span>
              </li>
            ))}
          </ul>

          {section.cards.some((c) => c.tierBadge) && (
            <span className="inline-block text-[10px] border border-accent/40 text-accent px-2 py-0.5 label-os tracking-[0.08em]">
              Revenue Intelligence Layer
            </span>
          )}
        </div>
      </div>
    </motion.section>
  );
}
