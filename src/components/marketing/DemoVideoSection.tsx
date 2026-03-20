export default function DemoVideoSection() {
  return (
    <section
      id="demo-video"
      className="py-24 px-6"
      style={{ background: 'var(--mkt-bg-canvas)' }}
    >
      {/* Section header */}
      <div className="text-center mb-12">
        <p
          className="text-xs font-mono uppercase tracking-[0.25em] mb-4"
          style={{ color: 'var(--mkt-accent)', fontFamily: 'DM Sans, sans-serif' }}
        >
          See OAST In Action
        </p>
        <h2
          className="text-4xl md:text-5xl uppercase tracking-tight text-white"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 700 }}
        >
          Watch How It Works
        </h2>
      </div>

      {/* Video placeholder box */}
      <div
        className="max-w-3xl mx-auto flex flex-col items-center justify-center aspect-video"
        style={{
          border: '2px dashed var(--mkt-accent)',
          borderRadius: 0,
          background: 'rgba(255,107,107,0.03)',
        }}
      >
        {/* Play icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-6 opacity-80"
        >
          <circle cx="32" cy="32" r="31" stroke="var(--mkt-accent)" strokeWidth="2" />
          <polygon
            points="26,20 26,44 46,32"
            fill="var(--mkt-accent)"
          />
        </svg>

        <p
          className="text-xl md:text-2xl text-white uppercase tracking-[0.12em] mb-3"
          style={{ fontFamily: 'Oswald, sans-serif', fontWeight: 600 }}
        >
          Product Demo — Coming Soon
        </p>
        <p
          className="text-sm max-w-xs text-center leading-relaxed"
          style={{ color: 'var(--mkt-text-muted)', fontFamily: 'DM Sans, sans-serif' }}
        >
          We'll show you exactly how OAST closes the transfer gap.
        </p>
      </div>
    </section>
  );
}
