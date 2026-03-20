import { BrainCircuit, Mic2, Activity, TrendingUp, GitMerge, Users, BookOpen } from 'lucide-react';
import {
  GlowingStarsBackgroundCard,
} from '../../components/ui/GlowingStars';

const tiles = [
  {
    sectionId: 'call-training',
    Icon: BrainCircuit,
    label: 'Real-Time Coaching',
    hook: 'Train every rep to close under pressure.',
  },
  {
    sectionId: 'meeting-intelligence',
    Icon: Mic2,
    label: 'Meeting Intelligence',
    hook: 'Every meeting reviewed in under 6 minutes.',
  },
  {
    sectionId: 'live-call-intelligence',
    Icon: Activity,
    label: 'Live Call Scoring',
    hook: 'Silent coaching on every live call.',
  },
  {
    sectionId: 'revenue-intelligence',
    Icon: TrendingUp,
    label: 'Pipeline Analytics',
    hook: 'Deal risk visible before forecast review.',
  },
  {
    sectionId: 'performance-analytics',
    Icon: GitMerge,
    label: 'Transfer Gap',
    hook: 'Measure and close the gap between training and live.',
  },
  {
    sectionId: 'coaching-feedback',
    Icon: Users,
    label: 'Coaching & Feedback',
    hook: 'Consistent coaching at the speed of your pipeline.',
  },
  {
    sectionId: 'crm-integrations',
    Icon: BookOpen,
    label: 'CRM & Integrations',
    hook: 'Revenue data that flows. Automatically.',
  },
];

export default function FeatureGrid() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-bg-canvas">
        {tiles.map(({ sectionId, Icon, label, hook }) => (
          <button
            key={sectionId}
            onClick={() => scrollTo(sectionId)}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <GlowingStarsBackgroundCard className="h-full cursor-pointer hover:border-accent/40 transition-colors">
              <div className="flex flex-col gap-2">
                <Icon size={28} className="text-accent mb-1" />
                <p className="text-[10px] uppercase tracking-[0.15em] text-accent label-os">
                  {label}
                </p>
                <p
                  className="text-sm text-text-muted leading-relaxed"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
                >
                  {hook}
                </p>
              </div>
            </GlowingStarsBackgroundCard>
          </button>
        ))}
      </div>
    </section>
  );
}
