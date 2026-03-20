interface Props {
  rep: string;
  manager: string;
  leader: string;
}

const ROLES = [
  { key: 'rep' as const, label: 'Rep' },
  { key: 'manager' as const, label: 'Manager' },
  { key: 'leader' as const, label: 'Leader' },
];

export default function RoleValueStrip({ rep, manager, leader }: Props) {
  const values = { rep, manager, leader };

  return (
    <div className="grid grid-cols-3 gap-px bg-[rgba(255,107,107,0.2)] border-t-2 border-[#FF6B6B] mt-10 mb-10">
      {ROLES.map(({ key, label }) => (
        <div key={key} className="bg-bg-surface p-4">
          <span className="block text-[10px] uppercase tracking-[0.12em] text-[#FF6B6B] mb-1.5 label-os" style={{ opacity: 0.7 }}>
            {label}
          </span>
          <span
            className="block text-[13px] text-text-primary leading-snug"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontStyle: 'italic' }}
          >
            {values[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
