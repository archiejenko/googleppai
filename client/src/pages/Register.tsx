import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Sparkles, UserPlus } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name,
                    },
                },
            });

            if (error) throw error;

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        }
    };

    return (
        <div className="layout-shell flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[rgb(var(--accent-primary)/0.1)] rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center animate-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[rgb(var(--accent-primary))] rounded-2xl blur-xl opacity-20 animate-pulse"></div>
                        <div className="relative bg-[rgb(var(--accent-primary))] p-4 rounded-2xl">
                            <UserPlus className="h-12 w-12 text-white" />
                        </div>
                    </div>
                </div>
                <h2 className="mt-8 text-center text-4xl font-display font-bold text-[rgb(var(--text-primary))] animate-in-up" style={{ animationDelay: '0.1s' }}>
                    Join Pitch Perfect AI
                </h2>
                <p className="mt-3 text-center text-lg text-[rgb(var(--text-secondary))] animate-in-up" style={{ animationDelay: '0.2s' }}>
                    Start mastering your pitch today
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="card-hero py-10 px-6 sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-status-danger/10 border border-status-danger/20 text-status-danger px-4 py-3 rounded-[var(--radius-md)] text-sm animate-in-up">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    {error}
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-os"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-os"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-os"
                                placeholder="••••••••"
                            />
                            <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">
                                Must be at least 8 characters long
                            </p>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full btn-primary"
                            >
                                Create Account
                            </button>
                        </div>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[rgb(var(--border-default))]"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-[rgb(var(--bg-surface-raised))] text-[rgb(var(--text-muted))]">
                                        Already have an account?
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-3 px-4 border-2 border-[rgb(var(--border-default))] rounded-[var(--radius-md)] text-sm font-semibold text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface))] hover:border-[rgb(var(--border-subtle))] transition-all duration-300"
                                >
                                    Sign in instead
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
