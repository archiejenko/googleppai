import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface KineticBoxProps {
    children: React.ReactNode;
    title?: string;
    icon?: LucideIcon;
    className?: string;
}

const KineticBox = ({ children, title, icon: Icon, className = "" }: KineticBoxProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-bg-surface/40 backdrop-blur-2xl border border-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden relative group ${className}`}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        {title && (
            <div className="flex items-center gap-2 mb-4 relative z-10">
                {Icon && <Icon className="w-4 h-4 text-accent" />}
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{title}</h3>
            </div>
        )}
        <div className="relative z-10 h-full">{children}</div>
    </motion.div>
);

export default KineticBox;
