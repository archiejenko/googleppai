import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { User, Shield, Briefcase, Key, Save, Eye, EyeOff } from 'lucide-react';

export default function Profile() {
    const { user, updateUser, simulateRole } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Profile State
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        experienceLevel: 'beginner',
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    // Stats State
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        if (!user) return;
        try {
            // Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            // Fetch Stats (Calculate from pitches and profile)
            const { data: pitchesData, error: pitchesError } = await supabase
                .from('pitches')
                .select('score')
                .eq('user_id', user.id);

            if (pitchesError) throw pitchesError;

            const totalSessions = pitchesData.length;
            const avgScore = totalSessions > 0
                ? Math.round(pitchesData.reduce((acc, p) => acc + p.score, 0) / totalSessions)
                : 0;

            const mappedStats = {
                totalXP: profileData.total_xp || 0,
                averageScore: avgScore,
                completedSessions: totalSessions,
                experienceLevel: profileData.experience_level || 'beginner'
            };

            setFormData({
                name: profileData.name || '',
                industry: profileData.industry || '',
                experienceLevel: profileData.experience_level || 'beginner',
            });
            setStats(mappedStats);
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setMessage(null);
        try {
            const updates = {
                name: formData.name,
                industry: formData.industry,
                experience_level: formData.experienceLevel, // map to snake_case
                updated_at: new Date().toISOString(),
            };

            const { error, data } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;

            updateUser({ ...user, ...data }); // Assuming data returns profile fields
            setMessage({ text: 'Profile updated successfully', type: 'success' });
        } catch (error) {
            setMessage({ text: 'Failed to update profile', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ text: 'New passwords do not match', type: 'error' });
            return;
        }

        setIsSaving(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            window.alert('Password successfully changed');
            setMessage({ text: 'Password changed successfully', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setMessage({ text: error.message || 'Failed to change password', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="layout-shell flex items-center justify-center text-[rgb(var(--text-primary))]">Loading profile...</div>;
    }

    return (
        <div className="layout-shell p-6 md:p-8">
            <h1 className="text-3xl font-display font-bold text-[rgb(var(--text-primary))] mb-8">Account Settings</h1>

            {message && (
                <div className={`mb-6 p-4 rounded-[var(--radius-md)] flex items-center ${message.type === 'success' ? 'bg-status-success/10 text-status-success border border-status-success/20' : 'bg-status-danger/10 text-status-danger border border-status-danger/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile & Stats */}
                <div className="space-y-8 lg:col-span-2">
                    {/* User Stats Card */}
                    <div className="card-hero p-8 relative overflow-hidden">
                        <div className="relative z-10 flex items-center space-x-6 mb-8">
                            <div className="h-20 w-20 rounded-full bg-[rgb(var(--accent-primary))] flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_20px_rgb(var(--accent-glow)/0.5)]">
                                {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-display font-bold text-[rgb(var(--text-primary))]">{user?.name}</h2>
                                <p className="text-[rgb(var(--text-secondary))]">{user?.email}</p>
                                <div className="flex items-center mt-3 space-x-2">
                                    <span className="px-2.5 py-1 rounded-full bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-muted))] text-xs font-semibold border border-[rgb(var(--border-subtle))] uppercase tracking-wide">
                                        {user?.role === 'admin' ? 'Administrator' : user?.role === 'team_lead' ? 'Team Lead' : 'User'}
                                    </span>
                                    {stats && (
                                        <span className="px-2.5 py-1 rounded-full bg-[rgb(var(--accent-primary)/0.1)] text-[rgb(var(--accent-primary))] text-xs font-semibold border border-[rgb(var(--accent-primary)/0.2)]">
                                            Lvl {Math.floor(stats.totalXP / 1000) + 1}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-[rgb(var(--border-subtle))]">
                            <div className="text-center">
                                <p className="text-[rgb(var(--text-muted))] text-xs uppercase tracking-wider mb-1">Total XP</p>
                                <p className="text-2xl font-bold text-[rgb(var(--text-primary))]">{stats?.totalXP || 0}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[rgb(var(--text-muted))] text-xs uppercase tracking-wider mb-1">Avg Score</p>
                                <p className="text-2xl font-bold text-[rgb(var(--text-primary))]">{stats?.averageScore || 0}%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[rgb(var(--text-muted))] text-xs uppercase tracking-wider mb-1">Sessions</p>
                                <p className="text-2xl font-bold text-[rgb(var(--text-primary))]">{stats?.completedSessions || 0}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[rgb(var(--text-muted))] text-xs uppercase tracking-wider mb-1">Level</p>
                                <p className="text-2xl font-bold text-[rgb(var(--text-primary))] capitalize">{stats?.experienceLevel}</p>
                            </div>
                        </div>

                        {/* Background Accent */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[rgb(var(--accent-primary)/0.1)] rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    {/* Edit Profile Form */}
                    <div className="card-os p-8">
                        <div className="flex items-center mb-6">
                            <User className="h-5 w-5 text-[rgb(var(--accent-primary))] mr-2" />
                            <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">Edit Profile</h3>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-os"
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Industry</label>
                                    <input
                                        type="text"
                                        value={formData.industry}
                                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                        className="input-os"
                                        placeholder="e.g. SaaS, Real Estate"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Experience Level</label>
                                <select
                                    value={formData.experienceLevel}
                                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                                    className="input-os"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="btn-primary flex items-center px-6 py-2.5 text-sm"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column: Security & Admin Ops */}
                <div className="space-y-8">
                    {/* Security Settings */}
                    <div className="card-os p-8">
                        <div className="flex items-center mb-6">
                            <Shield className="h-5 w-5 text-[rgb(var(--accent-primary))] mr-2" />
                            <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">Security</h3>
                        </div>
                        <form onSubmit={handlePasswordChange} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="input-os pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="input-os"
                                    placeholder="Min 8 chars"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">Confirm New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="input-os"
                                    placeholder="Min 8 chars"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-[var(--radius-md)] bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-canvas))] text-sm font-semibold transition-colors flex items-center"
                                >
                                    <Key className="h-4 w-4 mr-2" />
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Admin Role Switcher - Only visible to actual admins */}
                    {user?.role === 'admin' && (
                        <div className="card-os p-6 border-status-warning/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                            <div className="flex items-center mb-4 text-status-warning">
                                <Briefcase className="h-5 w-5 mr-2" />
                                <h3 className="text-lg font-bold">Admin Tools</h3>
                            </div>
                            <p className="text-sm text-[rgb(var(--text-muted))] mb-4">
                                Temporarily view the platform as a different role to test permissions and layout.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => simulateRole(null)}
                                    className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${!((user as any).simulatedRole) ? 'bg-[rgb(var(--accent-primary))] text-white' : 'bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-canvas))]'}`}
                                >
                                    Admin (Default)
                                </button>
                                <button
                                    onClick={() => simulateRole('team_lead')}
                                    className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${(user as any).simulatedRole === 'team_lead' ? 'bg-[rgb(var(--accent-primary))] text-white' : 'bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-canvas))]'}`}
                                >
                                    View as Team Lead
                                </button>
                                <button
                                    onClick={() => simulateRole('user')}
                                    className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${(user as any).simulatedRole === 'user' ? 'bg-[rgb(var(--accent-primary))] text-white' : 'bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-canvas))]'}`}
                                >
                                    View as User
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
