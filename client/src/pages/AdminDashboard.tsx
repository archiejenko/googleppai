import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
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
            const [usersRes, teamsRes, analyticsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/teams'),
                api.get('/admin/analytics'),
            ]);
            setUsers(usersRes.data);
            setTeams(teamsRes.data);
            setAnalytics(analyticsRes.data);
        } catch (error) {
            console.error('Failed to fetch admin data', error);
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId: string, role: string) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, { role });
            setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        } catch (error) {
            console.error('Failed to update user role', error);
        }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Failed to delete user', error);
        }
    };

    const createTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            const res = await api.post('/team', { name: newTeamName });
            setTeams([...teams, { ...res.data, members: [], _count: { members: 0 } }]);
            setNewTeamName('');
        } catch (error) {
            console.error('Failed to create team', error);
        }
    };

    const assignUserToTeam = async (userId: string, teamId: string | null) => {
        try {
            await api.post('/admin/users/assign-team', { userId, teamId });
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
                    <h1 className="text-4xl font-extrabold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-gray-300">Manage users, teams, and monitor platform performance</p>
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
                                        <p className="text-gray-300 text-sm">Total Users</p>
                                        <p className="text-3xl font-bold text-white">{analytics.totalUsers}</p>
                                    </div>
                                    <Users className="h-10 w-10 text-blue-400" />
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-300 text-sm">Total Teams</p>
                                        <p className="text-3xl font-bold text-white">{analytics.totalTeams}</p>
                                    </div>
                                    <Building2 className="h-10 w-10 text-green-400" />
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-300 text-sm">Total Pitches</p>
                                        <p className="text-3xl font-bold text-white">{analytics.totalPitches}</p>
                                    </div>
                                    <TrendingUp className="h-10 w-10 text-purple-400" />
                                </div>
                            </div>
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-300 text-sm">Avg Pitch Score</p>
                                        <p className="text-3xl font-bold text-white">{analytics.averagePitchScore}</p>
                                    </div>
                                    <Award className="h-10 w-10 text-yellow-400" />
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Last 30 Days</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-gray-300 text-sm">New Users</p>
                                    <p className="text-2xl font-bold text-white">{analytics.recentActivity.newUsersLast30Days}</p>
                                </div>
                                <div>
                                    <p className="text-gray-300 text-sm">Pitches Recorded</p>
                                    <p className="text-2xl font-bold text-white">{analytics.recentActivity.pitchesLast30Days}</p>
                                </div>
                            </div>
                        </div>

                        {/* User Role Breakdown */}
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Users by Role</h3>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-white">{analytics.usersByRole.user || 0}</p>
                                    <p className="text-gray-300 text-sm">Employees</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-white">{analytics.usersByRole.team_lead || 0}</p>
                                    <p className="text-gray-300 text-sm">Managers</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-white">{analytics.usersByRole.admin || 0}</p>
                                    <p className="text-gray-300 text-sm">Admins</p>
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
                                        <th className="text-left p-4 text-gray-300 font-medium">User</th>
                                        <th className="text-left p-4 text-gray-300 font-medium">Role</th>
                                        <th className="text-left p-4 text-gray-300 font-medium">Team</th>
                                        <th className="text-left p-4 text-gray-300 font-medium">XP</th>
                                        <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4">
                                                <div>
                                                    <p className="text-white font-medium">{user.name || 'Unnamed'}</p>
                                                    <p className="text-gray-400 text-sm">{user.email}</p>
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
                                                    <span className="text-gray-300">{member.name || member.email}</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${member.role === 'team_lead'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-white/10 text-gray-400'
                                                        }`}>
                                                        {member.role === 'team_lead' ? 'Manager' : 'Employee'}
                                                    </span>
                                                </div>
                                            ))}
                                            {team.members.length > 5 && (
                                                <p className="text-gray-400 text-sm">+{team.members.length - 5} more</p>
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
