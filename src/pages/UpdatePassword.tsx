import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { CheckCircle } from 'lucide-react';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-canvas flex items-center justify-center p-6">
            <div className="w-full max-w-[440px]">
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex justify-center mb-10"
                >
                    <span className="font-display font-black text-6xl tracking-tighter text-text-primary">
                        OAST<span className="text-accent">.</span>
                    </span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                >
                    <h1 className="text-3xl text-text-primary text-center mb-2">Set new password</h1>
                    <p className="text-sm text-text-muted text-center mb-8">
                        Choose a strong password for your account.
                    </p>

                    <div className="card-os p-8">
                        {success ? (
                            <div className="flex flex-col items-center gap-4 text-center py-4">
                                <CheckCircle className="w-10 h-10 text-status-success" />
                                <p className="text-text-primary font-bold">Password updated</p>
                                <p className="text-sm text-text-muted">Redirecting to dashboard…</p>
                            </div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                                {error && (
                                    <div className="bg-status-danger/10 border-2 border-status-danger/40 text-status-danger px-4 py-3 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                        New Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-os"
                                        placeholder="Min 8 characters"
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-os"
                                        placeholder="Repeat your password"
                                        disabled={loading}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Updating…
                                        </span>
                                    ) : (
                                        'Update Password'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    <p className="mt-6 text-sm text-text-muted text-center">
                        <Link to="/login" className="text-accent hover:underline">
                            Back to login
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
