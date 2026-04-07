import { useState, useEffect } from 'react';
import { capabilitySections } from '../data/capabilitiesData';
import DemoEnquiryModal from '../components/pricing/DemoEnquiryModal';
import CapabilitiesHero from './capabilities/CapabilitiesHero';
import CapabilityGrid from './capabilities/CapabilityGrid';
import CapabilityDeepDive from './capabilities/CapabilityDeepDive';
import CapabilityProgressIndicator from './capabilities/CapabilityProgressIndicator';
import FinalCTA from '../components/marketing/FinalCTA';

export default function Capabilities() {
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
      <CapabilityProgressIndicator sections={capabilitySections} />

      {/* Page hero */}
      <CapabilitiesHero firstSectionId={capabilitySections[0].id} />

      {/* Visual grid of 7 capability tiles */}
      <CapabilityGrid />

      {/* Deep-dive sections — one per capability, preserve IDs for nav */}
      {capabilitySections.map((section, idx) => (
        <CapabilityDeepDive key={section.id} section={section} index={idx} />
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

      <DemoEnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </div>
  );
}
