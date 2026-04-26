import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Building2, AlertCircle, ArrowUpCircle, MinusCircle, Flame, Mail, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import SkillHeatmap from '../components/team/SkillHeatmap';
import PlaybookManager from '../components/team/PlaybookManager';

const COLORS = ['#FF6B6B', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface Member {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'team_lead' | 'admin';
    sales_role: string | null;
    total_xp: number;
    mastery_level: string | null;
}

interface LeaderboardEntry {
    rank: number;
    name: string;
    xp: number;
    level: string;
    trend: 'up' | 'stable';
    momentumScore: number;
}

interface ChartData {
    member: string;
    calls: number;
    [key: string]: string | number;
}

function getInitials(name: string) {
    return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function RoleBadge({ role }: { role: Member['role'] }) {
    const map = {
        admin: { label: 'Admin', className: 'bg-[rgba(167,139,250,0.12)] text-[#A78BFA]' },
        team_lead: { label: 'Team Lead', className: 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]' },
        user: { label: 'Rep', className: 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80]' },
    };
    const { label, className } = map[role] ?? map.user;
    return (
        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] rounded ${className}`}>
            {label}
        </span>
    );
}

function MasteryBadge({ level }: { level: string | null }) {
    if (!level) return null;
    const map: Record<string, string> = {
        Elite: 'bg-[rgba(167,139,250,0.12)] text-[#A78BFA]',
        Pro: 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]',
        Intermediate: 'bg-[rgba(251,191,36,0.12)] text-[#FBBF24]',
        Rookie: 'bg-[rgba(74,85,103,0.15)] text-[#4a5567]',
    };
    const cls = map[level] ?? map.Rookie;
    return (
        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] rounded ${cls}`}>
            {level}
        </span>
    );
}

