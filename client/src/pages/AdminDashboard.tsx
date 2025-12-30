import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Users, Building2, TrendingUp, Award, Trash2, Shield } from 'lucide-react';

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
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teams'>('overview');
    const [newTeamName, setNewTeamName] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch Users with Team
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select('*, team:teams(*)');

            if (usersError) throw usersError;

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

            // Fetch Teams with Members count
            // Note: select(..., members:profiles(count)) returns count as [{ count: N }]
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*, members:profiles(id, name, email, role)');

            if (teamsError) throw teamsError;

            const mappedTeams = teamsData.map((t: any) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                members: t.members,
                _count: { members: t.members.length } // Calculate count from fetched members
            }));

            // Fetch Analytics (Counts)
            const { count: pitchesCount } = await supabase
                .from('pitches')
                .select('*', { count: 'exact', head: true });

            const stats = {
                totalUsers: mappedUsers.length,
                totalTeams: mappedTeams.length,
                totalPitches: pitchesCount || 0,
                totalXP: mappedUsers.reduce((acc: number, u: any) => acc + (u.totalXP || 0), 0),
                averagePitchScore: 75, // Placeholder or fetch avg
                recentActivity: {
                    pitchesLast30Days: 0, // Placeholder
                    newUsersLast30Days: mappedUsers.filter((u: any) => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
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
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId: string, role: string) => {
        try {
            // Update profile role
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId);

            if (error) throw error;

            // Note: This relies on Supabase Auth keeping roles in sync via trigger if we set that up, 
            // OR the app relies on 'profiles' table for role checks (which ours dies).

            setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        } catch (error) {
            console.error('Failed to update user role', error);
        }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            // Only delete profile. Auth user remains but becomes "orphan" or we must delete it via Edge Function.
            // For now, delete profile.
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Failed to delete user', error);
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
        } catch (error) {
            console.error('Failed to create team', error);
        }
    };

    const assignUserToTeam = async (userId: string, teamId: string | null) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ team_id: teamId })
                .eq('id', userId);

            if (error) throw error;

            fetchData(); // Refresh to get updated data
        } catch (error) {
            console.error('Failed to assign user to team', error);
        }
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen gradient-dark-bg flex justify-center items-center">
                <div className="glass-card p-8 text-center">
                    <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
                    <p className="text-gray-300">You need admin privileges to access this page.</p>
                </div>
            </div>
        );
    }

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

    return (
        <div className="min-h-screen gradient-dark-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-theme-primary mb-2">Admin Dashboard</h1>
                    <p className="text-theme-muted">Manage users, teams, and monitor platform performance</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    {(['overview', 'users', 'teams'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === tab
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && analytics && (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-theme-muted text-sm">Total Users</p>
                                        <p className="text-3xl font-bold text-theme-primary">{analytics.totalUsers}</p>
                                    </div>
                                    <Users className="h-10 w-10 text-blue-400" />
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-theme-muted text-sm">Total Teams</p>
                                        <p className="text-3xl font-bold text-theme-primary">{analytics.totalTeams}</p>
                                    </div>
                                    <Building2 className="h-10 w-10 text-green-400" />
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-theme-muted text-sm">Total Pitches</p>
                                        <p className="text-3xl font-bold text-theme-primary">{analytics.totalPitches}</p>
                                    </div>
                                    <TrendingUp className="h-10 w-10 text-purple-400" />
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-theme-muted text-sm">Avg Pitch Score</p>
                                        <p className="text-3xl font-bold text-theme-primary">{analytics.averagePitchScore}</p>
                                    </div>
                                    <Award className="h-10 w-10 text-yellow-400" />
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-bold text-theme-primary mb-4">Last 30 Days</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-theme-muted text-sm">New Users</p>
                                    <p className="text-2xl font-bold text-theme-primary">{analytics.recentActivity.newUsersLast30Days}</p>
                                </div>
                                <div>
                                    <p className="text-theme-muted text-sm">Pitches Recorded</p>
                                    <p className="text-2xl font-bold text-theme-primary">{analytics.recentActivity.pitchesLast30Days}</p>
                                </div>
                            </div>
                        </div>

                        {/* User Role Breakdown */}
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-bold text-theme-primary mb-4">Users by Role</h3>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-theme-primary">{analytics.usersByRole.user || 0}</p>
                                    <p className="text-theme-muted text-sm">Employees</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-theme-primary">{analytics.usersByRole.team_lead || 0}</p>
                                    <p className="text-theme-muted text-sm">Managers</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-theme-primary">{analytics.usersByRole.admin || 0}</p>
                                    <p className="text-theme-muted text-sm">Admins</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-4 text-theme-muted font-medium">User</th>
                                        <th className="text-left p-4 text-theme-muted font-medium">Role</th>
                                        <th className="text-left p-4 text-theme-muted font-medium">Team</th>
                                        <th className="text-left p-4 text-theme-muted font-medium">XP</th>
                                        <th className="text-left p-4 text-theme-muted font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4">
                                                <div>
                                                    <p className="text-theme-primary font-medium">{user.name || 'Unnamed'}</p>
                                                    <p className="text-theme-muted text-sm">{user.email}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
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
                                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                                                >
                                                    <option value="">No Team</option>
                                                    {teams.map(team => (
                                                        <option key={team.id} value={team.id}>{team.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-4 text-white">{user.totalXP}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => deleteUser(user.id)}
                                                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Teams Tab */}
                {activeTab === 'teams' && (
                    <div className="space-y-6">
                        {/* Create Team Form */}
                        <div className="glass-card p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Create New Team</h3>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="Team name"
                                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400"
                                />
                                <button
                                    onClick={createTeam}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Create Team
                                </button>
                            </div>
                        </div>

                        {/* Teams List */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.map(team => (
                                <div key={team.id} className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Building2 className="h-8 w-8 text-purple-400" />
                                        <div>
                                            <h4 className="text-white font-bold">{team.name}</h4>
                                            <p className="text-gray-400 text-sm">{team._count.members} members</p>
                                        </div>
                                    </div>
                                    {team.members.length > 0 && (
                                        <div className="space-y-2">
                                            {team.members.slice(0, 5).map(member => (
                                                <div key={member.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-theme-muted">{member.name || member.email}</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${member.role === 'team_lead'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-theme-secondary/20 text-theme-muted'
                                                        }`}>
                                                        {member.role === 'team_lead' ? 'Manager' : 'Employee'}
                                                    </span>
                                                </div>
                                            ))}
                                            {team.members.length > 5 && (
                                                <p className="text-theme-muted text-sm">+{team.members.length - 5} more</p>
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
