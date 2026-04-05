import KineticBox from './KineticBox';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface PerformanceMetricsProps {
    liveMetrics: {
        confidence_level: number;
        user_pace_check: string;
    } | null;
}

export default function PerformanceMetrics({ liveMetrics }: PerformanceMetricsProps) {
    return (
        <KineticBox title="Live Performance" icon={Activity}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Confidence</span>
                    <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-accent">{(liveMetrics?.confidence_level || 0) * 100}%</span>
                        <div className="w-24 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                            <motion.div className="h-full bg-accent" animate={{ width: `${(liveMetrics?.confidence_level || 0) * 100}%` }} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pace</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${liveMetrics?.user_pace_check === 'Optimal' ? 'bg-status-success' : 'bg-status-warning'}`} />
                        <span className={`text-sm font-black uppercase ${liveMetrics?.user_pace_check === 'Optimal' ? 'text-status-success' : 'text-status-warning'}`}>
                            {liveMetrics?.user_pace_check || 'Standby'}
                        </span>
                    </div>
                </div>
            </div>
        </KineticBox>
    );
}
