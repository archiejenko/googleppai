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

      <video
        className="max-w-3xl mx-auto w-full aspect-video object-cover"
        src="/hero_demo.mp4"
        poster="/assets/screenshots/hero_dashboard.png"
        autoPlay
        muted
        loop
        playsInline
        style={{ display: 'block' }}
      />
    </section>
  );
}
