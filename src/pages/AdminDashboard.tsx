import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Users, Building2, TrendingUp, Award, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { showSuccess, showError, showInfo } from '../utils/toast';

const PAGE_SIZE = 25;

interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    teamId: string | null;
    team: { name: string } | null;
    totalXP: number;
    createdAt: string;
}

interface Team {
    id: string;
    name: string;
    description: string | null;
    members: Array<{ id: string; name: string; email: string; role: string }>;
    _count: { members: number };
}

interface PlatformAnalytics {
    totalUsers: number;
    totalTeams: number;
    totalPitches: number;
    totalXP: number;
    averagePitchScore: number;
    recentActivity: {
        pitchesLast30Days: number;
        newUsersLast30Days: number;
    };
    usersByRole: Record<string, number>;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teams'>('overview');
    const [page, setPage] = useState(0);
    const [totalUserCount, setTotalUserCount] = useState(0);
    const [newTeamName, setNewTeamName] = useState('');

    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserTeamId, setNewUserTeamId] = useState('');
    const [growthBadge, setGrowthBadge] = useState<string>('—');

    useEffect(() => {
        fetchData();
    }, [page]);

    useEffect(() => {
        const fetchGrowth = async () => {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            const { count: recent } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString());

            const { count: prior } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sixtyDaysAgo.toISOString())
                .lt('created_at', thirtyDaysAgo.toISOString());

            if (prior && prior > 0 && recent !== null) {
                const pct = Math.round(((recent - prior) / prior) * 100);
                setGrowthBadge(`${pct >= 0 ? '+' : ''}${pct}%`);
            } else if (recent && recent > 0) {
                setGrowthBadge('New');
            } else {
                setGrowthBadge('0%');
            }
        };
        fetchGrowth();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const usersPromise = supabase
                .from('profiles')
                .select('*, team:teams(*)', { count: 'exact' })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Data fetch timeout')), 10000)
            );

            const { data: usersData, error: usersError, count: userCount } = await Promise.race([usersPromise, timeoutPromise]) as any;

            if (usersError) throw usersError;

            setTotalUserCount(userCount || 0);

            const mappedUsers = usersData.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                teamId: u.team_id,
                team: u.team,
                totalXP: u.total_xp,
                createdAt: u.created_at
            }));

            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*, members:profiles(id, name, email, role)');

            if (teamsError) throw teamsError;

            const mappedTeams = teamsData.map((t: any) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                members: t.members,
                _count: { members: t.members.length }
            }));

            // Real pitch stats
            const { count: pitchesCount } = await supabase
                .from('pitches')
                .select('*', { count: 'exact', head: true });

            const { data: pitchStats } = await supabase
                .from('pitches')
                .select('score, created_at');

            const avgScore = pitchStats && pitchStats.length > 0
                ? Math.round(pitchStats.reduce((s, p) => s + (p.score || 0), 0) / pitchStats.length)
                : 0;

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const pitchesLast30Days = pitchStats
                ? pitchStats.filter(p => p.created_at >= thirtyDaysAgo).length
                : 0;

            const stats: PlatformAnalytics = {
                totalUsers: userCount || mappedUsers.length,
                totalTeams: mappedTeams.length || 0,
                totalPitches: pitchesCount || 0,
                totalXP: mappedUsers.reduce((acc: number, u: any) => acc + (u.totalXP || 0), 0),
                averagePitchScore: avgScore,
                recentActivity: {
                    pitchesLast30Days,
                    newUsersLast30Days: mappedUsers.filter((u: any) => new Date(u.createdAt) > new Date(thirtyDaysAgo)).length
                },
                usersByRole: {
                    user: mappedUsers.filter((u: any) => u.role === 'user').length,
                    team_lead: mappedUsers.filter((u: any) => u.role === 'team_lead').length,
                    admin: mappedUsers.filter((u: any) => u.role === 'admin').length
                }
            };

            setUsers(mappedUsers);
            setTeams(mappedTeams);
            setAnalytics(stats);
        } catch (error) {
            console.error('Failed to fetch admin data', error);
            showError('Failed to load admin data', 'Check console for details');
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId: string, role: string) => {
        try {
            const { error } = await supabase.rpc('admin_set_user_role', {
                target_user_id: userId,
                new_role: role
            });
            if (error) throw error;
            setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
            showSuccess('Role updated');
        } catch (error: any) {
            showError('Failed to update role', error.message);
        }
    };

    const deleteUser = async (userId: string) => {
        const userName = users.find(u => u.id === userId)?.name || 'this user';
        if (!window.confirm(`Delete ${userName}? This cannot be undone.`)) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Not authenticated');

            const response = await supabase.functions.invoke('admin-delete-user', {
                body: { targetUserId: userId },
            });

            if (response.error) throw response.error;

            setUsers(users.filter(u => u.id !== userId));
            showSuccess('User deleted', 'Auth account and profile removed');
        } catch (error: any) {
            showError('Failed to delete user', error.message);
        }
    };

    const createTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            const { data, error } = await supabase
                .from('teams')
                .insert({ name: newTeamName })
                .select()
                .single();
            if (error) throw error;
            setTeams([...teams, { ...data, members: [], _count: { members: 0 } }]);
            setNewTeamName('');
            showSuccess('Team created');
        } catch (error: any) {
            showError('Failed to create team', error.message);
        }
    };

    const createUser = async () => {
        if (!newUserEmail || !newUserPassword || !newUserName) {
            showError('Please fill in all fields', 'Email, Name, and Password are required');
            return;
        }

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
            );

            const { data, error } = await tempSupabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: { data: { name: newUserName, role: 'user' } }
            });

            if (error) throw error;

            if (data.user) {
                if (newUserTeamId) {
                    await supabase.from('profiles').update({ team_id: newUserTeamId }).eq('id', data.user.id);
                }
                showSuccess('User created', `ID: ${data.user.id}`);
                showInfo('Email confirmation sent to ' + newUserEmail);
                await fetchData();
                setNewUserEmail('');
                setNewUserName('');
                setNewUserPassword('');
                setNewUserTeamId('');
            }
        } catch (error: any) {
            showError('Failed to create user', error.message);
        }
    };

    const assignUserToTeam = async (userId: string, teamId: string | null) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ team_id: teamId })
                .eq('id', userId);
            if (error) throw error;
            fetchData();
        } catch (error: any) {
            showError('Failed to assign team', error.message);
        }
    };

    if (loading) {
        return (
            <div className="layout-shell flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[rgb(var(--border-default))] border-t-[rgb(var(--accent-primary))]"></div>
            </div>
        );
    }

    return (
        <div className="layout-shell p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 animate-in-up">
                    <h1 className="text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">Admin Dashboard</h1>
                    <p className="text-[rgb(var(--text-secondary))]">Manage users, teams, and monitor platform performance</p>
                </div>

                <div className="flex gap-2 mb-8 animate-in-up p-1 bg-[rgb(var(--bg-surface-raised))] rounded-[var(--radius-lg)] w-fit border border-[rgb(var(--border-default))]" style={{ animationDelay: '0.1s' }}>
                    {(['overview', 'users', 'teams'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-[var(--radius-md)] font-medium text-sm transition-all ${activeTab === tab
                                ? 'bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-primary))] shadow-sm border border-[rgb(var(--border-subtle))]'
                                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))]'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && analytics && (
                    <div className="space-y-8 animate-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="card-os p-6 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 rounded-lg bg-[rgb(var(--bg-canvas))] text-[rgb(var(--accent-primary))]">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-medium text-status-success flex items-center gap-1">
                                        {growthBadge} <TrendingUp className="w-3 h-3" />
                                    </span>
                                </div>
                                <div>
                                    <p className="text-3xl font-display font-bold text-[rgb(var(--text-primary))]">{analytics.totalUsers}</p>
                                    <p className="text-[rgb(var(--text-muted))] text-sm">Total Users</p>
                                </div>
                            </div>

                            <div className="card-os p-6 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 rounded-lg bg-[rgb(var(--bg-canvas))] text-blue-500">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl font-display font-bold text-[rgb(var(--text-primary))]">{analytics.totalTeams}</p>
                                    <p className="text-[rgb(var(--text-muted))] text-sm">Total Teams</p>
                                </div>
                            </div>

                            <div className="card-os p-6 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 rounded-lg bg-[rgb(var(--bg-canvas))] text-purple-500">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl font-display font-bold text-[rgb(var(--text-primary))]">{analytics.totalPitches}</p>
                                    <p className="text-[rgb(var(--text-muted))] text-sm">Total Pitches</p>
                                </div>
                            </div>

                            <div className="card-os p-6 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 rounded-lg bg-[rgb(var(--bg-canvas))] text-status-warning">
                                        <Award className="h-6 w-6" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-3xl font-display font-bold text-[rgb(var(--text-primary))]">{analytics.averagePitchScore}</p>
                                    <p className="text-[rgb(var(--text-muted))] text-sm">Avg Pitch Score</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 card-os p-6">
                                <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))] mb-4">Activity Overview</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-4 rounded-lg bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-subtle))]">
                                        <p className="text-[rgb(var(--text-muted))] text-sm mb-1">New Users (30d)</p>
                                        <p className="text-2xl font-bold text-[rgb(var(--text-primary))]">{analytics.recentActivity.newUsersLast30Days}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-subtle))]">
                                        <p className="text-[rgb(var(--text-muted))] text-sm mb-1">Pitches Recorded (30d)</p>
                                        <p className="text-2xl font-bold text-[rgb(var(--text-primary))]">{analytics.recentActivity.pitchesLast30Days}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="card-os p-6">
                                <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))] mb-4">Users by Role</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[rgb(var(--accent-primary))]"></div>
                                            <span className="text-[rgb(var(--text-secondary))] text-sm">Employees</span>
                                        </div>
                                        <span className="font-bold text-[rgb(var(--text-primary))]">{analytics.usersByRole.user || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-[rgb(var(--text-secondary))] text-sm">Managers</span>
                                        </div>
                                        <span className="font-bold text-[rgb(var(--text-primary))]">{analytics.usersByRole.team_lead || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                            <span className="text-[rgb(var(--text-secondary))] text-sm">Admins</span>
                                        </div>
                                        <span className="font-bold text-[rgb(var(--text-primary))]">{analytics.usersByRole.admin || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="card-os p-6">
                            <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))] mb-4">Create New User</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Name</label>
                                    <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Full Name" className="w-full input-os" />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Email</label>
                                    <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="user@company.com" className="w-full input-os" />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Password</label>
                                    <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Temp Password" className="w-full input-os" />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Team (Optional)</label>
                                    <select value={newUserTeamId} onChange={(e) => setNewUserTeamId(e.target.value)} className="w-full input-os">
                                        <option value="">No Team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="lg:col-span-1">
                                    <button onClick={createUser} className="w-full btn-primary h-[42px] flex items-center justify-center">
                                        Create User
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card-os p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] font-medium border-b border-[rgb(var(--border-default))]">
                                        <tr>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Role</th>
                                            <th className="p-4">Team</th>
                                            <th className="p-4">XP</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-[rgb(var(--bg-surface-raised))] transition-colors">
                                                <td className="p-4">
                                                    <div>
                                                        <p className="text-[rgb(var(--text-primary))] font-medium">{user.name || 'Unnamed'}</p>
                                                        <p className="text-[rgb(var(--text-muted))] text-xs">{user.email}</p>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                                                        className="bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] rounded px-2 py-1 text-[rgb(var(--text-secondary))] text-xs focus:border-[rgb(var(--accent-primary))] focus:outline-none"
                                                    >
                                                        <option value="user">Employee</option>
                                                        <option value="team_lead">Manager</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={user.teamId || ''}
                                                        onChange={(e) => assignUserToTeam(user.id, e.target.value || null)}
                                                        className="bg-[rgb(var(--bg-canvas))] border border-[rgb(var(--border-default))] rounded px-2 py-1 text-[rgb(var(--text-secondary))] text-xs focus:border-[rgb(var(--accent-primary))] focus:outline-none"
                                                    >
                                                        <option value="">No Team</option>
                                                        {teams.map(team => (
                                                            <option key={team.id} value={team.id}>{team.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-4 text-[rgb(var(--text-primary))] font-mono">{user.totalXP}</td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => deleteUser(user.id)}
                                                        className="p-2 text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalUserCount > PAGE_SIZE && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface-raised))]">
                                    <span className="text-xs text-[rgb(var(--text-muted))]">
                                        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalUserCount)} of {totalUserCount}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 text-[rgb(var(--text-secondary))] disabled:opacity-30 hover:text-[rgb(var(--text-primary))] transition-colors">
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-xs text-[rgb(var(--text-secondary))] min-w-[60px] text-center">
                                            Page {page + 1} of {Math.ceil(totalUserCount / PAGE_SIZE)}
                                        </span>
                                        <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalUserCount} className="p-1 text-[rgb(var(--text-secondary))] disabled:opacity-30 hover:text-[rgb(var(--text-primary))] transition-colors">
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Teams Tab */}
                {activeTab === 'teams' && (
                    <div className="space-y-6 animate-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="card-os p-6">
                            <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))] mb-4">Create New Team</h3>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team name" className="flex-1 input-os" />
                                <button onClick={createTeam} className="btn-primary whitespace-nowrap">Create Team</button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.map(team => (
                                <div key={team.id} className="card-os p-6 hover:border-[rgb(var(--accent-primary)/0.5)] transition-colors group">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-[rgb(var(--bg-surface-raised))] rounded-lg text-[rgb(var(--accent-primary))] group-hover:scale-110 transition-transform">
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-[rgb(var(--text-primary))] font-bold">{team.name}</h4>
                                            <p className="text-[rgb(var(--text-muted))] text-sm">{team._count.members} members</p>
                                        </div>
                                    </div>
                                    {team.members.length > 0 && (
                                        <div className="space-y-2 pt-4 border-t border-[rgb(var(--border-subtle))]">
                                            {team.members.slice(0, 5).map(member => (
                                                <div key={member.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-[rgb(var(--text-secondary))]">{member.name || member.email}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${member.role === 'team_lead' ? 'bg-status-warning/10 text-status-warning' : 'bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-muted))]'}`}>
                                                        {member.role === 'team_lead' ? 'Manager' : 'Employee'}
                                                    </span>
                                                </div>
                                            ))}
                                            {team.members.length > 5 && (
                                                <p className="text-[rgb(var(--text-muted))] text-xs pt-1">+{team.members.length - 5} more</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
