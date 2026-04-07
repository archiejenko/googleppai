import { useEffect, useRef, useState } from 'react';
import type { CapabilitySectionData } from '../../data/capabilitiesData';

interface Props {
  sections: CapabilitySectionData[];
}

export default function CapabilityProgressIndicator({ sections }: Props) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const [tooltip, setTooltip] = useState<string | null>(null);
  const observersRef = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    // Disconnect any previous observers
    observersRef.current.forEach((o) => o.disconnect());
    observersRef.current = [];

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(section.id);
        },
        { threshold: 0.35 }
      );
      observer.observe(el);
      observersRef.current.push(observer);
    });

    return () => observersRef.current.forEach((o) => o.disconnect());
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed left-5 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-4">
      {sections.map((section) => {
        const isActive = section.id === activeId;
        return (
          <div key={section.id} className="relative flex items-center">
            <button
              onClick={() => scrollTo(section.id)}
              onMouseEnter={() => setTooltip(section.navLabel)}
              onMouseLeave={() => setTooltip(null)}
              className="transition-all duration-300 focus:outline-none"
              style={{
                width: isActive ? '10px' : '6px',
                height: isActive ? '10px' : '6px',
                borderRadius: '50%',
                background: isActive ? '#FF6B6B' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s',
              }}
              aria-label={`Go to ${section.navLabel}`}
            />

            {/* Tooltip */}
            {tooltip === section.navLabel && (
              <div
                className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-bg-surface border border-white/10 px-3 py-1.5 text-[11px] text-text-primary pointer-events-none"
                style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
              >
                {section.navLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
