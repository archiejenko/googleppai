import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Lock, check } from 'lucide-react';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            alert('Password updated successfully!');
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="layout-shell flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden h-screen">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(var(--accent-primary)/0.1)] rounded-full blur-3xl animate-pulse"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center animate-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[rgb(var(--accent-primary))] rounded-2xl blur-xl opacity-20 animate-pulse"></div>
                        <div className="relative bg-[rgb(var(--accent-primary))] p-4 rounded-2xl">
                            <Lock className="h-12 w-12 text-white" />
                        </div>
                    </div>
                </div>
                <h2 className="mt-8 text-center text-3xl font-display font-bold text-[rgb(var(--text-primary))] animate-in-up">
                    Set New Password
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="card-hero py-10 px-6 sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-status-danger/10 border border-status-danger/20 text-status-danger px-4 py-3 rounded-[var(--radius-md)] text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                                New Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-os"
                                placeholder="Min 6 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-os"
                                placeholder="Retype password"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
