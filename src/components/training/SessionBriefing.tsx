import KineticBox from './KineticBox';
import { Info, User, Target } from 'lucide-react';
import type { PersonaType } from './BuyingCommittee';

interface SessionBriefingProps {
    activePersona: PersonaType;
    sessionData: any;
}

export default function SessionBriefing({ activePersona, sessionData }: SessionBriefingProps) {
    return (
        <KineticBox title="Session Briefing" icon={Info}>
            <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/5 hover:border-accent/30 transition-colors">
                    <span className="text-[9px] font-black text-text-muted uppercase block mb-1">Target Persona</span>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/20 flex items-center justify-center"><User className="w-4 h-4 text-accent" /></div>
                        <span className="text-sm font-bold">{activePersona}</span>
                    </div>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 hover:border-accent/30 transition-colors">
                    <span className="text-[9px] font-black text-text-muted uppercase block mb-1">Call Scenario</span>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-500/20 flex items-center justify-center"><Target className="w-4 h-4 text-violet-500" /></div>
                        <span className="text-sm font-bold capitalize">{sessionData?.scenario?.replace('_', ' ') || 'Strategic Simulation'}</span>
                    </div>
                </div>
            </div>
        </KineticBox>
    );
}
