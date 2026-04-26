import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: number;
  deltaUnit?: string;
  deltaLabel?: string;
  delay?: number;
  className?: string;
}

export default function StatCard({ label, value, icon: Icon, delta, deltaUnit = '%', deltaLabel, delay = 0, className = '' }: StatCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNeutral  = delta === undefined || delta === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 240, damping: 22 }}
      className={`bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4 relative group hover:border-[rgba(255,107,107,0.3)] transition-colors duration-200 ${className}`}
    >
      {Icon && (
        <div className="w-7 h-7 flex items-center justify-center bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border-default))] rounded-md mb-3">
          <Icon className="w-3.5 h-3.5 text-[rgb(var(--text-muted))] group-hover:text-[#FF6B6B] transition-colors" />
        </div>
      )}

      {delta !== undefined && (
        <div className={`absolute top-4 right-4 flex items-center gap-0.5 text-[11px] font-semibold
          ${isNeutral ? 'text-[rgb(var(--text-muted))]' : isPositive ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}
        >
          {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {delta !== 0 && `${Math.abs(delta)}${deltaUnit}`}
        </div>
      )}

      <p className="stat-value text-[rgb(var(--text-primary))] mb-1.5">
        {value}
      </p>

      <p className="stat-label">
        {label}
      </p>

      {deltaLabel && (
        <p className="text-[10px] text-[rgb(var(--text-muted))] mt-1 opacity-60">{deltaLabel}</p>
      )}
    </motion.div>
  );
}
