interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function ScoreBadge({ score, size = 'md', showLabel = false }: ScoreBadgeProps) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'HIGH' : score >= 60 ? 'MID' : 'LOW';

  const sizeClasses: Record<typeof size, string> = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-black border ${sizeClasses[size]}`}
      style={{ color, borderColor: color, background: `${color}18` }}
    >
      {score}
      {showLabel && <span className="text-[10px] tracking-widest opacity-70">{label}</span>}
    </span>
  );
}
