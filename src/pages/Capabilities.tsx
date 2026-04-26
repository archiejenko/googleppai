import { useState } from 'react';

const GROUPS = [
  {
    title: 'Training & Practice',
    subtitle: 'AI-powered practice environments',
    color: '#FF6B6B',
    dimBg: 'rgba(255,107,107,0.12)',
    tag: 'Core',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    features: [
      { name: 'Pre-Call Simulation', desc: 'Realistic AI-powered practice calls with dynamic voice personas. Reps practice cold calls, discovery, negotiation, and closing scenarios against AI buyers that adapt in real-time.', tag: 'Category Defining', tagColor: '#FF6B6B', tagBg: 'rgba(255,107,107,0.12)' },
      { name: 'Skill Drills', desc: 'Targeted micro-exercises for specific skill dimensions. Objection handling, rapport building, discovery questioning, and more. Adaptive difficulty scales to each rep.' },
      { name: 'Voice Personas', desc: 'Choose from multiple AI buyer personas with distinct communication styles, objection patterns, and industry knowledge. Configure difficulty and personality.' },
      { name: 'Session Recording & Replay', desc: 'Every practice session is recorded and scored. Reps can replay sessions, review AI feedback, and track improvement over time.' },
    ],
  },
  {
    title: 'Coaching & Development',
    subtitle: 'AI coaching personas',
    color: '#4ADE80',
    dimBg: 'rgba(74,222,128,0.12)',
    tag: 'Core',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    features: [
      { name: 'Morgan AI Coach', desc: 'Relationship intelligence persona (GPT-4o). Analyses patterns across sessions, identifies coaching opportunities, and delivers personalised development recommendations.' },
      { name: 'Alex AI Coach', desc: 'Volume coaching persona (GPT-4o-mini). Handles high-frequency feedback, drill recommendations, and daily performance nudges to keep reps engaged.' },
      { name: 'Journey & Levelling', desc: 'Structured progression through 5 skill levels. Each level unlocks new scenarios, harder drills, and advanced coaching. Clear path from onboarding to elite.' },
      { name: 'Goals & Milestones', desc: 'Set individual and team targets. Track progress against OKRs. AI suggests goals based on performance data and Transfer Gap analysis.' },
    ],
  },
  {
    title: 'Analytics & Intelligence',
    subtitle: 'Data-driven insights',
    color: '#60A5FA',
    dimBg: 'rgba(96,165,250,0.12)',
    tag: 'Core',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    features: [
      { name: 'Transfer Gap Analysis', desc: 'The north star metric. Correlates training scores with live call performance across 6 skill dimensions. Shows exactly where skills break down under pressure.', tag: 'North Star Metric', tagColor: '#FF6B6B', tagBg: 'rgba(255,107,107,0.12)' },
      { name: 'Training Analytics', desc: 'Session trends, score distributions, engagement heatmaps, scenario breakdowns. Deep dive into how, when, and what your team is training on.' },
      { name: 'Team Insights', desc: 'AI-generated coaching recommendations. Pattern detection across the team. Identifies who needs intervention and who’s ready to level up.' },
      { name: 'Leaderboards & Gamification', desc: 'Competitive rankings, streak tracking, weekly challenges, and achievement badges. Drives consistent training engagement across the team.' },
    ],
  },
  {
    title: 'Revenue Intelligence',
    subtitle: 'Deal and pipeline analytics',
    color: '#A78BFA',
    dimBg: 'rgba(167,139,250,0.12)',
    tag: 'Upgrade',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    features: [
      { name: 'Win/Loss Engine', desc: 'Analyse won and lost deals against rep behaviour, objection handling, and skill scores. Identify the patterns that predict deal outcomes.', tag: 'Series A Proof Point', tagColor: '#A78BFA', tagBg: 'rgba(167,139,250,0.12)' },
      { name: 'Meeting Intelligence', desc: 'Automatic meeting transcription, scoring, and action item extraction. Exclusive to Revenue Intelligence tier.' },
      { name: 'Pipeline Analytics', desc: 'Deal health scoring, pipeline coverage analysis, and revenue forecasting powered by real call data rather than CRM guesswork.' },
      { name: 'Revenue Forecasting', desc: 'AI-driven revenue projections based on rep performance, deal health, and historical conversion patterns. Updated in real-time.' },
    ],
  },
  {
    title: 'Team & Administration',
    subtitle: 'Manage your organisation',
    color: '#FBBF24',
    dimBg: 'rgba(251,191,36,0.12)',
    tag: 'All Tiers',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    features: [
      { name: 'Team Management', desc: 'Manage reps, assign roles, track onboarding status, and monitor team health metrics from a single dashboard.' },
      { name: 'Schedule & Calendar', desc: 'Coordinate training sessions, coaching 1:1s, and team meetings. Integrated calendar view with availability management.' },
      { name: 'Notifications & Inbox', desc: 'System alerts, coaching notes, achievement notifications, and team announcements in a unified inbox.' },
      { name: 'Audit Log & Compliance', desc: 'Full event logging for compliance. Track every login, session, data export, and settings change with timestamps and IP addresses.' },
    ],
  },
];

