import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import KineticCard from '../components/kinetic/KineticCard';
import KineticButton from '../components/kinetic/KineticButton';
import NyroTextReveal from '../components/kinetic/NyroTextReveal';
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
            let signInEmail = email;
            if (!email.includes('@')) {
                signInEmail = `${email}@oast.ai`;
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
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-canvas flex items-center justify-center p-6 relative overflow-hidden">
            <div className="w-full max-w-[450px] relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center mb-12"
                >
                    <span className="font-display font-black text-6xl tracking-tighter text-text-primary">
                        OAST<span className="text-accent">.</span>
                    </span>
                </motion.div>

                <NyroTextReveal
                    text="Welcome Back"
                    className="text-4xl font-bold text-center mb-4 justify-center"
                />
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-text-secondary text-center mb-10 font-light"
                >
                    Re-enter the chamber. Practice until perfectly polished.
                </motion.p>

                <KineticCard className="p-10 border border-border-default/50">
                    <form className="space-y-8" onSubmit={handleSubmit}>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-accent/10 border border-accent/20 text-accent px-4 py-3 rounded-xl text-sm flex items-center gap-3"
                            >
                                <Sparkles className="h-4 w-4" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted ml-1">
                                Credentials
                            </label>
                            <input
                                type="text"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-bg-canvas border border-border-default px-5 py-4 rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent/50 outline-none transition-all font-light"
                                placeholder="Email or Username"
                            />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-bg-canvas border border-border-default px-5 py-4 rounded-xl text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent/50 outline-none transition-all font-light"
                                placeholder="••••••••"
                            />
                        </div>

                        <KineticButton
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 text-sm font-bold tracking-wide"
                        >
                            {loading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                />
                            ) : (
                                <span className="flex items-center gap-2">
                                    Authenticate <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </KineticButton>
                    </form>
                </KineticCard>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="mt-8 text-center text-xs text-text-muted font-light"
                >
                    Secured by OAST Cognitive Intelligence Systems
                </motion.p>
            </div>
        </div>
    );
}
