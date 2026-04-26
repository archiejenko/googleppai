const TAG_COLORS: Record<string, { color: string; bg: string }> = {
  coral: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
  green: { color: '#4ADE80', bg: 'rgba(74,222,128,0.12)' },
  blue: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  amber: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  purple: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
};

function Tag({ label, variant }: { label: string; variant: string }) {
  const c = TAG_COLORS[variant] || TAG_COLORS.coral;
  return (
    <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '4px', background: c.bg, color: c.color, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>
      {label}
    </span>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#7d8a98' }}>{label}</span>
      <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '16px', fontWeight: 600, color: color || '#c9d1d9' }}>{value}</span>
    </div>
  );
}

interface StepData {
  num: number;
  color: string;
  nextColor?: string;
  title: string;
  desc: string;
  tags: { label: string; variant: string }[];
}

function JourneyStep({ step, isLast }: { step: StepData; isLast: boolean }) {
  const dimBg = TAG_COLORS[Object.keys(TAG_COLORS).find(k => TAG_COLORS[k].color === step.color) || 'coral']?.bg || 'rgba(255,107,107,0.12)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%', background: dimBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Oswald', sans-serif", fontSize: '16px', fontWeight: 700, color: step.color, flexShrink: 0,
        }}>
          {step.num}
        </div>
        {!isLast && step.nextColor && (
          <div style={{ width: '2px', flex: 1, minHeight: '40px', background: `linear-gradient(to bottom, ${step.color}, ${step.nextColor})` }} />
        )}
      </div>
      <div style={{ background: '#151c25', border: '1px solid #1e2a38', borderRadius: '12px', padding: '24px' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', marginBottom: '8px' }}>
          {step.title}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#7d8a98', lineHeight: 1.6, marginBottom: '12px' }}>
          {step.desc}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {step.tags.map(t => <Tag key={t.label} label={t.label} variant={t.variant} />)}
        </div>
      </div>
    </div>
  );
}

const BDR_STEPS: StepData[] = [
  { num: 1, color: '#FF6B6B', nextColor: '#FBBF24', title: 'Morning Warm-Up', desc: "Start the day with a 5-minute drill targeting your weakest skill from yesterday's calls. Alex AI suggests the drill based on your Transfer Gap data. No guessing what to practice.", tags: [{ label: 'Drills', variant: 'coral' }, { label: 'Alex AI', variant: 'green' }] },
  { num: 2, color: '#FBBF24', nextColor: '#60A5FA', title: 'Pre-Call Simulation', desc: "Before a high-value call, run a simulation against an AI buyer matching your prospect's industry and objection profile. Practice your opener, discovery, and closing in a safe environment.", tags: [{ label: 'Pre-Call Sim', variant: 'coral' }, { label: 'Voice Persona', variant: 'blue' }] },
  { num: 3, color: '#60A5FA', nextColor: '#4ADE80', title: 'Live Call Execution', desc: "Make the real call. OAST's live scoring engine tracks your performance in real-time across 6 skill dimensions, comparing it against your training scores.", tags: [{ label: 'Live Scores', variant: 'green' }, { label: 'Transfer Gap', variant: 'amber' }] },
  { num: 4, color: '#4ADE80', title: 'Review & Level Up', desc: 'After calls, review your Transfer Gap. Morgan AI delivers coaching insights, highlights patterns across sessions, and updates your development roadmap. Your leaderboard position updates automatically.', tags: [{ label: 'Morgan AI', variant: 'green' }, { label: 'Insights', variant: 'purple' }, { label: 'Leaderboard', variant: 'amber' }] },
];

