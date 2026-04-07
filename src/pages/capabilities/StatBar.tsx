import type { StatData } from '../../data/capabilitiesData';

interface Props {
  stats: StatData[];
}

export default function StatBar({ stats }: Props) {
  const cols = stats.length === 4 ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <div className={`grid ${cols} gap-px bg-bg-canvas mt-px`}>
      {stats.map((stat) => (
        <div key={stat.label} className="bg-bg-surface px-6 py-5">
          <div className="text-[26px] leading-none text-[#FF6B6B] mb-1">
            {stat.number}
          </div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-text-muted label-os">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
