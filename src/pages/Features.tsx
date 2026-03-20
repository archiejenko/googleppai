import { useState, useEffect } from 'react';
import { featureSections } from '../data/featuresData';
import RevenueReadinessModal from '../components/pricing/RevenueReadinessModal';
import FeaturesHero from './features/FeaturesHero';
import FeatureGrid from './features/FeatureGrid';
import FeatureDeepDive from './features/FeatureDeepDive';
import FeatureProgressIndicator from './features/FeatureProgressIndicator';
import FinalCTA from '../components/marketing/FinalCTA';

export default function Features() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  // Hash-on-mount: scroll to target section
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  return (
    <div className="w-full bg-bg-canvas text-text-primary min-h-screen">
      {/* Sticky progress indicator — xl+ only */}
      <FeatureProgressIndicator sections={featureSections} />

      {/* Page hero */}
      <FeaturesHero firstSectionId={featureSections[0].id} />

      {/* Visual grid of 7 feature tiles */}
      <FeatureGrid />

      {/* Deep-dive sections — one per feature, preserve IDs for nav */}
      {featureSections.map((section, idx) => (
        <FeatureDeepDive key={section.id} section={section} index={idx} />
      ))}

      {/* Bottom CTA */}
      <FinalCTA onDemoClick={() => setEnquiryOpen(true)} />

      {/* Compliance footer */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto py-12 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-start gap-8">
        <p
          className="text-[11px] text-text-muted max-w-md leading-relaxed"
          style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
        >
          OAST ensures continuous compliance with global standards. All AI models are
          deployed within hardened environments with full auditability.
        </p>
        <div className="flex gap-4 flex-shrink-0">
          <span className="text-[10px] border border-accent text-accent px-3 py-1 label-os tracking-[0.08em]">
            EU AI ACT COMPLIANT
          </span>
          <span className="text-[10px] border border-accent text-accent px-3 py-1 label-os tracking-[0.08em]">
            GDPR COMPLIANT
          </span>
        </div>
      </div>

      <RevenueReadinessModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </div>
  );
}
