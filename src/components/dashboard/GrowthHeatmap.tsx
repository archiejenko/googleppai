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

    const scoreColor = (score: number) =>
        score >= 80 ? '#4ADE80' : score >= 60 ? '#FBBF24' : '#FF6B6B';
    const scoreBg = (score: number) =>
        score >= 80 ? 'rgba(74,222,128,0.12)' : score >= 60 ? 'rgba(251,191,36,0.12)' : 'rgba(255,107,107,0.12)';

    if (loading) return <div className="h-48 animate-pulse bg-[rgb(var(--bg-surface-raised))] rounded-lg" />;

    return (
        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#FF6B6B]" />
                    <h3 className="card-title !mb-0">Skill Growth Heatmap</h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[rgb(var(--text-muted))]">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF6B6B' }} /> Needs Work</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FBBF24' }} /> Progressing</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ADE80' }} /> Mastered</span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="table-os w-full">
                    <thead>
                        <tr>
                            <th>Session</th>
                            <th className="text-center">Discovery</th>
                            <th className="text-center">Pitch</th>
                            <th className="text-center">Closing</th>
                            <th className="text-center">Peak Delta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={row.training_session_id}>
                                <td>
                                    <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                                        {new Date(row.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="block text-[9px] font-mono text-[rgb(var(--text-muted))]">#{data.length - i}</span>
                                </td>
                                {[row.discovery_score, row.pitch_score, row.closing_score].map((score, si) => (
                                    <td key={si} className="text-center">
                                        <span
                                            className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                                            style={{ background: scoreBg(score), color: scoreColor(score) }}
                                        >
                                            {Math.round(score)}%
                                        </span>
                                    </td>
                                ))}
                                <td className="text-center">
                                    <span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#FF6B6B]">
                                        +{Math.round(row.peak_performance)}
                                        <TrendingUp className="h-3 w-3 text-[#4ADE80]" />
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {data.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-[rgb(var(--text-muted))]">
                        <BarChart3 className="h-6 w-6 mb-2 opacity-30" />
                        <p className="text-xs">Complete your first session to see growth data</p>
                    </div>
                )}
            </div>
        </div>
    );
}
