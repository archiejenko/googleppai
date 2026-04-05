import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, Building2, AlertCircle, ArrowUpCircle, MinusCircle, Flame, Mail, Shield, Star } from 'lucide-react';
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
        admin: { label: 'Admin', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
        team_lead: { label: 'Team Lead', className: 'bg-accent/20 text-accent border-accent/30' },
        user: { label: 'Rep', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    };
    const { label, className } = map[role] ?? map.user;
    return (
        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${className}`}>
            {label}
        </span>
    );
}

function MasteryBadge({ level }: { level: string | null }) {
    if (!level) return null;
    const map: Record<string, string> = {
        Elite: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        Pro: 'bg-accent/20 text-accent border-accent/30',
        Intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        Rookie: 'bg-slate-700 text-slate-400 border-slate-600',
    };
    const cls = map[level] ?? map.Rookie;
    return (
        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${cls}`}>
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
            <div className="layout-shell flex items-center justify-center bg-bg-canvas">
                <div className="animate-spin w-12 h-12 border-4 border-accent border-t-transparent"></div>
            </div>
        );
    }

    // Group members by role priority
    const leads = members.filter(m => m.role === 'admin' || m.role === 'team_lead');
    const reps = members.filter(m => m.role === 'user');

    return (
        <div className="layout-shell p-6 md:p-12 bg-bg-canvas min-h-screen text-text-primary">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 animate-in-up">
                    <div>
                        <h1 className="font-display font-bold text-4xl mb-2">Team</h1>
                        <p className="text-slate-400">{stats.totalMembers} member{stats.totalMembers !== 1 ? 's' : ''} · {stats.companyName}</p>
                    </div>

                    <div className="flex gap-2 bg-bg-surface p-1 border border-border-default">
                        {(['members', 'analytics', 'playbooks'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={`px-5 py-2 text-sm font-bold transition-all capitalize ${activeTab === t ? 'bg-accent text-white' : 'text-text-muted hover:text-text-secondary'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-500 p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* ── Members Tab ── */}
                {activeTab === 'members' && (
                    <div className="animate-in-up space-y-10">
                        {/* Leadership */}
                        {leads.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield className="w-4 h-4 text-accent" />
                                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Leadership</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {leads.map((m, i) => (
                                        <MemberCard key={m.id} member={m} delay={i * 0.05} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reps */}
                        {reps.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-4 h-4 text-text-muted" />
                                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-text-muted">Sales Representatives</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {reps.map((m, i) => (
                                        <MemberCard key={m.id} member={m} delay={i * 0.04} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {members.length === 0 && !loading && (
                            <div className="text-center py-20 text-text-muted">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>No team members found.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Analytics Tab ── */}
                {activeTab === 'analytics' && (
                    <>
                        <div className="flex justify-end mb-6">
                            <div className="flex bg-bg-surface p-1 border border-border-default">
                                {(['daily', 'weekly', 'monthly'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-2 text-sm font-bold transition-all capitalize ${filter === f ? 'bg-accent text-white' : 'text-text-muted hover:text-text-secondary'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 animate-in-up">
                            <div className="col-span-1 space-y-8">
                                <div className="card-os p-8 bg-bg-surface border-border-default flex items-center gap-6">
                                    <div className="w-16 h-16 bg-accent/20 flex items-center justify-center border border-accent/20">
                                        <Building2 className="w-8 h-8 text-accent" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-1">Organisation</div>
                                        <div className="text-2xl font-display font-bold">{stats.companyName}</div>
                                    </div>
                                </div>

                                <div className="card-os p-8 bg-slate-900 border-slate-800 flex items-center gap-6">
                                    <div className="w-16 h-16 bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                        <Users className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Active Reps</div>
                                        <div className="text-2xl font-display font-bold">{stats.totalMembers}</div>
                                    </div>
                                </div>

                                <div className="card-os p-6 bg-slate-900 border-slate-800 h-[350px]">
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Call Distribution</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={chartData} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="calls" nameKey="member">
                                                {chartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#f8fafc' }} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                <div className="card-os bg-slate-900 border-slate-800 overflow-hidden shadow-2xl h-full flex flex-col">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="text-xl font-bold">Team Leaderboard</h3>
                                        <div className="px-3 py-1 bg-accent/10">
                                            <span className="text-[10px] font-black text-accent uppercase tracking-tighter">Live Ranking</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left">
                                            <thead className="bg-black/20 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                                <tr>
                                                    <th className="p-6">Rank</th>
                                                    <th className="p-6">User</th>
                                                    <th className="p-6 text-center">XP Points</th>
                                                    <th className="p-6">Level</th>
                                                    <th className="p-6 text-right">Trend</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {leaderboard.map((u, index) => (
                                                    <motion.tr key={u.name} whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }} className="group transition-colors">
                                                        <td className="p-6">
                                                            <span className={`flex items-center justify-center w-8 h-8 font-bold text-xs
                                                                ${index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-slate-300 text-black' : index === 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                                {u.rank}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-semibold text-slate-200">{u.name}</span>
                                                                {index === 0 && <Flame className="w-4 h-4 text-orange-500 animate-pulse" />}
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-center text-accent font-mono font-bold">{u.xp.toLocaleString()}</td>
                                                        <td className="p-6">
                                                            <span className={`px-2 py-1 text-[10px] font-black uppercase
                                                                ${u.level === 'Elite' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : u.level === 'Pro' ? 'bg-accent/20 text-accent border border-accent/20' : 'bg-bg-canvas text-text-muted'}`}>
                                                                {u.level}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="flex flex-col items-end">
                                                                {u.trend === 'up' ? <ArrowUpCircle className="text-emerald-500 w-5 h-5" /> : <MinusCircle className="text-slate-600 w-5 h-5" />}
                                                                <span className="text-[10px] font-bold text-text-muted mt-1">{u.momentumScore > 0 ? `+${u.momentumScore}` : u.momentumScore} Velocity</span>
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

                        <div className="mt-8 animate-in-up">
                            <SkillHeatmap teamData={heatmapData} methodology={heatmapMethodology} />
                        </div>
                    </>
                )}

                {/* ── Playbooks Tab ── */}
                {activeTab === 'playbooks' && (
                    <div className="animate-in-up">
                        <PlaybookManager />
                    </div>
                )}
            </div>
        </div>
    );
}

function MemberCard({ member, delay }: { member: Member; delay: number }) {
    const initials = getInitials(member.name || member.email || '?');
    const accentColors = ['bg-accent/20 text-accent', 'bg-emerald-500/20 text-emerald-400', 'bg-purple-500/20 text-purple-400', 'bg-amber-500/20 text-amber-400', 'bg-sky-500/20 text-sky-400'];
    const colorClass = accentColors[(member.name?.charCodeAt(0) ?? 0) % accentColors.length];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="card-os bg-bg-surface border-border-default p-5 flex flex-col gap-4 hover:border-accent/30 transition-colors"
        >
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center font-black text-sm flex-shrink-0 border ${colorClass} border-current/20`}>
                    {initials}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{member.name || 'Unnamed'}</p>
                    <p className="text-xs text-text-muted truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 flex-shrink-0" />{member.email}
                    </p>
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
                <RoleBadge role={member.role} />
                {member.sales_role && (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-border bg-bg-raised text-text-muted">
                        {member.sales_role}
                    </span>
                )}
                <MasteryBadge level={member.mastery_level} />
            </div>

            {/* XP */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                <Star className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="text-xs font-mono font-bold text-accent">{(member.total_xp || 0).toLocaleString()} XP</span>
            </div>
        </motion.div>
    );
}
