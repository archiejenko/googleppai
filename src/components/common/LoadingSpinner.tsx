import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
    message?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4'
};

export default function LoadingSpinner({ message, size = 'md', className = '' }: LoadingSpinnerProps) {
    return (
        <div className={`flex flex-col items-center justify-center space-y-4 ${className}`} role="status" aria-live="polite">
            <motion.div
                className={`relative rounded-full border-[rgb(var(--bg-surface-raised))] border-t-[rgb(var(--accent-primary))] ${sizeClasses[size]}`}
                animate={{ rotate: 360 }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                }}
                aria-hidden="true"
            />
            {message && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm text-[rgb(var(--text-secondary))] font-medium"
                >
                    {message}
                </motion.p>
            )}
            <span className="sr-only">{message || 'Loading...'}</span>
        </div>
    );
}
