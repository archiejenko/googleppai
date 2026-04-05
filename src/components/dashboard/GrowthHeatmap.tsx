import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';

interface HeatmapData {
    session_date: string;
    training_session_id: string;
    discovery_score: number;
    pitch_score: number;
    closing_score: number;
    peak_performance: number;
}

export default function GrowthHeatmap() {
    const [data, setData] = useState<HeatmapData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHeatmap() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: heatmapData, error } = await supabase
                .from('user_skill_growth_heatmap')
                .select('*')
                .eq('user_id', user.id)
                .limit(12);

            if (!error && heatmapData) {
                setData(heatmapData);
            }
            setLoading(false);
        }
        fetchHeatmap();
    }, []);

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'bg-status-success';
        if (score >= 65) return 'bg-status-warning';
        return 'bg-status-danger';
    };

    if (loading) return <div className="h-48 animate-pulse bg-[rgb(var(--bg-surface-raised))] rounded-xl" />;

    return (
        <div className="card-os p-6 h-full flex flex-col bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-subtle))]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[rgb(var(--accent-primary))]" />
                    <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))]">
                        Skill Growth Heatmap
                    </h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-[rgb(var(--text-muted))]">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-status-danger" /> Needs Work
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-status-warning" /> Progressing
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-status-success" /> Mastered
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-[rgb(var(--text-muted))] text-xs uppercase tracking-wider">
                            <th className="pb-2 font-medium">Session</th>
                            <th className="pb-2 font-medium text-center">Discovery</th>
                            <th className="pb-2 font-medium text-center">Pitch</th>
                            <th className="pb-2 font-medium text-center">Closing</th>
                            <th className="pb-2 font-medium text-center">Peak Delta</th>
                        </tr>
                    </thead>
                    <tbody className="space-y-2">
                        {data.map((row, i) => (
                            <tr key={row.training_session_id} className="group">
                                <td className="py-2">
                                    <div className="text-sm font-medium text-[rgb(var(--text-primary))]">
                                        {new Date(row.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="text-[10px] text-[rgb(var(--text-muted))]">
                                        Session #{data.length - i}
                                    </div>
                                </td>
                                <td className="py-2">
                                    <div className="flex justify-center">
                                        <div
                                            className={`w-12 h-8 rounded-md ${getScoreColor(row.discovery_score)} opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white`}
                                            title={`Discovery Score: ${Math.round(row.discovery_score)}%`}
                                        >
                                            {Math.round(row.discovery_score)}%
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2">
                                    <div className="flex justify-center">
                                        <div
                                            className={`w-12 h-8 rounded-md ${getScoreColor(row.pitch_score)} opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white`}
                                            title={`Pitch Score: ${Math.round(row.pitch_score)}%`}
                                        >
                                            {Math.round(row.pitch_score)}%
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2">
                                    <div className="flex justify-center">
                                        <div
                                            className={`w-12 h-8 rounded-md ${getScoreColor(row.closing_score)} opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white`}
                                            title={`Closing Score: ${Math.round(row.closing_score)}%`}
                                        >
                                            {Math.round(row.closing_score)}%
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="text-sm font-semibold text-[rgb(var(--accent-primary))]">
                                            +{Math.round(row.peak_performance)}
                                        </div>
                                        <TrendingUp className="h-3 w-3 text-status-success" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {data.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-[rgb(var(--text-muted))] border-2 border-dashed border-[rgb(var(--border-subtle))] rounded-xl">
                        <BarChart3 className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">Complete your first session to see growth data</p>
                    </div>
                )}
            </div>
        </div>
    );
}
