interface AvatarChipProps {
  name: string;
  seed?: string;
  size?: number;
  showName?: boolean;
  role?: string;
  className?: string;
}

export default function AvatarChip({ name, seed, size = 32, showName = false, role, className = '' }: AvatarChipProps) {
  const avatarSeed = seed || name;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="flex-shrink-0 border border-[rgb(var(--border-default))] overflow-hidden bg-[rgb(var(--bg-canvas))]"
        style={{ width: size, height: size }}
      >
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
          alt={name}
          style={{ width: size, height: size }}
          className="object-cover"
        />
      </div>
      {showName && (
        <div className="min-w-0">
          <p className="text-sm font-bold text-[rgb(var(--text-primary))] truncate leading-tight">{name}</p>
          {role && <p className="text-xs text-[rgb(var(--text-muted))] truncate">{role}</p>}
        </div>
      )}
    </div>
  );
}
