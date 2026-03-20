import React from 'react';
import { motion } from 'framer-motion';

interface NyroTextRevealProps {
    text: string;
    className?: string;
}

const NyroTextReveal: React.FC<NyroTextRevealProps> = ({ text, className = "" }) => {
    // Split text into words for a cleaner "rise" effect
    const words = text.split(" ");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.04 * i },
        }),
    };

    const childVariants = {
        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                type: "spring" as const,
                damping: 20,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            y: 40,
            filter: "blur(8px)",
        },
    };

    return (
        <motion.h1
            className={`flex flex-wrap ${className}`}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
        >
            {words.map((word, index) => (
                <motion.span
                    key={index}
                    variants={childVariants}
                    className="mr-3 leading-tight inline-block"
                >
                    {word}
                </motion.span>
            ))}
        </motion.h1>
    );
};

export default NyroTextReveal;
