import {
  Mic,
  Activity,
  TrendingUp,
  Video,
  BarChart2,
  MessageSquare,
  Database,
  type LucideIcon,
} from 'lucide-react';

export interface CapabilityCardData {
  icon: LucideIcon;
  title: string;
  description: string;
  hoverValue: string;
  tierBadge?: string;
}

export interface StatData {
  number: string;
  label: string;
}

export interface CapabilitySectionData {
  id: string;
  index: string;
  navLabel: string;
  dropdown: {
    label: string;
    description: string;
    icon: LucideIcon;
  };
  headline: string;
  roleValues: {
    rep: string;
    manager: string;
    leader: string;
  };
  cards: CapabilityCardData[];
  stats: StatData[];
  imageUrl: string;
  videoUrl?: string;
  deepDiveBullets: string[]; // max 3 items, each under 10 words
}

export const capabilitySections: CapabilitySectionData[] = [
  {
    id: 'call-training',
    index: '01',
    navLabel: 'Call Training',
    dropdown: {
      label: 'Call Training',
      description: 'Roleplay, drills, objection handling',
      icon: Mic,
    },
    headline: 'MASTER EVERY OBJECTION BEFORE IT COSTS YOU A DEAL',
    roleValues: {
      rep: 'Know your pitch cold before the call that counts',
      manager: 'See exactly where each rep breaks under pressure',
      leader: 'Compress ramp time without adding headcount',
    },
    cards: [
      {
        icon: Mic,
        title: 'ROI-Focused Objection Handling',
        description:
          'Pressure-test every rep on budget pushback, procurement resistance, and ROI challenges before they face them live.',
        hoverValue: 'Stop losing deals to objections you never practised.',
      },
      {
        icon: Mic,
        title: 'Procurement Resistance Modelling',
        description:
          'Simulate the full procurement cycle including legal, finance, and security gatekeepers — mapped to your real deal structures.',
        hoverValue: 'Every deal blocker rehearsed. None of them a surprise.',
      },
      {
        icon: Mic,
        title: 'Multi-Stakeholder Deal Simulation',
        description:
          'Run scenarios with competing priorities across champion, economic buyer, and technical evaluator — simultaneously.',
        hoverValue: 'Complex deals require complex rehearsal.',
      },
      {
        icon: Mic,
        title: 'Qualification Logic Validation',
        description:
          'Drill your qualification framework — MEDDIC, BANT, or custom — until every rep can execute it cold under pressure.',
        hoverValue: 'No more stalled pipeline from weak qualification.',
      },
    ],
    stats: [
      { number: '34%', label: 'Faster ramp' },
      { number: '3.2x', label: 'Objection win rate' },
      { number: '89%', label: 'Rep completion rate' },
    ],
    imageUrl: '/assets/screenshots/training_config.png',
    deepDiveBullets: [
      'Rehearse every objection before it costs a deal.',
      'Simulate procurement, legal, and finance blockers.',
      'Drill your methodology until reps execute it cold.',
    ],
  },
  {
    id: 'live-call-intelligence',
    index: '02',
    navLabel: 'Live Call Intelligence',
    dropdown: {
      label: 'Live Call Intelligence',
      description: 'Real-time scoring & in-call coaching',
      icon: Activity,
    },
    headline: 'KNOW YOUR CALL IS GOING OFF-TRACK BEFORE IT DOES',
    roleValues: {
      rep: 'Get real-time signals when a deal is slipping',
      manager: 'Coach every call without being in the room',
      leader: 'Pipeline risk surfaces before the forecast review',
    },
    cards: [
      {
        icon: Activity,
        title: 'Real-Time Talk Ratio Monitoring',
        description:
          'Live scoring of talk-to-listen ratio surfaced mid-call so reps self-correct before the conversation goes cold.',
        hoverValue: 'The best reps listen more than they talk.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: Activity,
        title: 'Live Coaching Nudges',
        description:
          'In-call prompts triggered by conversation signals — slow down, ask a question, address the objection — delivered without breaking flow.',
        hoverValue: 'A silent coach on every call.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: Activity,
        title: 'Engagement Scoring',
        description:
          'Track prospect engagement level in real time. Know when you\'ve lost the room and how to win it back.',
        hoverValue: 'Engagement drops before deals do.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: Activity,
        title: 'Post-Call Session Review',
        description:
          'Full call scoring delivered immediately after the session. Every metric. Every turning point. Coachable in minutes.',
        hoverValue: 'Make every call a coaching opportunity.',
      },
    ],
    stats: [
      { number: '2.4x', label: 'Deal save rate' },
      { number: '61%', label: 'Fewer lost calls' },
      { number: '100%', label: 'Call coverage' },
    ],
    imageUrl: '/assets/screenshots/simulation_new.png',
    deepDiveBullets: [
      'Real-time nudges keep every call on track.',
      'Engagement scoring flags when you lose the room.',
      'Post-call scoring delivered in minutes, not days.',
    ],
  },
  {
    id: 'revenue-intelligence',
    index: '03',
    navLabel: 'Revenue Intelligence',
    dropdown: {
      label: 'Revenue Intelligence',
      description: 'Pipeline risk, MEDDIC, deal health',
      icon: TrendingUp,
    },
    headline: 'YOUR PIPELINE TELLS A STORY. OAST READS IT FOR YOU.',
    roleValues: {
      rep: 'Know which deals to push and which to qualify out',
      manager: 'Spot sandbagging and stalled deals before they die',
      leader: 'Forecast with data, not gut feel',
    },
    cards: [
      {
        icon: TrendingUp,
        title: 'Missed Revenue Detection',
        description:
          'Surface deals with recovery signals before they close as lost. Quantify the revenue sitting in your stalled opportunities.',
        hoverValue: 'Revenue you thought was gone — often isn\'t.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: TrendingUp,
        title: 'Multi-Stage Deal Navigation',
        description:
          'Logic engine that maps each deal to the right stage gate and flags gaps in progression — before they become pipeline leakage.',
        hoverValue: 'Every deal has the right next move.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: TrendingUp,
        title: 'Prospect Intelligence Profiles',
        description:
          'Automated profiles built from call data, CRM signals, and engagement patterns. Know your buyer before you dial.',
        hoverValue: 'Context that turns cold calls warm.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: TrendingUp,
        title: 'Pipeline Health Snapshots',
        description:
          'Instant view of deal velocity, risk concentration, and coverage ratio. Formatted for the Monday forecast meeting.',
        hoverValue: 'Forecast confidence built on call data.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: TrendingUp,
        title: 'Transfer Gap Analysis',
        description:
          'Quantify the gap between training performance and live call execution. Identify which competencies degrade under real conditions.',
        hoverValue: 'Know exactly where training does not transfer to live.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: TrendingUp,
        title: 'Deal Correlation',
        description:
          'Correlate call quality scores and MEDDIC execution against won and lost deals. Surface which behaviours drive revenue outcomes.',
        hoverValue: 'Connect rep behaviour to deal results.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: TrendingUp,
        title: 'AI Revenue Coaching',
        description:
          'Personalised coaching plans generated from transfer gap scores, MEDDIC data, and win rate. Targeted recommendations per rep.',
        hoverValue: 'Coaching grounded in outcome data.',
        tierBadge: 'Revenue Intelligence',
      },
    ],
    stats: [
      { number: '2.1x', label: 'Pipeline visibility' },
      { number: '40%', label: 'Forecast accuracy lift' },
      { number: '100%', label: 'MEDDIC coverage' },
    ],
    imageUrl: '/assets/screenshots/hero_dashboard.png',
    deepDiveBullets: [
      'Surface stalled deals before they close as lost.',
      'Automated prospect profiles built from call signals.',
      'Pipeline health snapshots ready for Monday forecast.',
    ],
  },
  {
    id: 'meeting-intelligence',
    index: '04',
    navLabel: 'Meeting Intelligence',
    dropdown: {
      label: 'Meeting Intelligence',
      description: 'Auto-capture, transcripts, engagement scoring',
      icon: Video,
    },
    headline: 'EVERY MEETING. FULLY CAPTURED. INSTANTLY ACTIONABLE.',
    roleValues: {
      rep: 'Never lose a commitment made on a call again',
      manager: 'Review any meeting in minutes, not hours',
      leader: 'Understand what your buyers actually care about',
    },
    cards: [
      {
        icon: Video,
        title: 'Automatic Meeting Capture',
        description:
          'Every customer meeting recorded, transcribed, and structured without manual effort. Zero setup per call.',
        hoverValue: 'Nothing falls through the cracks.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: Video,
        title: 'AI Transcription & Summaries',
        description:
          'Full transcripts with speaker attribution and instant summaries highlighting key moments, objections, and next steps.',
        hoverValue: 'A 60-minute meeting reviewed in 6.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: Video,
        title: 'Engagement Scoring',
        description:
          'Score buyer engagement throughout the meeting — who spoke, when, and how the energy shifted. Know where you won and lost the room.',
        hoverValue: 'Engagement data that drives your next move.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: Video,
        title: 'Action Item Extraction',
        description:
          'Commitments, follow-ups, and blockers extracted automatically and pushed to CRM. No more post-call admin.',
        hoverValue: 'Every commitment tracked. None forgotten.',
        tierBadge: 'Revenue Intelligence',
      },
    ],
    stats: [
      { number: '100%', label: 'Meeting capture' },
      { number: '6 min', label: 'Avg review time' },
      { number: '0', label: 'Missed commitments' },
    ],
    imageUrl: '/assets/screenshots/dashboard_new.png',
    deepDiveBullets: [
      'Every meeting recorded and transcribed automatically.',
      'Instant summaries highlight objections and next steps.',
      'Action items pushed to CRM — zero manual entry.',
    ],
  },
  {
    id: 'performance-analytics',
    index: '05',
    navLabel: 'Performance Analytics',
    dropdown: {
      label: 'Performance Analytics',
      description: 'Benchmarking, goals, team trends',
      icon: BarChart2,
    },
    headline: 'BENCHMARK EVERY REP. CLOSE EVERY GAP.',
    roleValues: {
      rep: 'See where you rank and exactly what to fix',
      manager: 'Run 1:1s with data, not anecdotes',
      leader: 'Prove ROI on every training investment',
    },
    cards: [
      {
        icon: BarChart2,
        title: 'Real-Time Performance Analytics',
        description:
          'Live dashboards tracking every rep\'s performance metrics as they move through the training curriculum.',
        hoverValue: 'No more guessing who\'s ready.',
      },
      {
        icon: BarChart2,
        title: 'Rep Trajectory Tracking',
        description:
          'Week-over-week trajectory for every rep. Identify plateaus, regressions, and breakthroughs before they show up in quota attainment.',
        hoverValue: 'Catch the dip before the miss.',
      },
      {
        icon: BarChart2,
        title: 'Team Benchmarking',
        description:
          'Stack-rank every rep against team averages and top performers. Know the gap and close it with targeted drills.',
        hoverValue: 'Benchmarks that drive behaviour.',
      },
      {
        icon: BarChart2,
        title: 'Goal Attainment Tracking',
        description:
          'Daily progress against training and sales targets. Reps know where they stand. Managers know who needs help.',
        hoverValue: 'Goals that are tracked get hit.',
      },
    ],
    stats: [
      { number: 'Live', label: 'Rep ranking' },
      { number: 'Daily', label: 'Goal attainment tracked' },
      { number: 'Weekly', label: 'Team gaps surfaced' },
    ],
    imageUrl: '/assets/screenshots/analytics_new.png',
    deepDiveBullets: [
      'Live rep rankings updated with every training session.',
      'Identify plateaus and regressions before quota misses.',
      'Stack-rank against top performers and close the gap.',
    ],
  },
  {
    id: 'coaching-feedback',
    index: '06',
    navLabel: 'Coaching & Feedback',
    dropdown: {
      label: 'Coaching & Feedback',
      description: 'AI digests, manager insights, session reviews',
      icon: MessageSquare,
    },
    headline: 'CONSISTENT COACHING AT THE SPEED OF YOUR PIPELINE',
    roleValues: {
      rep: 'Get a personal coach that never misses a session',
      manager: 'Deliver consistent coaching at scale',
      leader: 'Build a culture of improvement without burning out managers',
    },
    cards: [
      {
        icon: MessageSquare,
        title: 'AI Coaching Digests',
        description:
          'Automated weekly digest for each rep: what improved, what regressed, and exactly what to work on next.',
        hoverValue: 'Coaching that never drops the ball.',
      },
      {
        icon: MessageSquare,
        title: 'Playbook & Framework Injection',
        description:
          'Your MEDDIC, SPIN, or custom sales framework baked into every drill, every review, and every coaching recommendation.',
        hoverValue: 'Your methodology. Their muscle memory.',
      },
      {
        icon: MessageSquare,
        title: 'Manager Coaching Insights',
        description:
          'Manager-facing views showing which reps need attention, what to focus on, and how recent coaching is tracking over time.',
        hoverValue: 'Coach with data. Not instinct.',
      },
      {
        icon: MessageSquare,
        title: 'Session Review & Scoring',
        description:
          'Every training session scored across multiple dimensions. Managers review in minutes, not hours.',
        hoverValue: 'More coaching. Less admin.',
      },
    ],
    stats: [
      { number: '5x', label: 'More coaching touchpoints' },
      { number: '0', label: 'Sessions missed' },
      { number: '3hr', label: 'Manager time saved/week' },
    ],
    imageUrl: '/assets/screenshots/learning_path.png',
    videoUrl: '/assets/training-preview.mp4',
    deepDiveBullets: [
      'Automated weekly digest for every rep, every week.',
      'Your sales framework baked into every recommendation.',
      'Manager insights show who needs attention and why.',
    ],
  },
  {
    id: 'crm-integrations',
    index: '07',
    navLabel: 'CRM & Integrations',
    dropdown: {
      label: 'CRM & Integrations',
      description: 'HubSpot, Salesforce, outcome correlation',
      icon: Database,
    },
    headline: 'REVENUE DATA THAT FLOWS. AUTOMATICALLY.',
    roleValues: {
      rep: 'Your CRM updates itself',
      manager: 'Clean pipeline data without chasing reps',
      leader: 'Connect OAST signal to revenue outcomes in HubSpot or Salesforce',
    },
    cards: [
      {
        icon: Database,
        title: 'HubSpot Integration',
        description:
          'Two-way sync with HubSpot. Call data, training scores, and deal signals pushed automatically. CRM stays clean without rep effort.',
        hoverValue: 'The CRM reps actually keep up to date.',
      },
      {
        icon: Database,
        title: 'Salesforce Integration',
        description:
          'Native Salesforce connector syncing OAST performance data to opportunity records, contact timelines, and activity logs.',
        hoverValue: 'Salesforce enriched with every call signal.',
      },
      {
        icon: Database,
        title: 'Outcome Correlation',
        description:
          'Map OAST training metrics directly to closed/won rate, average deal size, and cycle length. Prove the ROI with your own data.',
        hoverValue: 'Training investment proven in pipeline terms.',
        tierBadge: 'Revenue Intelligence',
      },
      {
        icon: Database,
        title: 'Automated CRM Updates',
        description:
          'Contact notes, follow-up tasks, and deal stage changes written to CRM from every call. Zero manual data entry.',
        hoverValue: 'Hours of admin. Reclaimed.',
      },
    ],
    stats: [
      { number: '100%', label: 'Auto-sync' },
      { number: '0', label: 'Manual CRM updates' },
      { number: '2', label: 'CRMs supported' },
    ],
    imageUrl: '/assets/screenshots/team_overview.png',
    deepDiveBullets: [
      'Two-way HubSpot and Salesforce sync, zero rep effort.',
      'Call data and training scores pushed to opportunity records.',
      'Prove training ROI directly in your pipeline data.',
    ],
  },
];
