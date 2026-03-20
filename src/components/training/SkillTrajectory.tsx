import KineticBox from './KineticBox';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserSkill {
    skill_id: string;
    current_score: number;
}

interface DrillHighlight {
    id: string;
    title: string;
    score: number;
}

interface SkillTrajectoryProps {
    userSkills: UserSkill[];
    recentDrills: DrillHighlight[];
}

export default function SkillTrajectory({ userSkills, recentDrills }: SkillTrajectoryProps) {
    return (
        <KineticBox title="Skill Trajectory" icon={Trophy}>
            <div className="space-y-4">
                {userSkills.slice(0, 2).map(skill => (
                    <div key={skill.skill_id} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-text-muted">{skill.skill_id}</span>
                            <span>{skill.current_score}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-accent" animate={{ width: `${skill.current_score}%` }} />
                        </div>
                    </div>
                ))}
                <div className="pt-4 border-t border-white/5 mt-4">
                    <span className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">Recent Highlights</span>
                    <div className="space-y-2">
                        {recentDrills.map(drill => (
                            <div key={drill.id} className="flex justify-between items-center text-[10px]">
                                <span className="text-text-secondary truncate max-w-[120px]">{drill.title}</span>
                                <span className="text-status-success font-black">{drill.score}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </KineticBox>
    );
}
