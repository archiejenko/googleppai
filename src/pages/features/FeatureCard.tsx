import type { FeatureCardData } from '../../data/featuresData';

type Props = FeatureCardData;

export default function FeatureCard({ icon: Icon, title, description, hoverValue, tierBadge }: Props) {
  return (
    <div className="group relative bg-bg-surface p-6 border-t-2 border-transparent hover:border-[#FF6B6B] hover:bg-bg-raised transition-colors duration-150 cursor-default">
      {/* Tier badge — top-right corner tag */}
      {tierBadge && (
        <span className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.1em] text-[#FF6B6B] bg-[rgba(255,107,107,0.12)] border border-[rgba(255,107,107,0.3)] px-2 py-0.5">
          {tierBadge}
        </span>
      )}

      {/* Icon box */}
      <div className="w-8 h-8 bg-[rgba(255,107,107,0.12)] border border-[rgba(255,107,107,0.3)] flex items-center justify-center mb-5">
        <Icon size={15} className="text-[#FF6B6B]" />
      </div>

      {/* Title */}
      <h3 className="text-[14px] uppercase tracking-[0.06em] text-text-primary mb-3 leading-snug">
        {title}
      </h3>

      {/* Description — DM Sans body */}
      <p
        className="text-[13px] text-text-secondary leading-relaxed"
        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
      >
        {description}
      </p>

      {/* Hover value statement */}
      <p
        className="mt-4 text-[12px] text-[#FF6B6B] italic opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
      >
        {hoverValue}
      </p>
    </div>
  );
}
