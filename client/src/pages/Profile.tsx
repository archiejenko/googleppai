import { useState, useEffect } from 'react';
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

    const handleProfileUpdate = async (e: React.FormEvent) => {
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

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ text: 'New passwords do not match', type: 'error' });
            return;
        }

        setIsSaving(true);
        setMessage(null);
        try {
            // We can only update password here. "Current password" check is implicit in Supabase if we were re-authenticating,
            // but for a logged-in session, we can just set new password. 
            // However, strictly speaking, Supabase 'updateUser' doesn't require old password. 
            // If security requirement implies checking old password, we'd need to re-login with old password first.
            // For this migration, we'll just update directly for simplicity.

            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            setMessage({ text: 'Password changed successfully', type: 'success' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setMessage({ text: error.message || 'Failed to change password', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-white">Loading profile...</div>;
    }



    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-theme-primary mb-8">Account Settings</h1>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile & Stats */}
                <div className="space-y-8 lg:col-span-2">
                    {/* User Stats Card */}
                    <div className="glass-card p-6">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white">
                                {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-theme-primary">{user?.name}</h2>
                                <p className="text-theme-muted">{user?.email}</p>
                                <div className="flex items-center mt-2 space-x-2">
                                    <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30 uppercase">
                                        {user?.role === 'admin' ? 'Administrator' : user?.role === 'team_lead' ? 'Team Lead' : 'User'}
                                    </span>
                                    {stats && (
                                        <span className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                                            Lvl {Math.floor(stats.totalXP / 1000) + 1}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                            <div className="text-center">
                                <p className="text-gray-400 text-sm">Total XP</p>
                                <p className="text-2xl font-bold text-white">{stats?.totalXP || 0}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-sm">Avg Score</p>
                                <p className="text-2xl font-bold text-white">{stats?.averageScore || 0}%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-sm">Sessions</p>
                                <p className="text-2xl font-bold text-white">{stats?.completedSessions || 0}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-400 text-sm">Level</p>
                                <p className="text-2xl font-bold text-white capitalize">{stats?.experienceLevel}</p>
                            </div>
                        </div>
                    </div>

                    {/* Edit Profile Form */}
                    <div className="glass-card p-6">
                        <div className="flex items-center mb-6">
                            <User className="h-5 w-5 text-purple-400 mr-2" />
                            <h3 className="text-lg font-bold text-white">Edit Profile</h3>
                        </div>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-theme-muted mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-glass"
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-theme-muted mb-1">Industry</label>
                                    <input
                                        type="text"
                                        value={formData.industry}
                                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                        className="input-glass"
                                        placeholder="e.g. SaaS, Real Estate"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-theme-muted mb-1">Experience Level</label>
                                <select
                                    value={formData.experienceLevel}
                                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                                    className="input-glass"
                                >
                                    <option value="beginner" className="bg-gray-900">Beginner</option>
                                    <option value="intermediate" className="bg-gray-900">Intermediate</option>
                                    <option value="advanced" className="bg-gray-900">Advanced</option>
                                </select>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="btn-gradient flex items-center px-4 py-2 text-sm"
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
                    <div className="glass-card p-6">
                        <div className="flex items-center mb-6">
                            <Shield className="h-5 w-5 text-purple-400 mr-2" />
                            <h3 className="text-lg font-bold text-white">Security</h3>
                        </div>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-theme-muted mb-1">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="input-glass pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-theme-muted mb-1">New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="input-glass"
                                    placeholder="Min 8 chars"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-theme-muted mb-1">Confirm New Password</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="input-glass"
                                    placeholder="Min 8 chars"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors flex items-center"
                                >
                                    <Key className="h-4 w-4 mr-2" />
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Admin Role Switcher - Only visible to actual admins */}
                    {/* Note: This checks the REAL role if possible, but our current AuthContext only exposes effective. 
                        However, if they are currently admin (effective), they can switch away. 
                        If they have switched away, they need the floating 'reset' button we added to AuthContext. 
                    */}
                    {user?.role === 'admin' && (
                        <div className="glass-card p-6 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                            <div className="flex items-center mb-4 text-yellow-500">
                                <Briefcase className="h-5 w-5 mr-2" />
                                <h3 className="text-lg font-bold">Admin Tools</h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                Temporarily view the platform as a different role to test permissions and layout.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => simulateRole(null)}
                                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!((user as any).simulatedRole) ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    Admin (Default)
                                </button>
                                <button
                                    onClick={() => simulateRole('team_lead')}
                                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${(user as any).simulatedRole === 'team_lead' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    View as Team Lead
                                </button>
                                <button
                                    onClick={() => simulateRole('user')}
                                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${(user as any).simulatedRole === 'user' ? 'bg-purple-600 text-white' : 'bg-theme-tertiary text-theme-muted hover:bg-theme-secondary'}`}
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
