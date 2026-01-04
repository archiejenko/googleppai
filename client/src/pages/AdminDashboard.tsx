import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; // For temp client
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

    // New User State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserTeamId, setNewUserTeamId] = useState('');

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

            // Fetch Analytics (Counts)
            const { count: pitchesCount } = await supabase
                .from('pitches')
                .select('*', { count: 'exact', head: true });

            const stats = {
                totalUsers: mappedUsers.length,
                totalTeams: mappedTeams.length || 0,
                totalPitches: pitchesCount || 0,
                totalXP: mappedUsers.reduce((acc: number, u: any) => acc + (u.totalXP || 0), 0),
                averagePitchScore: 75, // Placeholder
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
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId);

            if (error) throw error;
            setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
        } catch (error) {
            console.error('Failed to update user role', error);
        }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
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

    const createUser = async () => {
        if (!newUserEmail || !newUserPassword || !newUserName) {
            alert('Please fill in all fields (Email, Name, Password)');
            return;
        }

        try {
            // Use a temporary client to avoid logging out the admin
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data, error } = await tempSupabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        name: newUserName,
                        role: 'user', // Default, admin can change later
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // Manually insert profile/team if not triggered (redundancy)
                // Also update team if provided
                if (newUserTeamId) {
                    // We need to update the profile that was just likely created by trigger
                    // Or wait a sec? Triggers are fast.
                    // But we can just use our admin client to update it.
                    // We need the ID.
                    await supabase.from('profiles').update({ team_id: newUserTeamId }).eq('id', data.user.id);
                }

                alert(`User created successfully! ID: ${data.user.id}`);
                fetchData(); // Refresh list
                setNewUserEmail('');
                setNewUserName('');
                setNewUserPassword('');
                setNewUserTeamId('');
            }

        } catch (error: any) {
            console.error('Failed to create user', error);
            alert('Failed to create user: ' + error.message);
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
        } catch (error) {
            console.error('Failed to assign user to team', error);
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
                {/* Header */}
                <div className="mb-8 animate-in-up">
                    <h1 className="text-4xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">Admin Dashboard</h1>
                    <p className="text-[rgb(var(--text-secondary))]">Manage users, teams, and monitor platform performance</p>
                </div>

                {/* Tabs */}
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
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="card-os p-6 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 rounded-lg bg-[rgb(var(--bg-canvas))] text-[rgb(var(--accent-primary))]">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-medium text-status-success flex items-center gap-1">
                                        +12% <TrendingUp className="w-3 h-3" />
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

                        {/* Recent Activity */}
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

                            {/* User Role Breakdown */}
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
                        {/* Create User Form */}
                        <div className="card-os p-6">
                            <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))] mb-4">Create New User</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        placeholder="Full Name"
                                        className="w-full input-os"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        placeholder="user@company.com"
                                        className="w-full input-os"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        placeholder="Temp Password"
                                        className="w-full input-os"
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <label className="block text-xs font-semibold text-[rgb(var(--text-secondary))] mb-1">Team (Optional)</label>
                                    <select
                                        value={newUserTeamId}
                                        onChange={(e) => setNewUserTeamId(e.target.value)}
                                        className="w-full input-os"
                                    >
                                        <option value="">No Team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="lg:col-span-1">
                                    <button
                                        onClick={createUser}
                                        className="w-full btn-primary h-[42px] flex items-center justify-center"
                                    >
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
                        </div>
                    </div>
                )}

                {/* Teams Tab */}
                {activeTab === 'teams' && (
                    <div className="space-y-6 animate-in-up" style={{ animationDelay: '0.2s' }}>
                        {/* Create Team Form */}
                        <div className="card-os p-6">
                            <h3 className="text-lg font-display font-bold text-[rgb(var(--text-primary))] mb-4">Create New Team</h3>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="Team name"
                                    className="flex-1 input-os"
                                />
                                <button
                                    onClick={createTeam}
                                    className="btn-primary whitespace-nowrap"
                                >
                                    Create Team
                                </button>
                            </div>
                        </div>

                        {/* Teams List */}
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
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${member.role === 'team_lead'
                                                        ? 'bg-status-warning/10 text-status-warning'
                                                        : 'bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-muted))]'
                                                        }`}>
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
