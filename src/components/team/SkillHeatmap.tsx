import React from 'react';
import { motion } from 'framer-motion';
import { getPerformanceTheme } from '../../utils/theme';
import KineticCard from '../kinetic/KineticCard';

interface RepScore {
    id: string;
    name: string;
    scores: Record<string, number>;
}

interface SkillHeatmapProps {
    teamData: RepScore[];
    methodology: string[];
}

const SkillHeatmap: React.FC<SkillHeatmapProps> = ({ teamData, methodology }) => {
    return (
        <KineticCard className="p-10 border border-border-default/50 group">
            <div className="mb-10">
                <h3 className="text-2xl font-bold text-text-primary mb-2">Team Skill Heatmap</h3>
                <p className="text-text-secondary text-sm font-light leading-relaxed">
                    Real-time performance calibration across key methodology pillars.
                </p>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full border-separate border-spacing-y-4 border-spacing-x-2">
                    <thead>
                        <tr>
                            <th className="px-4 py-2 text-left text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">Representative</th>
                            {methodology.map(pillar => (
                                <th key={pillar} className="px-4 py-2 text-center text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">
                                    {pillar}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {teamData.map((rep, idx) => (
                            <motion.tr
                                key={rep.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * idx }}
                            >
                                <td className="p-4 text-xs font-bold text-text-secondary border border-border-default/20 bg-bg-canvas/40 rounded-l-2xl">
                                    {rep.name}
                                </td>
                                {methodology.map(pillar => {
                                    const score = rep.scores[pillar] || 0;
                                    const theme = getPerformanceTheme(score);
                                    return (
                                        <td key={pillar} className="p-0">
                                            <motion.button
                                                layout
                                                whileHover={{ scale: 1.08, zIndex: 10 }}
                                                className="h-14 w-full flex flex-col items-center justify-center transition-all rounded-xl cursor-pointer group/cell relative overflow-hidden"
                                                style={{
                                                    backgroundColor: `${theme.color}10`,
                                                    color: theme.color,
                                                    border: `1px solid ${theme.color}25`,
                                                }}
                                            >
                                                {/* Cell Glow */}
                                                <div className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                                                <span className="text-xs font-black relative z-10 tracking-tight">{score}%</span>
                                                <div className="w-4 h-0.5 bg-current opacity-30 mt-1 rounded-full relative z-10" />

                                                {/* Tooltip */}
                                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-bg-surface-raised border border-border-default/80 text-text-primary px-3 py-2 rounded-xl text-[9px] font-bold opacity-0 group-hover/cell:opacity-100 transition-all scale-90 group-hover/cell:scale-100 pointer-events-none z-50 shadow-2xl backdrop-blur-md">
                                                    DEEP DIVE: {pillar}
                                                </div>
                                            </motion.button>
                                        </td>
                                    );
                                })}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend - High End */}
            <div className="mt-12 flex flex-wrap gap-10">
                {[
                    { label: 'Mastered', color: 'bg-emerald-500', range: '85%+' },
                    { label: 'Proficient', color: 'bg-accent', range: '70%+' },
                    { label: 'Developing', color: 'bg-amber-500', range: '50%+' },
                    { label: 'Critical', color: 'bg-red-500', range: '<50%' }
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${item.color} shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]`} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">{item.label}</span>
                            <span className="text-[8px] font-bold text-text-muted">{item.range}</span>
                        </div>
                    </div>
                ))}
            </div>
        </KineticCard>
    );
};

export default SkillHeatmap;
