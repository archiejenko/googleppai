// Placeholder logo slots — replace each entry with a real <img> or SVG once logos are confirmed.
// Request permission from each customer before displaying their logo publicly.
const PLACEHOLDER_SLOTS = 5;

function LogoPlaceholder({ index }: { index: number }) {
  // Each slot has a slightly different "width" so the row looks varied rather than robotic
  const widths = [108, 120, 96, 114, 102];
  const w = widths[index % widths.length];

  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: `${w}px`,
        height: '32px',
        background: 'var(--mkt-bg-elevated)',
        border: '1px solid var(--mkt-border)',
        borderRadius: 0,
        opacity: 0.55,
      }}
      aria-hidden="true"
    >
      <span
        className="text-[9px] uppercase tracking-[0.2em]"
        style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
      >
        Logo
      </span>
    </div>
  );
}

export default function SocialProofBar() {
  return (
    <div
      className="py-8"
      style={{
        background: 'var(--mkt-bg-surface)',
        borderTop: '1px solid var(--mkt-border)',
        borderBottom: '1px solid var(--mkt-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 flex-wrap">
          <p
            className="text-sm whitespace-nowrap flex-shrink-0"
            style={{
              color: 'var(--mkt-text-muted)',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 400,
            }}
          >
            Trusted by Revenue Leaders at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {Array.from({ length: PLACEHOLDER_SLOTS }, (_, i) => (
              <LogoPlaceholder key={i} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
