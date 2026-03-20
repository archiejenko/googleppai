import type { FeatureSectionData } from '../../data/featuresData';
import FeatureCard from './FeatureCard';
import RoleValueStrip from './RoleValueStrip';
import StatBar from './StatBar';

interface Props {
  section: FeatureSectionData;
}

export default function FeatureSection({ section }: Props) {
  return (
    <section
      id={section.id}
      className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-white/[0.06]"
    >
      {/* Section header row */}
      <div className="flex items-center gap-4 mb-8">
        <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
          FEATURE_{section.index}
        </span>
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#FF6B6B] label-os">
          {section.navLabel}
        </span>
      </div>

      {/* Outcome headline */}
      <h2 className="text-3xl md:text-4xl lg:text-5xl uppercase leading-tight tracking-tight text-text-primary max-w-4xl">
        {section.headline}
      </h2>

      {/* Role value strip */}
      <RoleValueStrip {...section.roleValues} />

      {/* Feature card grid — gap-px technique: outer bg = gap colour */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-bg-canvas border border-white/[0.06]">
        {section.cards.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </div>

      {/* Stat bar */}
      <StatBar stats={section.stats} />
    </section>
  );
}
