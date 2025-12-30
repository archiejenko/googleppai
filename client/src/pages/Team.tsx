import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { TrendingUp, Phone, AlertCircle, Award } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    totalXP: number;
    skills: Array<{
        skill: {
            name: string;
            category: string;
        };
        level: number;
    }>;
}

interface TeamAnalytics {
    averageScore: number;
    totalCalls: number;
    membersNeedingAttention: number;
    topPerformer: {
        name: string;
        avgScore: number;
    };
    memberCount: number;
}

export default function Team() {
    const [team, setTeam] = useState<{ members: TeamMember[] } | null>(null);
    const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                // Get current user to find their team_id
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('team_id')
                    .eq('id', user.id)
                    .single();

                if (!userProfile?.team_id) {
                    setTeam(null);
                    setAnalytics(null);
                    setLoading(false);
                    return;
                }

                // Fetch Team and Members
                const { data: teamData, error: teamError } = await supabase
                    .from('teams')
                    .select(`
                        id,
                        name,
                        members:profiles (
                            id,
                            name,
                            email,
                            role,
                            total_xp,
                            skills:user_skills (
                                level,
                                skill:skills (name, category)
                            )
                        )
                    `)
                    .eq('id', userProfile.team_id)
                    .single();

                if (teamError) throw teamError;

                // Process Members for Frontend
                const members = teamData.members.map((m: any) => ({
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    role: m.role,
                    totalXP: m.total_xp,
                    skills: m.skills.map((s: any) => ({
                        level: s.level,
                        skill: s.skill
                    }))
                }));

                // Fetch Analytics (Mocking logic or basic aggregation)
                // In a real app we might fetch recent calls count from 'pitches' table for these members
                const avgScore = 75; // Placeholder or calculate if we fetch pitches
                const totalCalls = 0; // Placeholder
                const membersNeedingAttention = 0;

                // Simple aggregation
                const topPerformer = members.reduce((prev: any, current: any) =>
                    (current.totalXP > (prev?.totalXP || 0)) ? current : prev
                    , null);

                setTeam({ members });
                setAnalytics({
                    averageScore: avgScore,
                    totalCalls: totalCalls,
                    membersNeedingAttention: membersNeedingAttention,
                    topPerformer: {
                        name: topPerformer?.name || 'None',
                        avgScore: 0 // Fetch pitch average if needed
                    },
                    memberCount: members.length
                });

            } catch (error) {
                console.error('Failed to fetch team data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeamData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen gradient-dark-bg flex justify-center items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-purple-500"></div>
                </div>
            </div>
        );
    }

    if (!team || !analytics) {
        return (
            <div className="min-h-screen gradient-dark-bg flex justify-center items-center">
                <div className="glass-card p-8 text-center">
                    <AlertCircle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Team Assigned</h3>
                    <p className="text-gray-300">You need to be assigned to a team to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-extrabold text-theme-primary mb-2">
                        Team Performance
                    </h1>
                    <p className="text-theme-muted text-lg">
                        Track your team's progress and identify areas for improvement
                    </p>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="glass-card p-6 animate-fade-in-up stagger-1">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-300 text-sm font-medium mb-1">Average Score</p>
                                <p className="text-4xl font-bold text-white">{analytics.averageScore}</p>
                            </div>
                            <div className="bg-blue-500/20 p-4 rounded-xl">
                                <TrendingUp className="h-8 w-8 text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 animate-fade-in-up stagger-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-300 text-sm font-medium mb-1">Calls This Month</p>
                                <p className="text-4xl font-bold text-white">{analytics.totalCalls}</p>
                            </div>
                            <div className="bg-green-500/20 p-4 rounded-xl">
                                <Phone className="h-8 w-8 text-green-400" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 animate-fade-in-up stagger-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-300 text-sm font-medium mb-1">Need Attention</p>
                                <p className="text-4xl font-bold text-white">{analytics.membersNeedingAttention}</p>
                            </div>
                            <div className="bg-yellow-500/20 p-4 rounded-xl">
                                <AlertCircle className="h-8 w-8 text-yellow-400" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 animate-fade-in-up stagger-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-theme-muted text-sm font-medium mb-1">Top Performer</p>
                                <p className="text-lg font-bold text-theme-primary truncate">{analytics.topPerformer.name}</p>
                                <p className="text-sm text-theme-muted">Score: {Math.round(analytics.topPerformer.avgScore)}</p>
                            </div>
                            <div className="bg-purple-500/20 p-4 rounded-xl">
                                <Award className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team Members */}
                <div className="animate-fade-in-up stagger-5">
                    <h2 className="text-2xl font-bold text-theme-primary mb-6">Team Members</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {team.members.map((member, index) => (
                            <div
                                key={member.id}
                                className="glass-card p-6 animate-fade-in-up"
                                style={{ animationDelay: `${(index + 5) * 0.1}s` }}
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">
                                            {member.name?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold">{member.name || 'Unknown'}</h3>
                                        <p className="text-gray-300 text-sm">{member.role}</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center gap-2 text-sm text-theme-muted mb-2">
                                        <TrendingUp className="h-4 w-4 text-yellow-400" />
                                        <span>{member.totalXP} XP</span>
                                    </div>
                                </div>

                                {member.skills.length > 0 && (
                                    <div>
                                        <p className="text-gray-300 text-sm mb-2">Skills:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {member.skills.slice(0, 3).map((userSkill, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300"
                                                >
                                                    {userSkill.skill.name}
                                                </span>
                                            ))}
                                            {member.skills.length > 3 && (
                                                <span className="px-2 py-1 bg-white/5 border border-white/20 rounded text-xs text-gray-300">
                                                    +{member.skills.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
