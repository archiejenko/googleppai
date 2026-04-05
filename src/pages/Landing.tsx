import HeroSection from '../components/marketing/HeroSection';
import TransferGapCallout from '../components/marketing/TransferGapCallout';
import SocialProofBar from '../components/marketing/SocialProofBar';
import ThreePillars from '../components/marketing/ThreePillars';
import DemoVideoSection from '../components/marketing/DemoVideoSection';
import RevenueIntelligenceUpgrade from '../components/marketing/RevenueIntelligenceUpgrade';
import PricingTeaser from '../components/marketing/PricingTeaser';

export default function Landing() {
  return (
    <div className="relative w-full overflow-x-hidden" style={{ background: 'var(--mkt-bg-canvas)' }}>
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: Problem — Transfer Gap */}
      <TransferGapCallout />

      {/* Section 3: Social Proof Strip */}
      <SocialProofBar />

      {/* Section 4: Solution — The Coaching Loop */}
      <ThreePillars />

      {/* Section 5: Demo Video */}
      <DemoVideoSection />

      {/* Section 6: Premium Upgrade — Revenue Intelligence */}
      <RevenueIntelligenceUpgrade />

      {/* Section 7: Pricing Teaser */}
      <PricingTeaser />
    </div>
  );
}