const BDM_STEPS: StepData[] = [
  { num: 1, color: '#60A5FA', nextColor: '#FBBF24', title: 'Deal Preparation', desc: "Before a demo or negotiation, simulate the conversation with an AI buyer configured to match your prospect's objection patterns, deal size, and stakeholder dynamics.", tags: [{ label: 'Pre-Call Sim', variant: 'blue' }, { label: 'Accounts', variant: 'amber' }] },
  { num: 2, color: '#FBBF24', nextColor: '#4ADE80', title: 'Meeting Intelligence', desc: 'Live meetings are transcribed, scored, and analysed automatically. Key topics, objections raised, and action items are extracted without manual note-taking.', tags: [{ label: 'Revenue Intel', variant: 'purple' }, { label: 'Meetings', variant: 'green' }] },
  { num: 3, color: '#4ADE80', title: 'Pipeline Coaching', desc: 'Morgan AI analyses your pipeline and identifies deals where your skill gaps (closing, negotiation, objection handling) are most likely to cost you. Targeted coaching recommendations for each deal.', tags: [{ label: 'Morgan AI', variant: 'green' }, { label: 'Win/Loss', variant: 'coral' }] },
];

const SD_STEPS: StepData[] = [
  { num: 1, color: '#A78BFA', nextColor: '#60A5FA', title: 'Morning Dashboard Review', desc: "Open the dashboard to see team health at a glance. Who trained yesterday, who didn't. Which reps' Transfer Gaps are widening. Which skills are dragging down pipeline. All without a single 1:1.", tags: [{ label: 'Dashboard', variant: 'purple' }, { label: 'Transfer Gap', variant: 'amber' }] },
  { num: 2, color: '#60A5FA', nextColor: '#FF6B6B', title: 'Coaching Interventions', desc: "AI flags reps who need intervention before you even notice. 'R. Thompson completed only 3 sessions in 14 days.' 'M. Chen's objection handling dropped 12%.' Precise, data-driven coaching prompts.", tags: [{ label: 'Insights', variant: 'green' }, { label: 'Coaching', variant: 'coral' }] },
  { num: 3, color: '#FF6B6B', title: 'Revenue Forecasting', desc: "Pipeline analytics powered by real call data, not CRM self-reporting. Win/Loss Engine shows which deals are at risk based on rep behaviour, not gut feel. Board-ready reporting on training ROI.", tags: [{ label: 'Revenue Intel', variant: 'purple' }, { label: 'Win/Loss', variant: 'green' }, { label: 'Analytics', variant: 'amber' }] },
];

function PersonaSection({
  avatarBg, avatarColor, avatarLabel, fullTitle, role, bio, metrics, steps,
}: {
  avatarBg: string; avatarColor: string; avatarLabel: string; fullTitle: string; role: string; bio: string;
  metrics: { label: string; value: string; color?: string }[];
  steps: StepData[];
}) {
  return (
    <div>
      {/* Header grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center', marginBottom: '48px' }}>
        <div>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Oswald', sans-serif", fontSize: '20px', fontWeight: 700, color: avatarColor, marginBottom: '16px' }}>
            {avatarLabel}
          </div>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '32px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', marginBottom: '8px' }}>{fullTitle}</h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#4a5567', marginBottom: '12px' }}>{role}</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#7d8a98', lineHeight: 1.6 }}>{bio}</p>
        </div>
        <div style={{ background: '#151c25', border: '1px solid #1e2a38', borderRadius: '12px', padding: '28px' }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: '#4a5567', marginBottom: '12px' }}>
            Key Metrics You'll Track
          </div>
          {metrics.map(m => <MetricRow key={m.label} {...m} />)}
        </div>
      </div>

      {/* Journey steps */}
      <div>
        {steps.map((s, i) => <JourneyStep key={s.title} step={s} isLast={i === steps.length - 1} />)}
      </div>
    </div>
  );
}