const TIER_ROWS = [
  { feature: 'Pre-Call Simulation', perf: true, intel: true, ready: true },
  { feature: 'Skill Drills', perf: true, intel: true, ready: true },
  { feature: 'Transfer Gap Tracking', perf: true, intel: true, ready: true },
  { feature: 'AI Coaching (Morgan + Alex)', perf: true, intel: true, ready: true },
  { feature: 'Leaderboards & Gamification', perf: true, intel: true, ready: true },
  { feature: 'Meeting Intelligence', perf: false, intel: true, ready: true },
  { feature: 'Win/Loss Engine', perf: false, intel: true, ready: true },
  { feature: 'Pipeline Analytics', perf: false, intel: true, ready: true },
  { feature: 'Custom AI Personas', perf: false, intel: false, ready: true },
  { feature: 'SSO & SCIM', perf: false, intel: false, ready: true },
  { feature: 'Dedicated CSM', perf: false, intel: false, ready: true },
];

export default function Capabilities() {
  const [openIdx, setOpenIdx] = useState(0);

  const toggle = (i: number) => setOpenIdx(openIdx === i ? -1 : i);

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '64px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#FF6B6B', marginBottom: '12px' }}>
          PLATFORM
        </p>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '52px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', margin: '0 auto 16px', maxWidth: '640px', lineHeight: 1.05 }}>
          CAPABILITIES
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px', color: '#7d8a98', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
          Every tool your sales team needs to train smarter, coach better, and close the Transfer Gap between practice and live performance.
        </p>
      </section>

      {/* Accordion */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 64px' }}>
        {GROUPS.map((g, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={g.title} style={{ marginBottom: '12px' }}>
              {/* Header */}
              <button
                onClick={() => toggle(i)}
                style={{
                  width: '100%',
                  background: '#151c25',
                  border: '1px solid #1e2a38',
                  borderRadius: isOpen ? '12px 12px 0 0' : '12px',
                  borderBottomColor: isOpen ? 'transparent' : '#1e2a38',
                  padding: '24px 28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'border-radius 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: g.dimBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {g.icon}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '18px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9' }}>
                      {g.title}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#4a5567' }}>
                      {g.subtitle}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px', background: g.dimBg, color: g.color, fontFamily: "'DM Sans', sans-serif" }}>
                    {g.tag}
                  </span>
                  <span style={{ color: '#4a5567', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Body */}
              <div
                style={{
                  maxHeight: isOpen ? '2000px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease',
                }}
              >
                <div style={{
                  background: '#151c25',
                  border: '1px solid #1e2a38',
                  borderTop: 'none',
                  borderRadius: '0 0 12px 12px',
                  padding: '0 28px 28px',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '12px' }}>
                    {g.features.map((f) => (
                      <div key={f.name} style={{ background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: '8px', padding: '20px' }}>
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', marginBottom: '4px' }}>
                          {f.name}
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#7d8a98', lineHeight: 1.5 }}>
                          {f.desc}
                        </div>
                        {f.tag && (
                          <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px', background: f.tagBg, color: f.tagColor, fontFamily: "'DM Sans', sans-serif" }}>
                            {f.tag}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Tier Comparison Table */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#FF6B6B', marginBottom: '12px' }}>
            COMPARE
          </p>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '36px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9' }}>
            Feature Availability By Tier
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2a38' }}>
                <th style={{ fontFamily: "'Oswald', sans-serif", fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: '#4a5567', textAlign: 'left', padding: '12px 20px' }}>Feature</th>
                <th style={{ fontFamily: "'Oswald', sans-serif", fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: '#4a5567', textAlign: 'center', padding: '12px 20px' }}>Performance</th>
                <th style={{ fontFamily: "'Oswald', sans-serif", fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: '#FF6B6B', textAlign: 'center', padding: '12px 20px' }}>Intelligence</th>
                <th style={{ fontFamily: "'Oswald', sans-serif", fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: '#4a5567', textAlign: 'center', padding: '12px 20px' }}>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {TIER_ROWS.map((row) => (
                <tr
                  key={row.feature}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#7d8a98', padding: '12px 20px' }}>{row.feature}</td>
                  <td style={{ textAlign: 'center', padding: '12px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: row.perf ? '#4ADE80' : '#4a5567', fontWeight: row.perf ? 700 : 400 }}>{row.perf ? '✓' : '—'}</td>
                  <td style={{ textAlign: 'center', padding: '12px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: row.intel ? '#4ADE80' : '#4a5567', fontWeight: row.intel ? 700 : 400 }}>{row.intel ? '✓' : '—'}</td>
                  <td style={{ textAlign: 'center', padding: '12px 20px', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: row.ready ? '#4ADE80' : '#4a5567', fontWeight: row.ready ? 700 : 400 }}>{row.ready ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
