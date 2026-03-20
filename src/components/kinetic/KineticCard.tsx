import React from 'react';
import { motion } from 'framer-motion';

interface KineticCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    hoverEffect?: boolean;
    onClick?: () => void;
}

const KineticCard: React.FC<KineticCardProps> = ({
    children,
    className = "",
    delay = 0,
    hoverEffect = true,
    onClick
}) => {
    const isInteractive = !!onClick;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: delay
            }}
            onClick={onClick}
            className={`bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default)/0.3)] rounded-lg backdrop-blur-[20px] shadow-lg relative overflow-hidden group transition-all duration-300 ${hoverEffect ? 'hover:border-[rgb(var(--accent-primary)/0.5)]' : ''
                } ${isInteractive ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-canvas))]' : ''
                } ${className}`}
            tabIndex={isInteractive ? 0 : undefined}
            role={isInteractive ? 'button' : undefined}
            onKeyDown={isInteractive ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            } : undefined}
        >
            {/* Subtle Inner Glow on Hover */}
            {hoverEffect && (
                <div className="absolute inset-0 bg-[rgb(var(--accent-primary)/0)] group-hover:bg-[rgb(var(--accent-primary)/0.02)] pointer-events-none transition-colors duration-300" />
            )}

            {children}
        </motion.div>
    );
};

export default KineticCard;

