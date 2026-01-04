import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Target, Phone, CheckCircle, Award } from 'lucide-react';

// Components
import { useAuth } from '../context/AuthContext';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import MetricTile from '../components/dashboard/MetricTile';
import RepsAtRiskTable from '../components/dashboard/RepsAtRiskTable';
import TeamDeltaChart from '../components/dashboard/TeamDeltaChart';
import RecommendedDrills from '../components/dashboard/RecommendedDrills';
import CoachNotes from '../components/dashboard/CoachNotes';

interface Pitch {
    id: string;
    createdAt: string;
    score: number;
    feedback: any;
    transcript: string;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Pitches Logic (Preserved)
    useEffect(() => {
        const fetchPitches = async () => {
            try {
                const { data, error } = await supabase
                    .from('pitches')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const mappedPitches = data.map((p: any) => ({
                    id: p.id,
                    createdAt: p.created_at,
                    score: p.score,
                    feedback: p.feedback,
                    transcript: p.transcript,
                }));

                setPitches(mappedPitches);
            } catch (error) {
                console.error('Failed to fetch pitches', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPitches();
    }, []);

    // Calculate Stats
    const averageScore = pitches.length > 0
        ? Math.round(pitches.reduce((acc, pitch) => acc + pitch.score, 0) / pitches.length)
        : 0;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-[rgb(var(--bg-surface-raised))] border-t-[rgb(var(--accent-primary))]"></div>
            </div>
        );
    }

    return (
        <div className="pb-12">
            <DashboardHeader userName={user?.name || user?.email?.split('@')[0] || 'User'} />

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in-up" style={{ animationDelay: '0.1s' }}>
                <MetricTile
                    label="Quota Attainment"
                    value="87%"
                    icon={Target}
                    trend={12}
                    trendLabel="vs last month"
                />
                <MetricTile
                    label="Weekly Calls"
                    value="42"
                    icon={Phone}
                    trend={-5}
                    isPositive={false}
                    trendLabel="vs target (50)"
                />
                <MetricTile
                    label="Conversion Rate"
                    value="24%"
                    icon={CheckCircle}
                    trend={2.4}
                    trendLabel="vs avg"
                />
                <MetricTile
                    label="Avg Confidence"
                    value={averageScore}
                    icon={Award}
                    trend={5}
                    trendLabel="rolling 30d"
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in-up" style={{ animationDelay: '0.2s' }}>

                {/* Col 1: Reps Table (Span 2) */}
                <div className="lg:col-span-2 h-[400px]">
                    <RepsAtRiskTable />
                </div>

                {/* Col 2: Drills (Span 1) */}
                <div className="h-[400px]">
                    <RecommendedDrills />
                </div>

                {/* Row 2 */}

                {/* Col 1: Team Delta (Span 2) */}
                <div className="lg:col-span-2 h-[350px]">
                    <TeamDeltaChart />
                </div>

                {/* Col 2: Coach Notes (Span 1) */}
                <div className="h-[350px]">
                    <CoachNotes />
                </div>
            </div>
        </div>
    );
}
