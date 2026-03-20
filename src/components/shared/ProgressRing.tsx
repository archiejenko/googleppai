import { useEffect, useState } from 'react';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  animate?: boolean;
}

export default function ProgressRing({
  percent,
  size = 160,
  strokeWidth = 10,
  label,
  sublabel,
  color = 'rgb(var(--accent-primary))',
  animate = true,
}: ProgressRingProps) {
  const [displayed, setDisplayed] = useState(animate ? 0 : percent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;

  useEffect(() => {
    if (!animate) return;
    const start = performance.now();
    const duration = 1000;
    const raf = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayed(ease * percent);
      if (t < 1) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [percent, animate]);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--border-default))"
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          style={{ transition: animate ? 'none' : 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute flex flex-col items-center pointer-events-none" style={{ width: size - strokeWidth * 4 }}>
        {label && (
          <span className="text-2xl font-black text-[rgb(var(--text-primary))] tracking-tight">{label}</span>
        )}
        {sublabel && (
          <span className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-widest mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
