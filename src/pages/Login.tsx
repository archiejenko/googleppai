import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            if (authUser?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    }, [isAuthenticated, authLoading, authUser, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let signInEmail = email.trim();
            if (!signInEmail.includes('@')) {
                signInEmail = `${signInEmail}@oast.ai`;
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: signInEmail,
                password,
            });

            if (error) throw error;

            if (data.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, onboarding_completed')
                    .eq('id', data.user.id)
                    .single();

                if (profile?.role === 'admin') {
                    navigate('/admin');
                } else if (profile?.onboarding_completed === false) {
                    navigate('/onboarding');
                } else {
                    navigate('/dashboard');
                }
            } else {
                navigate('/dashboard');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed. Check your credentials and try again.');
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
                    <h1 className="text-3xl text-text-primary text-center mb-2">Welcome back</h1>
                    <p className="text-sm text-text-muted text-center mb-8">
                        Re-enter the chamber. Practice until perfectly polished.
                    </p>

                    <div className="card-os p-8">
                        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                            {error && (
                                <div className="bg-status-danger/10 border-2 border-status-danger/40 text-status-danger px-4 py-3 text-sm flex items-center gap-3">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                    Email or Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-os"
                                    placeholder="jane@acmecorp.com"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-text-muted">
                                        Password
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs text-text-muted hover:text-accent transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <input
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-os"
                                    placeholder="••••••••"
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
                                        Authenticating…
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Sign In <ArrowRight className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="mt-6 text-sm text-text-muted text-center">
                        No account?{' '}
                        <Link to="/register" className="text-accent hover:underline">
                            Create one
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
