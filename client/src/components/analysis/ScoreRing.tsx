import { motion } from 'framer-motion';

interface ScoreRingProps {
    score: number;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function ScoreRing({ score, label = "Overall Score", size = 'lg' }: ScoreRingProps) {
    const dim = size === 'lg' ? 200 : size === 'md' ? 120 : 60;
    const strokeWidth = size === 'lg' ? 12 : 8;
    const radius = (dim - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center p-4">
                {/* Background Glow */}
                <div className={`absolute inset-0 bg-[rgb(var(--accent-primary)/0.1)] blur-3xl rounded-full ${size === 'lg' ? 'scale-150' : ''}`} />

                <svg width={dim} height={dim} className="transform -rotate-90 relative z-10">
                    {/* Track */}
                    <circle
                        cx={dim / 2}
                        cy={dim / 2}
                        r={radius}
                        fill="transparent"
                        stroke="rgb(var(--bg-surface-raised))"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress */}
                    <motion.circle
                        cx={dim / 2}
                        cy={dim / 2}
                        r={radius}
                        fill="transparent"
                        stroke="rgb(var(--accent-primary))"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference} // Initial
                        strokeLinecap="round"
                        animate={{ strokeDashoffset: circumference - progress }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ filter: 'drop-shadow(0 0 6px rgb(var(--accent-primary)/0.6))' }}
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <motion.span
                        className={`font-display font-bold text-[rgb(var(--text-primary))] ${size === 'lg' ? 'text-6xl' : 'text-3xl'}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {score}
                    </motion.span>
                </div>
            </div>
            {label && <p className="mt-2 text-[rgb(var(--text-muted))] font-medium uppercase tracking-wide text-sm">{label}</p>}
        </div>
    );
}
