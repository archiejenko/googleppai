import { useState } from 'react';
import { ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackAccordionProps {
    title: string;
    score: number;
    feedback: string;
    metrics?: { label: string; value: string | number }[];
}

export default function FeedbackAccordion({ title, score, feedback, metrics }: FeedbackAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isHigh = score >= 70;

    return (
        <div className="bg-[rgb(var(--bg-surface))] rounded-[var(--radius-md)] border border-[rgb(var(--border-subtle))] overflow-hidden mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-surface-raised))] transition-colors"
            >
                <div className="flex items-center gap-3">
                    {isHigh ? (
                        <CheckCircle className="w-5 h-5 text-status-success" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-status-warning" />
                    )}
                    <span className="font-semibold text-[rgb(var(--text-primary))]">{title}</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-[rgb(var(--bg-canvas))] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${isHigh ? 'bg-status-success' : 'bg-status-warning'}`}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                        <span className="font-mono text-sm text-[rgb(var(--text-muted))]">{score}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[rgb(var(--text-muted))] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4 pt-0 border-t border-[rgb(var(--border-subtle))]">
                            <p className="text-[rgb(var(--text-secondary))] leading-relaxed text-sm my-3 border-l-2 border-[rgb(var(--accent-primary))] pl-3 bg-[rgb(var(--bg-canvas))] py-2 rounded-r-md">
                                {feedback}
                            </p>
                            {metrics && (
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    {metrics.map((m, i) => (
                                        <div key={i} className="bg-[rgb(var(--bg-canvas))] p-2 rounded border border-[rgb(var(--border-subtle))]">
                                            <div className="text-xs text-[rgb(var(--text-muted))] uppercase">{m.label}</div>
                                            <div className="font-mono font-medium text-[rgb(var(--text-primary))]">{m.value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
