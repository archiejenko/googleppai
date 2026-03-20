import { useEffect, useRef } from 'react';
import type { FeatureSectionData } from '../../data/featuresData';

interface Props {
  sections: Pick<FeatureSectionData, 'id' | 'navLabel'>[];
  activeId: string;
  onSectionChange: (id: string) => void;
}

export default function FeaturesSectionNav({ sections, activeId, onSectionChange }: Props) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
              const id = entry.target.id;
              onSectionChange(id);
              history.replaceState(null, '', '#' + id);
            }, 100);
          }
        });
      },
      // Fires when section top crosses the upper 30% of the viewport
      { threshold: 0, rootMargin: '-20% 0px -70% 0px' }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [sections, onSectionChange]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-20 z-40 bg-bg-canvas/95 backdrop-blur-sm border-b border-white/[0.06]">
      <div
        className="flex overflow-x-auto max-w-7xl mx-auto px-6 md:px-12"
        style={{ scrollbarWidth: 'none' }}
      >
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollToSection(s.id)}
            className={[
              'whitespace-nowrap py-4 px-4 text-[12px] uppercase tracking-[0.08em] transition-colors duration-150 border-b-2 flex-shrink-0',
              activeId === s.id
                ? 'text-[#FF6B6B] border-[#FF6B6B]'
                : 'text-text-muted border-transparent hover:text-text-primary',
            ].join(' ')}
          >
            {s.navLabel}
          </button>
        ))}
      </div>
    </nav>
  );
}
