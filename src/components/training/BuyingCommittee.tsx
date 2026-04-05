import { motion } from 'framer-motion';
import { User, Briefcase, ShieldCheck, Zap } from 'lucide-react';

export type PersonaType = 'Executive' | 'Financial' | 'Technical' | 'Operational';

interface BuyingCommitteeProps {
    activePersona: PersonaType;
    sentiment?: Record<PersonaType, 'Curious' | 'Skeptical' | 'Impressed' | 'Neutral'>;
}

const personaConfig: Record<PersonaType, { icon: any, label: string, desc: string, color: string }> = {
    Executive: { icon: Zap, label: 'CEO', desc: 'Strategic Vision', color: 'rgb(244, 63, 94)' }, // rose
    Financial: { icon: ShieldCheck, label: 'CFO', desc: 'ROI & Risk', color: 'rgb(16, 185, 129)' }, // emerald
    Technical: { icon: Briefcase, label: 'CTO', desc: 'Stack & Scale', color: 'rgb(59, 130, 246)' }, // blue
    Operational: { icon: User, label: 'PM', desc: 'Workflow & UX', color: 'rgb(139, 92, 246)' }, // violet
};

export default function BuyingCommittee({ activePersona, sentiment = {} as any }: BuyingCommitteeProps) {
    const personas: PersonaType[] = ['Executive', 'Financial', 'Technical', 'Operational'];

    return (
        <div className="flex flex-col gap-4 p-4 bg-bg-surface/50 border border-border-default shadow-sm overflow-hidden text-text-primary">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Buying Committee</h3>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                    <span className="text-[10px] font-bold text-status-success uppercase">MAS Online</span>
                </div>
            </div>

            <div className="flex justify-between items-center gap-4">
                {personas.map((type) => {
                    const config = personaConfig[type];
                    const Icon = config.icon;
                    const isActive = activePersona === type;
                    const currentSentiment = sentiment[type] || 'Neutral';

                    return (
                        <div key={type} className="flex flex-col items-center gap-2 relative">
                            {/* Active Ring */}
                            <motion.div
                                className="absolute -inset-2 border-2 pointer-events-none"
                                animate={{
                                    borderColor: isActive ? config.color : 'transparent',
                                    scale: isActive ? [1, 1.05, 1] : 1,
                                    opacity: isActive ? 1 : 0
                                }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />

                            {/* Avatar */}
                            <div className={`
                                w-12 h-12 flex items-center justify-center transition-all duration-300 relative
                                ${isActive ? 'bg-bg-surface shadow-lg' : 'bg-bg-canvas opacity-40 grayscale'}
                            `}>
                                <Icon className={`w-6 h-6 ${isActive ? '' : 'text-text-muted'}`} style={{ color: isActive ? config.color : '' }} />

                                {/* Sentiment Small Indicator */}
                                {isActive && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-bg-surface flex items-center justify-center
                                            ${currentSentiment === 'Skeptical' ? 'bg-accent-critical' :
                                                currentSentiment === 'Impressed' ? 'bg-status-success' : 'bg-accent'}
                                        `}
                                    >
                                        <div className="w-1 h-3 bg-white rounded-full opacity-50" />
                                    </motion.div>
                                )}
                            </div>

                            <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                                {config.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Current Active Detail */}
            <motion.div
                layout
                className="mt-4 pt-4 border-t border-border-default/50 flex items-center justify-between"
            >
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest block text-text-muted mb-0.5">Active Listener</span>
                    <span className="text-sm font-bold text-text-primary">{personaConfig[activePersona].desc}</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest block text-text-muted mb-0.5">Sentiment</span>
                    <span className={`text-xs font-bold
                        ${sentiment[activePersona] === 'Skeptical' ? 'text-accent-critical' :
                            sentiment[activePersona] === 'Impressed' ? 'text-status-success' : 'text-accent'}
                    `}>
                        {sentiment[activePersona] || 'Neutral'}
                    </span>
                </div>
            </motion.div>
        </div>
    );
}