export default function Team() {
    const { user: currentUser } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [stats, setStats] = useState({ totalMembers: 0, companyName: 'OAST Enterprise' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'analytics' | 'playbooks'>('members');
    const [heatmapMethodology] = useState<string[]>(['Opening', 'Discovery', 'Objections', 'Closing', 'Alignment']);
    const [heatmapData, setHeatmapData] = useState<any[]>([]);

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                // Get current user's org_id
                const { data: myProfile } = await supabase
                    .from('profiles')
                    .select('org_id, team_id')
                    .eq('id', currentUser?.id)
                    .single();

                const orgId = myProfile?.org_id;

                // Fetch all members in the same org
                const memberQuery = supabase
                    .from('profiles')
                    .select('id, name, email, role, total_xp, mastery_level, sales_role')
                    .order('total_xp', { ascending: false });

                if (orgId) {
                    memberQuery.eq('org_id', orgId);
                }

                const { data: profileData, error: profileError } = await memberQuery.limit(50);
                if (profileError) throw profileError;

                setMembers(profileData ?? []);
                setStats(prev => ({ ...prev, totalMembers: profileData?.length ?? 0 }));

                // Build leaderboard (top 10 by XP)
                const top10 = (profileData ?? []).slice(0, 10);
                const mappedLeaderboard = await Promise.all(top10.map(async (p, i) => {
                    const { data: momentum } = await supabase.rpc('calculate_performance_momentum', { p_user_id: p.id });
                    return {
                        rank: i + 1,
                        name: p.name || 'Anonymous Rep',
                        xp: p.total_xp || 0,
                        level: p.mastery_level || 'Rookie',
                        trend: momentum?.trend || 'stable',
                        momentumScore: momentum?.momentum_score || 0,
                    } as LeaderboardEntry;
                }));
                setLeaderboard(mappedLeaderboard);

                // Competency heatmap
                if (myProfile?.team_id) {
                    const { data: matrix, error: matrixError } = await supabase.rpc('get_team_competency_matrix', { p_team_id: myProfile.team_id });
                    if (!matrixError && matrix) {
                        setHeatmapData(matrix.map((m: any) => ({
                            id: m.user_id,
                            name: m.name || 'Rep',
                            scores: {
                                Opening: Math.round(m.opening_avg),
                                Discovery: Math.round(m.discovery_avg),
                                Objections: Math.round(m.objection_avg),
                                Closing: Math.round(m.closing_avg),
                                Alignment: Math.round(m.alignment_avg),
                            },
                        })));
                    }
                }

                // Call distribution pie chart
                const { data: sessions, error: sessionError } = await supabase
                    .from('training_sessions')
                    .select('profiles(name)')
                    .eq('completed', true);

                if (sessionError) throw sessionError;

                const counts: Record<string, number> = {};
                sessions.forEach((s: any) => {
                    const name = s.profiles?.name || 'Unknown';
                    counts[name] = (counts[name] || 0) + 1;
                });

                setChartData(
                    Object.entries(counts)
                        .map(([member, calls]) => ({ member, calls }))
                        .sort((a, b) => b.calls - a.calls)
                        .slice(0, 5)
                );

            } catch (err: any) {
                console.error('Error fetching team data:', err);
                setError('Failed to load team data.');
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.id) fetchTeamData();
    }, [currentUser?.id, filter]);

    if (loading) {
        return (
            <div className="layout-shell flex items-center justify-center bg-[#0d1117]">
                <div className="animate-spin w-12 h-12 rounded-full border-4 border-[#1e2a38] border-t-[#FF6B6B]"></div>
            </div>
        );
    }

    // Group members by role priority
    const leads = members.filter(m => m.role === 'admin' || m.role === 'team_lead');
    const reps = members.filter(m => m.role === 'user');

    return (
        <div className="layout-shell bg-[#0d1117] min-h-screen text-[#c9d1d9]">
            <div className="max-w-7xl mx-auto px-7 pt-6 pb-7">

                {/* Page Header */}
                <div className="mb-5">
                    <div className="page-kicker font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4a5567] mb-0.5">Core</div>
                    <h1 className="page-title font-['Oswald'] text-2xl font-semibold uppercase tracking-tight text-[#c9d1d9] mb-0.5">Team</h1>
                    <p className="page-desc text-xs text-[#7d8a98]">Team roster, status, and performance overview</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">Total Reps</div>
                        <div className="stat-value font-['Oswald'] text-[28px] font-semibold leading-none text-[#c9d1d9]">{stats.totalMembers}</div>
                    </div>
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">Leadership</div>
                        <div className="stat-value font-['Oswald'] text-[28px] font-semibold leading-none text-[#c9d1d9]">{leads.length}</div>
                    </div>
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">Organisation</div>
                        <div className="stat-value font-['Oswald'] text-[18px] font-semibold leading-none text-[#c9d1d9]">{stats.companyName}</div>
                    </div>
                    <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-4">
                        <div className="stat-label font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a5567] mb-1.5">Reps</div>
                        <div className="stat-value font-['Oswald'] text-[28px] font-semibold leading-none text-[#c9d1d9]">{reps.length}</div>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 mb-5">
                    {(['members', 'analytics', 'playbooks'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-4 py-1.5 text-[11px] font-semibold rounded-full border transition-colors capitalize font-['DM_Sans'] ${
                                activeTab === t
                                    ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                                    : 'bg-[#0a0e14] border-[#1e2a38] text-[#7d8a98] hover:border-[#FF6B6B] hover:text-[#c9d1d9]'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="mb-4 bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.3)] text-[#F87171] rounded-lg p-4 flex items-center gap-3 text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* ── Members Tab ── */}
                {activeTab === 'members' && (
                    <div className="space-y-4">
                        {/* Team Roster heading */}
                        <div className="font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9]">Team Roster</div>

                        {/* Roster Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {leads.map((m, i) => (
                                <MemberCard key={m.id} member={m} delay={i * 0.05} />
                            ))}
                            {reps.map((m, i) => (
                                <MemberCard key={m.id} member={m} delay={i * 0.04} />
                            ))}
                        </div>

                        {members.length === 0 && !loading && (
                            <div className="text-center py-12 text-[#4a5567]">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No data yet</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Analytics Tab ── */}
                {activeTab === 'analytics' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <div className="flex gap-2">
                                {(['daily', 'weekly', 'monthly'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-colors capitalize font-['DM_Sans'] ${
                                            filter === f
                                                ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                                                : 'bg-[#0a0e14] border-[#1e2a38] text-[#7d8a98] hover:border-[#FF6B6B] hover:text-[#c9d1d9]'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                            <div className="col-span-1 space-y-4">
                                <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[rgba(255,107,107,0.12)] flex items-center justify-center rounded-md">
                                        <Building2 className="w-6 h-6 text-[#FF6B6B]" />
                                    </div>
                                    <div>
                                        <div className="font-['Oswald'] text-[10px] font-semibold text-[#4a5567] uppercase tracking-[0.1em] mb-0.5">Organisation</div>
                                        <div className="font-['Oswald'] text-lg font-semibold text-[#c9d1d9]">{stats.companyName}</div>
                                    </div>
                                </div>

                                <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[rgba(74,222,128,0.12)] flex items-center justify-center rounded-md">
                                        <Users className="w-6 h-6 text-[#4ADE80]" />
                                    </div>
                                    <div>
                                        <div className="font-['Oswald'] text-[10px] font-semibold text-[#4a5567] uppercase tracking-[0.1em] mb-0.5">Active Reps</div>
                                        <div className="font-['Oswald'] text-lg font-semibold text-[#c9d1d9]">{stats.totalMembers}</div>
                                    </div>
                                </div>

                                <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5 h-[350px]">
                                    <h3 className="card-title font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9] mb-4">Call Distribution</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <PieChart>
                                            <Pie data={chartData} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="calls" nameKey="member">
                                                {chartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#151c25', border: '1px solid #1e2a38', borderRadius: '8px', color: '#c9d1d9', fontSize: '11px' }} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <div className="bg-[#151c25] border border-[#1e2a38] rounded-lg overflow-hidden h-full flex flex-col">
                                    <div className="p-5 border-b border-[#1e2a38] flex justify-between items-center">
                                        <h3 className="card-title font-['Oswald'] text-sm font-semibold uppercase tracking-[0.05em] text-[#c9d1d9] mb-0">Team Leaderboard</h3>
                                        <span className="text-[10px] font-semibold text-[#FF6B6B] uppercase tracking-[0.05em] px-2 py-0.5 bg-[rgba(255,107,107,0.12)] rounded">Live Ranking</span>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="table-os w-full text-left">
                                            <thead>
                                                <tr>
                                                    <th className="text-left font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a5567] p-3 border-b border-[#1e2a38]">Rank</th>
                                                    <th className="text-left font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a5567] p-3 border-b border-[#1e2a38]">User</th>
                                                    <th className="text-center font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a5567] p-3 border-b border-[#1e2a38]">XP Points</th>
                                                    <th className="text-left font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a5567] p-3 border-b border-[#1e2a38]">Level</th>
                                                    <th className="text-right font-['Oswald'] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4a5567] p-3 border-b border-[#1e2a38]">Trend</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leaderboard.map((u, index) => (
                                                    <motion.tr key={u.name} whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }} className="group transition-colors">
                                                        <td className="p-3 border-b border-[#1e2a38] text-xs text-[#7d8a98]">
                                                            <span className={`flex items-center justify-center w-7 h-7 rounded-md font-bold text-[10px]
                                                                ${index === 0 ? 'bg-[rgba(251,191,36,0.12)] text-[#FBBF24]' : index === 1 ? 'bg-[rgba(192,192,192,0.12)] text-[#c9d1d9]' : index === 2 ? 'bg-[rgba(205,127,50,0.12)] text-[#FBBF24]' : 'bg-[rgba(74,85,103,0.15)] text-[#4a5567]'}`}>
                                                                {u.rank}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 border-b border-[#1e2a38] text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-[#c9d1d9]">{u.name}</span>
                                                                {index === 0 && <Flame className="w-3.5 h-3.5 text-[#FF6B6B] animate-pulse" />}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 border-b border-[#1e2a38] text-center text-[#FF6B6B] font-['JetBrains_Mono'] text-xs font-semibold">{u.xp.toLocaleString()}</td>
                                                        <td className="p-3 border-b border-[#1e2a38]">
                                                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] rounded
                                                                ${u.level === 'Elite' ? 'bg-[rgba(167,139,250,0.12)] text-[#A78BFA]' : u.level === 'Pro' ? 'bg-[rgba(255,107,107,0.12)] text-[#FF6B6B]' : 'bg-[rgba(74,85,103,0.15)] text-[#4a5567]'}`}>
                                                                {u.level}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 border-b border-[#1e2a38] text-right">
                                                            <div className="flex flex-col items-end">
                                                                {u.trend === 'up' ? <ArrowUpCircle className="text-[#4ADE80] w-4 h-4" /> : <MinusCircle className="text-[#4a5567] w-4 h-4" />}
                                                                <span className="text-[9px] font-medium text-[#4a5567] mt-0.5">{u.momentumScore > 0 ? `+${u.momentumScore}` : u.momentumScore} Velocity</span>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <SkillHeatmap teamData={heatmapData} methodology={heatmapMethodology} />
                        </div>
                    </>
                )}

                {/* ── Playbooks Tab ── */}
                {activeTab === 'playbooks' && (
                    <div>
                        <PlaybookManager />
                    </div>
                )}
            </div>
        </div>
    );
}

function MemberCard({ member, delay }: { member: Member; delay: number }) {
    const initials = getInitials(member.name || member.email || '?');
    const avatarColors = [
        { bg: 'bg-[rgba(74,222,128,0.12)]', text: 'text-[#4ADE80]' },
        { bg: 'bg-[rgba(96,165,250,0.12)]', text: 'text-[#60A5FA]' },
        { bg: 'bg-[rgba(167,139,250,0.12)]', text: 'text-[#A78BFA]' },
        { bg: 'bg-[rgba(251,191,36,0.12)]', text: 'text-[#FBBF24]' },
        { bg: 'bg-[rgba(255,107,107,0.12)]', text: 'text-[#FF6B6B]' },
    ];
    const colorIdx = (member.name?.charCodeAt(0) ?? 0) % avatarColors.length;
    const avatarColor = avatarColors[colorIdx];

    const xp = member.total_xp || 0;
    const levelLabel = member.mastery_level || 'Rookie';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="bg-[#151c25] border border-[#1e2a38] rounded-lg p-5 hover:border-[#253345] transition-colors"
        >
            {/* Top row: avatar + name + role badge */}
            <div className="flex items-center gap-2.5 mb-3.5">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center font-['Oswald'] text-[11px] font-bold flex-shrink-0 ${avatarColor.bg} ${avatarColor.text}`}>
                    {initials}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-['Oswald'] text-sm font-semibold text-[#c9d1d9] truncate">{member.name || 'Unnamed'}</p>
                    <p className="text-xs text-[#7d8a98] truncate">{member.sales_role || 'BDR'}</p>
                </div>
                <RoleBadge role={member.role} />
            </div>

            {/* Stats row: XP, Level, Email indicator */}
            <div className="grid grid-cols-3 gap-3 mb-3.5">
                <div className="text-center">
                    <div className="font-['Oswald'] text-[18px] font-semibold leading-none text-[#FF6B6B]">{xp.toLocaleString()}</div>
                    <div className="text-[10px] text-[#4a5567] mt-0.5">XP</div>
                </div>
                <div className="text-center">
                    <div className="font-['Oswald'] text-[18px] font-semibold leading-none text-[#c9d1d9]">
                        <MasteryBadge level={levelLabel} />
                    </div>
                    <div className="text-[10px] text-[#4a5567] mt-0.5">Level</div>
                </div>
                <div className="text-center">
                    <div className="font-['Oswald'] text-[18px] font-semibold leading-none text-[#c9d1d9]">
                        <Star className="w-4 h-4 mx-auto text-[#FBBF24]" />
                    </div>
                    <div className="text-[10px] text-[#4a5567] mt-0.5">Active</div>
                </div>
            </div>

            {/* Bottom: email */}
            <div className="flex items-center gap-1.5 pt-2.5 border-t border-[#1e2a38] text-[10px] text-[#4a5567]">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{member.email}</span>
            </div>
        </motion.div>
    );
}
