import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  delay?: number;
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, delta, deltaLabel, delay = 0, className = '' }: StatCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNeutral  = delta === undefined || delta === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 240, damping: 22 }}
      className={`bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-5 relative group hover:border-[rgb(var(--accent-primary)/0.5)] transition-colors duration-200 ${className}`}
    >
      {/* Icon */}
      {Icon && (
        <div className="w-9 h-9 flex items-center justify-center bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] mb-4">
          <Icon className="w-4 h-4 text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--accent-primary))] transition-colors" />
        </div>
      )}

      {/* Delta chip top-right */}
      {delta !== undefined && (
        <div className={`absolute top-4 right-4 flex items-center gap-0.5 text-xs font-bold
          ${isNeutral ? 'text-[rgb(var(--text-muted))]' : isPositive ? 'text-[rgb(var(--status-success,34_197_94))]' : 'text-[rgb(var(--status-danger,239_68_68))]'}`}
          style={{ color: isNeutral ? undefined : isPositive ? '#22c55e' : '#ef4444' }}
        >
          {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {delta !== 0 && `${Math.abs(delta)}%`}
        </div>
      )}

      {/* Value */}
      <p className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tight leading-none mb-1">
        {value}
      </p>

      {/* Label */}
      <p className="text-xs text-[rgb(var(--text-muted))] uppercase tracking-widest">
        {label}
      </p>

      {/* Delta label */}
      {deltaLabel && (
        <p className="text-xs text-[rgb(var(--text-muted))] mt-1 opacity-60">{deltaLabel}</p>
      )}
    </motion.div>
  );
}
