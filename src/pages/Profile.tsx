import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Key, Save, Camera, ExternalLink } from 'lucide-react';
import Notification from '../components/Notification';
import VoiceSelector from '../components/training/VoiceSelector';

interface Stats {
    totalXP: number;
    averageScore: number;
    completedSessions: number;
    experienceLevel: string;
}

interface RecentPitch {
    id: string;
    score: number;
    created_at: string;
    training_sessions: { scenario: string } | null;
}

export default function Profile() {
    const navigate = useNavigate();
    const { user, updateUser, simulateRole } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [recentPitches, setRecentPitches] = useState<RecentPitch[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile State
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        experienceLevel: 'beginner',
        preferred_voice_id: 'aura-2-draco-en',
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [showPassword] = useState(false);

    // Stats State
    const [stats, setStats] = useState<Stats | null>(null);

    const fetchProfileData = useCallback(async () => {
        if (!user) return;
        try {
            const [{ data: profileData, error: profileError }, { data: pitchesData, error: pitchesError }, { data: recentData }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('pitches').select('score').eq('user_id', user.id),
                supabase.from('pitches').select('id, score, created_at, training_sessions(scenario)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
            ]);

            if (profileError) throw profileError;
            if (pitchesError) throw pitchesError;

            if (profileData.avatar_url) {
                // avatar_url now stores a storage path (e.g. "avatars/user-id.jpg").
                // Generate a 1-hour signed URL for display.
                const { data: signedData } = await supabase.storage
                    .from('avatars')
                    .createSignedUrl(profileData.avatar_url, 3600);
                if (signedData?.signedUrl) setAvatarUrl(signedData.signedUrl);
            }
            if (recentData) setRecentPitches(recentData as unknown as RecentPitch[]);

            const totalSessions = pitchesData?.length ?? 0;
            const avgScore = totalSessions > 0
                ? Math.round(pitchesData!.reduce((acc, p) => acc + p.score, 0) / totalSessions)
                : 0;

            setFormData({
                name: profileData.name || '',
                industry: profileData.industry || '',
                experienceLevel: profileData.experience_level || 'beginner',
                preferred_voice_id: profileData.preferred_voice_id || 'aura-2-draco-en',
            });
            setStats({
                totalXP: profileData.total_xp || 0,
                averageScore: avgScore,
                completedSessions: totalSessions,
                experienceLevel: profileData.experience_level || 'beginner',
            });
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `avatars/${user.id}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (uploadError) throw uploadError;
            // Store the storage path, not a public URL — bucket is private
            await supabase.from('profiles').update({ avatar_url: path }).eq('id', user.id);
            // Generate a short-lived signed URL for immediate display
            const { data: signedData } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
            if (signedData?.signedUrl) setAvatarUrl(signedData.signedUrl);
            setMessage({ text: 'Avatar updated', type: 'success' });
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : 'Upload failed', type: 'error' });
        } finally {
            setIsUploadingAvatar(false);
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
                experience_level: formData.experienceLevel,
                preferred_voice_id: formData.preferred_voice_id,
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
        } catch {
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

            setMessage({ text: 'Password changed successfully!', type: 'success' });
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : 'Failed to change password', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="layout-shell flex items-center justify-center text-[rgb(var(--text-primary))]">Loading profile...</div>;
    }

    return (
        <div className="layout-shell p-6 md:p-8 max-w-5xl">
            {/* Page Header */}
            <div className="flex justify-between items-start mb-5">
                <div>
                    <div className="page-kicker">Coaching</div>
                    <div className="page-title">Settings</div>
                    <div className="page-desc">Profile, preferences, and system configuration.</div>
                </div>
            </div>

            {message && (
                <Notification
                    message={message.text}
                    type={message.type}
                    onClose={() => setMessage(null)}
                />
            )}

            <div className="space-y-4">
                {/* Section 1: Profile */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                    <div className="card-title">Profile</div>
                    <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                        <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">Full Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input-os"
                            placeholder="Your Name"
                        />

                        <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">Email</label>
                        <input
                            type="text"
                            value={user?.email || ''}
                            readOnly
                            className="input-os opacity-50 cursor-not-allowed"
                        />

                        <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">Role</label>
                        <input
                            type="text"
                            value={user?.role === 'admin' ? 'Administrator' : user?.role === 'team_lead' ? 'Team Lead' : 'User'}
                            readOnly
                            className="input-os opacity-50 cursor-not-allowed"
                        />

                        <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">Avatar</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="relative w-8 h-8 flex-shrink-0 group"
                                title="Change avatar"
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-md object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold"
                                         style={{ background: 'var(--color-coral-dim)', color: 'var(--color-coral)', fontFamily: 'Oswald, sans-serif' }}>
                                        {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute inset-0 rounded-md bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isUploadingAvatar ? (
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Camera className="h-4 w-4 text-white" />
                                    )}
                                </div>
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs font-medium cursor-pointer"
                                style={{ color: 'var(--color-coral)' }}
                            >
                                Change
                            </button>
                        </div>

                        <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">Industry</label>
                        <input
                            type="text"
                            value={formData.industry}
                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            className="input-os"
                            placeholder="e.g. SaaS, Real Estate"
                        />

                        <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">Experience Level</label>
                        <select
                            value={formData.experienceLevel}
                            onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                            className="input-os"
                            style={{ appearance: 'none', WebkitAppearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5567' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                        >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[rgb(var(--border-default))]">
                        <VoiceSelector
                            label="Simulation Voice"
                            value={formData.preferred_voice_id}
                            onChange={(id) => setFormData(prev => ({ ...prev, preferred_voice_id: id }))}
                        />
                    </div>
                    <div className="flex justify-end mt-4">
                        <form onSubmit={handleProfileUpdate}>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="btn-primary flex items-center"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Section 2: Stats */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                            <div className="stat-label">Total XP</div>
                            <div className="stat-value text-[rgb(var(--text-primary))]">{stats.totalXP || 0}</div>
                        </div>
                        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                            <div className="stat-label">Avg Score</div>
                            <div className="stat-value text-[rgb(var(--text-primary))]">{stats.averageScore || 0}%</div>
                        </div>
                        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                            <div className="stat-label">Sessions</div>
                            <div className="stat-value text-[rgb(var(--text-primary))]">{stats.completedSessions || 0}</div>
                        </div>
                        <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-4">
                            <div className="stat-label">Level</div>
                            <div className="stat-value text-[rgb(var(--text-primary))] capitalize">{stats.experienceLevel}</div>
                        </div>
                    </div>
                )}

                {/* Section 3: Security */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                    <div className="card-title">Security</div>
                    <form onSubmit={handlePasswordChange}>
                        <div className="grid grid-cols-[200px_1fr] gap-4 items-center">
                            <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">New Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="input-os"
                                placeholder="Min 8 chars"
                            />

                            <label className="text-xs font-medium text-[rgb(var(--text-secondary))]">Confirm Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="input-os"
                                placeholder="Min 8 chars"
                            />
                        </div>
                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-canvas))] hover:text-[rgb(var(--text-primary))] text-[11px] font-semibold transition-colors flex items-center"
                            >
                                <Key className="h-4 w-4 mr-2" />
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>

                {/* Section 4: Recent Sessions */}
                {recentPitches.length > 0 && (
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                        <div className="card-title">Recent Sessions</div>
                        <table className="table-os">
                            <thead>
                                <tr>
                                    <th>Scenario</th>
                                    <th>Date</th>
                                    <th>Score</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPitches.map((pitch) => (
                                    <tr key={pitch.id} className="cursor-pointer" onClick={() => navigate(`/pitch/${pitch.id}`)}>
                                        <td className="text-[rgb(var(--text-primary))] capitalize font-medium">
                                            {pitch.training_sessions?.scenario?.replace(/_/g, ' ') || 'Sales Call'}
                                        </td>
                                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                            {new Date(pitch.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td>
                                            <span className={`pill ${pitch.score >= 70 ? 'pill-green' : pitch.score >= 40 ? 'pill-amber' : 'pill-coral'}`}>
                                                {pitch.score}%
                                            </span>
                                        </td>
                                        <td>
                                            <ExternalLink className="h-3.5 w-3.5 text-[rgb(var(--text-muted))]" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Section 5: Admin Role Switcher - Only visible to actual admins */}
                {user?.role === 'admin' && (
                    <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                        <div className="card-title">Admin Tools</div>
                        <p className="text-xs text-[rgb(var(--text-muted))] mb-4">
                            Temporarily view the platform as a different role to test permissions and layout.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => simulateRole(null)}
                                className={`px-4 py-1.5 rounded-lg border text-xs font-medium transition-colors ${!user.simulatedRole ? 'bg-[rgb(var(--accent-primary))] text-white border-[rgb(var(--accent-primary))]' : 'bg-[rgb(var(--bg-deep))] border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-subtle))] hover:text-[rgb(var(--text-primary))]'}`}
                            >
                                Admin (Default)
                            </button>
                            <button
                                onClick={() => simulateRole('team_lead')}
                                className={`px-4 py-1.5 rounded-lg border text-xs font-medium transition-colors ${user.simulatedRole === 'team_lead' ? 'bg-[rgb(var(--accent-primary))] text-white border-[rgb(var(--accent-primary))]' : 'bg-[rgb(var(--bg-deep))] border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-subtle))] hover:text-[rgb(var(--text-primary))]'}`}
                            >
                                View as Team Lead
                            </button>
                            <button
                                onClick={() => simulateRole('user')}
                                className={`px-4 py-1.5 rounded-lg border text-xs font-medium transition-colors ${user.simulatedRole === 'user' ? 'bg-[rgb(var(--accent-primary))] text-white border-[rgb(var(--accent-primary))]' : 'bg-[rgb(var(--bg-deep))] border-[rgb(var(--border-default))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-subtle))] hover:text-[rgb(var(--text-primary))]'}`}
                            >
                                View as User
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Data & Privacy ─────────────────────────────────────────────
                    TODO: GDPR Art. 17 — right to erasure.
                    Self-service account deletion requires a user-scoped Supabase
                    edge function (the existing admin-delete-user function is
                    admin-only). Do NOT implement without user confirmation.
                    Once the edge function is ready, wire it up here.
                ────────────────────────────────────────────────────────────── */}
                <div className="bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] rounded-lg p-5">
                    <div className="card-title">Data & Privacy</div>
                    <div className="flex items-center gap-5">
                        <button
                            className="px-4 py-2 rounded-lg bg-transparent border border-[rgb(var(--border-subtle))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:text-[rgb(var(--text-primary))] text-[11px] font-semibold transition-colors"
                        >
                            Export Data
                        </button>
                        <div>
                            <button
                                onClick={() => navigate('/account/delete')}
                                className="text-[11px] underline cursor-pointer transition-opacity hover:opacity-80"
                                style={{ color: 'var(--color-coral)' }}
                            >
                                Delete Account
                            </button>
                            <div className="text-[10px] text-[rgb(var(--text-muted))] mt-1">This action cannot be undone</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
