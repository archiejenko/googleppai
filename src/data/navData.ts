export interface NavItem {
  title: string;
  href: string;
  description: string;
}

export const productItems: NavItem[] = [
  {
    title: 'Features',
    href: '/features',
    description: 'Everything OAST can do for your team.',
  },
  {
    title: 'Pricing',
    href: '/pricing',
    description: 'Simple plans. No surprises.',
  },
  {
    title: 'Roadmap',
    href: '/roadmap',
    description: "See what we're building next.",
  },
];

export const platformItems: NavItem[] = [
  {
    title: 'Revenue Intelligence',
    href: '/features#revenue',
    description: 'Deal health scoring and pipeline signals.',
  },
  {
    title: 'Meeting Intelligence',
    href: '/features#meetings',
    description: 'Auto-transcribe, score, and coach every call.',
  },
  {
    title: 'Live Coaching',
    href: '/features#live-coaching',
    description: 'Real-time AI guidance during active calls.',
  },
  {
    title: 'Pipeline Analytics',
    href: '/features#analytics',
    description: 'Forecast risk and conversion trends.',
  },
];

export const companyItems: NavItem[] = [
  {
    title: 'About',
    href: '/about-us',
    description: 'How OAST was built and why.',
  },
  {
    title: 'Careers',
    href: '/careers',
    description: 'Join a small team building big things.',
  },
  {
    title: 'Blog',
    href: '/insights',
    description: 'Tactics and insights for sales teams.',
  },
];
