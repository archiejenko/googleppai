import HeroSection from '../components/marketing/HeroSection';
import SocialProofBar from '../components/marketing/SocialProofBar';
import TransferGapCallout from '../components/marketing/TransferGapCallout';
import ThreePillars from '../components/marketing/ThreePillars';
import DemoVideoSection from '../components/marketing/DemoVideoSection';

export default function Landing() {
  return (
    <div className="relative w-full overflow-x-hidden" style={{ background: 'var(--mkt-bg-canvas)' }}>
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: Social Proof Strip */}
      <SocialProofBar />

      {/* Section 3: Transfer Gap Feature Callout */}
      <TransferGapCallout />

      {/* Section 4: Three Feature Cards */}
      <ThreePillars />

      {/* Section 5: Demo Video Placeholder */}
      <DemoVideoSection />
    </div>
  );
}