export default function UserJourney() {
  return (
    <div style={{ background: '#0d1117', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '64px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#FF6B6B', marginBottom: '12px' }}>
          USER JOURNEY
        </p>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '52px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', margin: '0 auto 16px', maxWidth: '640px', lineHeight: 1.05 }}>
          ONE PLATFORM. THREE PERSPECTIVES.
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px', color: '#7d8a98', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
          Whether you're a BDR making calls, a BDM managing relationships, or a Sales Director leading the floor, OAST adapts to how you work.
        </p>
      </section>

      {/* Persona tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingBottom: '48px' }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, padding: '10px 24px', borderRadius: '6px', border: '1px solid #FF6B6B', background: 'rgba(255,107,107,0.12)', color: '#FF6B6B' }}>BDR</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, padding: '10px 24px', borderRadius: '6px', border: '1px solid #60A5FA', background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>BDM</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, padding: '10px 24px', borderRadius: '6px', border: '1px solid #A78BFA', background: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>Sales Director</span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px' }}>
        {/* BDR */}
        <PersonaSection
          avatarBg="rgba(255,107,107,0.12)" avatarColor="#FF6B6B" avatarLabel="BDR"
          fullTitle="BUSINESS DEVELOPMENT REPRESENTATIVE"
          role="The frontline. Making calls, booking meetings, building pipeline."
          bio="You spend your day dialling, handling objections, and trying to book qualified meetings. OAST gives you a private practice environment where you can sharpen specific skills, get instant AI feedback, and track your improvement against the metrics that actually matter on live calls."
          metrics={[
            { label: 'Training Score', value: '84%', color: '#4ADE80' },
            { label: 'Transfer Gap', value: '27%', color: '#FF6B6B' },
            { label: 'Objection Handle Rate', value: '64%', color: '#FBBF24' },
            { label: 'Training Streak', value: '12 days' },
            { label: 'Leaderboard Rank', value: '#3', color: '#FF6B6B' },
          ]}
          steps={BDR_STEPS}
        />

        {/* BDM */}
        <div style={{ borderTop: '1px solid #1e2a38', paddingTop: '48px', marginTop: '48px' }}>
          <PersonaSection
            avatarBg="rgba(96,165,250,0.12)" avatarColor="#60A5FA" avatarLabel="BDM"
            fullTitle="BUSINESS DEVELOPMENT MANAGER"
            role="The closer. Managing pipeline, running demos, negotiating deals."
            bio="Your deals are complex, multi-stakeholder, and high-value. OAST helps you prepare for every meeting with simulation, track your deal execution skills, and get AI-driven coaching on where your live performance diverges from what you know."
            metrics={[
              { label: 'Win Rate', value: '38%', color: '#4ADE80' },
              { label: 'Deal Velocity', value: '24 days', color: '#60A5FA' },
              { label: 'Discovery Score', value: '72%', color: '#FBBF24' },
              { label: 'Closing Transfer Gap', value: '31%', color: '#FF6B6B' },
              { label: 'Pipeline Coverage', value: '2.4x' },
            ]}
            steps={BDM_STEPS}
          />
        </div>

        {/* Sales Director */}
        <div style={{ borderTop: '1px solid #1e2a38', paddingTop: '48px', marginTop: '48px' }}>
          <PersonaSection
            avatarBg="rgba(167,139,250,0.12)" avatarColor="#A78BFA" avatarLabel="SD"
            fullTitle="SALES DIRECTOR"
            role="The leader. Team performance, pipeline health, revenue forecasting."
            bio="You need visibility into team performance without micromanaging. OAST gives you dashboards that surface exactly who needs coaching, what skills are dragging down pipeline, and whether training investment is translating into revenue."
            metrics={[
              { label: 'Team Transfer Gap', value: '27%', color: '#FF6B6B' },
              { label: 'Training ROI', value: '2.8x', color: '#4ADE80' },
              { label: 'Pipeline Value', value: '£482K' },
              { label: 'Team Win Rate', value: '34%', color: '#FBBF24' },
              { label: 'Reps At Risk', value: '2', color: '#FF6B6B' },
            ]}
            steps={SD_STEPS}
          />
        </div>
      </div>
    </div>
  );
}
