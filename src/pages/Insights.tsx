import { useState } from 'react';

const FILTERS = ['All', 'Transfer Gap', 'Coaching', 'Revenue Ops', 'Product', 'Case Studies'];

const FEATURED = {
  tag: 'Research',
  tagColor: '#FF6B6B',
  tagBg: 'rgba(255,107,107,0.12)',
  title: "The Transfer Gap: Why Sales Training Doesn't Translate to Revenue",
  excerpt: "Most sales training platforms measure knowledge. But knowledge isn't execution. We analysed 10,000 training sessions and their corresponding live calls to quantify the gap between what reps know and what they do.",
  meta: '12 min read · April 2026 · OAST Research Team',
  gradient: 'linear-gradient(135deg, rgba(255,107,107,0.12), rgba(74,222,128,0.08))',
  watermark: 'TRANSFER GAP',
};

const ARTICLES = [
  { gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.1))', watermark: 'AI COACHING', tagColor: '#60A5FA', tagBg: 'rgba(96,165,250,0.12)', tag: 'Coaching', title: 'AI Coaching vs. Human Coaching: A Framework for When to Use Each', excerpt: 'AI coaches like Morgan and Alex handle volume and consistency. But human coaches bring empathy and context. Here\'s how to structure a hybrid coaching programme.', meta: '8 min · March 2026' },
  { gradient: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(251,191,36,0.1))', watermark: 'METRICS', tagColor: '#4ADE80', tagBg: 'rgba(74,222,128,0.12)', tag: 'Transfer Gap', title: '5 Metrics That Matter More Than Training Completion Rate', excerpt: 'Completion rate is vanity. Transfer Gap, skill dimension breakdowns, and live call correlation are the metrics that predict revenue impact from training.', meta: '6 min · March 2026' },
  { gradient: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(255,107,107,0.1))', watermark: 'CASE STUDY', tagColor: '#FBBF24', tagBg: 'rgba(251,191,36,0.12)', tag: 'Revenue Ops', title: 'Cutting New Hire Ramp Time by 60%: A Case Study', excerpt: 'How a 15-person SaaS sales team used OAST to get new hires to quota-carrying performance in 6 weeks instead of 14.', meta: '10 min · February 2026' },
  { gradient: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(96,165,250,0.1))', watermark: 'REVENUE', tagColor: '#A78BFA', tagBg: 'rgba(167,139,250,0.12)', tag: 'Product', title: 'Introducing the Revenue Intelligence Layer', excerpt: "Win/Loss Engine, Meeting Intelligence, and Pipeline Analytics. A deep dive into OAST's upgrade tier and why we built it.", meta: '7 min · February 2026' },
  { gradient: 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(251,191,36,0.1))', watermark: 'OBJECTIONS', tagColor: '#FF6B6B', tagBg: 'rgba(255,107,107,0.12)', tag: 'Coaching', title: 'The Objection Handling Framework That Actually Works on Live Calls', excerpt: 'Training reps on objection handling is easy. Getting them to execute under pressure is the hard part. Here\'s a framework built on Transfer Gap data.', meta: '9 min · January 2026' },
  { gradient: 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(34,211,238,0.1))', watermark: 'ROI', tagColor: '#4ADE80', tagBg: 'rgba(74,222,128,0.12)', tag: 'Case Study', title: 'How to Calculate the ROI of Sales Training (With Real Numbers)', excerpt: 'Stop justifying training spend with anecdotes. Here\'s a data-driven framework for measuring training ROI using Transfer Gap and win rate correlation.', meta: '11 min · January 2026' },
];

export default function Insights() {
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ paddingTop: '120px', paddingBottom: '48px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Oswald', sans-serif", fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#FF6B6B', marginBottom: '12px' }}>
          RESOURCES
        </p>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '52px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', margin: '0 auto 16px', maxWidth: '640px', lineHeight: 1.05 }}>
          INSIGHTS
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '16px', color: '#7d8a98', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
          Research, frameworks, and practical advice on sales training, coaching, and revenue operations.
        </p>
      </section>

      {/* Filter pills */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 24px 48px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: '6px',
              border: f === activeFilter ? '1px solid #FF6B6B' : '1px solid #1e2a38',
              background: f === activeFilter ? 'rgba(255,107,107,0.12)' : '#151c25',
              color: f === activeFilter ? '#FF6B6B' : '#7d8a98',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Featured post */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ background: '#151c25', border: '1px solid #1e2a38', borderRadius: '12px', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ background: FEATURED.gradient, minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '48px', fontWeight: 700, color: 'rgba(255,107,107,0.2)' }}>{FEATURED.watermark}</span>
          </div>
          <div style={{ padding: '40px' }}>
            <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px', background: FEATURED.tagBg, color: FEATURED.tagColor, fontFamily: "'DM Sans', sans-serif", marginBottom: '16px' }}>
              {FEATURED.tag}
            </span>
            <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '28px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', marginBottom: '12px', lineHeight: 1.15 }}>
              {FEATURED.title}
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#7d8a98', lineHeight: 1.6, marginBottom: '16px' }}>
              {FEATURED.excerpt}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#4a5567', marginBottom: '16px' }}>
              {FEATURED.meta}
            </p>
            <a href="#" style={{ color: '#FF6B6B', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              Read Article →
            </a>
          </div>
        </div>
      </div>

      {/* 6-card grid */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {ARTICLES.map((a) => (
            <div
              key={a.title}
              style={{ background: '#151c25', border: '1px solid #1e2a38', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#253345'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a38'; }}
            >
              <div style={{ height: '160px', background: a.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.08)' }}>{a.watermark}</span>
              </div>
              <div style={{ padding: '24px' }}>
                <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', padding: '3px 10px', borderRadius: '4px', background: a.tagBg, color: a.tagColor, fontFamily: "'DM Sans', sans-serif", marginBottom: '10px' }}>
                  {a.tag}
                </span>
                <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '17px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', marginBottom: '8px', lineHeight: 1.2 }}>
                  {a.title}
                </h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: '#7d8a98', lineHeight: 1.5, marginBottom: '10px' }}>
                  {a.excerpt}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: '#4a5567' }}>
                  {a.meta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <section style={{ background: '#111820', padding: '80px 48px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: '28px', fontWeight: 600, textTransform: 'uppercase', color: '#c9d1d9', marginBottom: '12px' }}>
            STAY SHARP
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: '#7d8a98', lineHeight: 1.6, marginBottom: '24px' }}>
            Get OAST insights delivered to your inbox. Research, frameworks, and product updates. No spam, unsubscribe anytime.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              placeholder="you@company.com"
              style={{
                flex: 1,
                background: '#151c25',
                border: '1px solid #1e2a38',
                borderRadius: '6px',
                padding: '10px 14px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#c9d1d9',
                outline: 'none',
              }}
            />
            <button
              style={{
                background: '#FF6B6B',
                color: '#fff',
                borderRadius: '6px',
                border: 'none',
                padding: '10px 20px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
