import { Link } from 'react-router-dom';

interface Props {
  firstSectionId: string;
}

export default function CapabilitiesHero({ firstSectionId }: Props) {
  const scrollToFirst = () => {
    const el = document.getElementById(firstSectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative z-10 pt-16 pb-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-white/[0.06]">
      <p className="text-[10px] uppercase tracking-[0.2em] text-accent label-os mb-6">
        OAST — Platform Capabilities
      </p>

      <h1 className="text-5xl md:text-7xl lg:text-8xl uppercase leading-[0.9] tracking-tighter text-text-primary mb-6 max-w-5xl">
        Everything your revenue team needs.
      </h1>

      <p
        className="text-lg text-text-secondary max-w-xl mb-12"
        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}
      >
        Seven integrated modules. From first rehearsal to live call to closed deal.
      </p>

      <div className="flex flex-wrap gap-4 items-center mb-10">
        <button
          onClick={scrollToFirst}
          className="px-8 py-3 text-[12px] uppercase tracking-[0.12em] border border-white/20 text-text-secondary hover:border-white/40 hover:text-text-primary transition-colors duration-150"
        >
          Explore Capabilities ↓
        </button>
        <Link
          to="/register"
          className="px-8 py-3 text-[12px] uppercase tracking-[0.12em] bg-accent text-white shadow-[6px_6px_0px_0px_rgba(255,107,107,0.3)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-150"
        >
          Book Demo →
        </Link>
      </div>

      <div className="flex gap-4">
        <span className="text-[10px] border border-accent text-accent px-3 py-1 label-os tracking-[0.08em]">
          EU AI ACT COMPLIANT
        </span>
        <span className="text-[10px] border border-accent text-accent px-3 py-1 label-os tracking-[0.08em]">
          GDPR COMPLIANT
        </span>
      </div>
    </section>
  );
}
