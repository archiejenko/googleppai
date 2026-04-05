import React, { useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface KineticButtonProps {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'critical';
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    isLoading?: boolean;
}

const KineticButton = ({
    children,
    onClick,
    className = "",
    variant = 'primary',
    disabled,
    type = 'button',
    isLoading = false,
}: KineticButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Magnetic Effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { stiffness: 260, damping: 20 });
    const springY = useSpring(y, { stiffness: 260, damping: 20 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!buttonRef.current || disabled || isLoading) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Magnetic pull distance (how far it moves)
        const pullX = (e.clientX - centerX) * 0.3;
        const pullY = (e.clientY - centerY) * 0.3;

        x.set(pullX);
        y.set(pullY);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    const variants = {
        primary: "bg-[rgb(var(--accent-primary))] text-white border-2 border-[var(--color-off-white)] shadow-[4px_4px_0px_0px_var(--color-off-white)] hover:shadow-[6px_6px_0px_0px_var(--color-off-white)] active:shadow-[2px_2px_0px_0px_var(--color-off-white)]",
        secondary: "bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border-default))]",
        outline: "border border-[rgb(var(--border-default))] hover:border-[rgb(var(--accent-primary))] text-[rgb(var(--text-primary))]",
        critical: "bg-[rgb(var(--accent-critical))] text-white hover:shadow-[0_0_20px_rgb(var(--accent-critical)/0.4)]"
    };

    const isDisabled = disabled || isLoading;

    return (
        <motion.button
            ref={buttonRef}
            type={type}
            disabled={isDisabled}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{ x: springX, y: springY }}
            className={`relative px-6 py-3 rounded-md font-medium transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-canvas))] ${variants[variant]} ${className}`}
            aria-busy={isLoading}
        >
            {/* Liquid Fill Effect */}
            <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: isHovered && !isDisabled ? "0%" : "-100%" }}
                transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                className="absolute inset-0 bg-white/10 pointer-events-none"
            />

            <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {children}
            </span>
        </motion.button>
    );
};

export default KineticButton;

