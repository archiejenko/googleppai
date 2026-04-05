import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface NeuralOrbProps {
    state: 'idle' | 'listening' | 'processing' | 'speaking';
    intensity?: number; // 0.0 to 1.0 (linked to voice/activity level)
}

export default function NeuralOrb({ state, intensity = 0.5 }: NeuralOrbProps) {
    const [color, setColor] = useState('rgba(59, 130, 246, 0.4)'); // blue-500

    useEffect(() => {
        switch (state) {
            case 'listening': setColor('rgba(16, 185, 129, 0.5)'); break; // emerald-500
            case 'processing': setColor('rgba(139, 92, 246, 0.5)'); break; // violet-500
            case 'speaking': setColor('rgba(244, 63, 94, 0.5)'); break; // rose-500
            default: setColor('rgba(59, 130, 246, 0.4)'); break;
        }
    }, [state]);

    return (
        <div className="relative flex items-center justify-center w-full h-full max-w-[300px] max-h-[300px] aspect-square">
            {/* SVG Filter for Gooey/Fluid Effect */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="neural-goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
            </svg>

            <div className="relative w-full h-full flex items-center justify-center" style={{ filter: 'url(#neural-goo)' }}>
                {/* Core Core */}
                <motion.div
                    className="absolute w-32 h-32 rounded-full z-20"
                    style={{ backgroundColor: color }}
                    animate={{
                        scale: state === 'idle' ? 1 : [1, 1.1 + intensity * 0.2, 1],
                        filter: `blur(${10 + intensity * 20}px)`
                    }}
                    transition={{
                        duration: state === 'processing' ? 1.5 : 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Floating Blobs */}
                <AnimatePresence>
                    {[...Array(state === 'speaking' || state === 'listening' ? 4 : 2)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-24 h-24 rounded-full mix-blend-screen"
                            style={{ backgroundColor: color, opacity: 0.6 }}
                            initial={{ x: 0, y: 0, scale: 0.8 }}
                            animate={{
                                x: [
                                    Math.sin(i * 90) * 40,
                                    Math.cos(i * 90) * 80,
                                    Math.sin(i * 90) * 40
                                ],
                                y: [
                                    Math.cos(i * 90) * 40,
                                    Math.sin(i * 90) * 80,
                                    Math.cos(i * 90) * 40
                                ],
                                scale: [0.8, 1.2 + intensity * 0.4, 0.8],
                            }}
                            transition={{
                                duration: 3 + i,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />
                    ))}
                </AnimatePresence>

                {/* Peripheral Glow */}
                <motion.div
                    className="absolute w-48 h-48 rounded-full z-0 opacity-20 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.1, 0.3, 0.1]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </div>

            {/* Subliminal Pulse Ring (Not affected by goo filter) */}
            <motion.div
                className="absolute inset-0 border-2 rounded-full pointer-events-none"
                style={{ borderColor: color, opacity: 0.1 }}
                animate={{
                    scale: state === 'speaking' ? [1, 1.3] : [1, 1],
                    opacity: state === 'speaking' ? [0.2, 0] : 0
                }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
        </div>
    );
}
