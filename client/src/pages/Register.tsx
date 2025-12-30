import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext'; // Removed unused import
import { supabase } from '../utils/supabase';
import { Sparkles, UserPlus } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    // const { login } = useAuth(); // Removed unused variable
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
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
        <div className="min-h-screen gradient-dark-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[rgba(var(--accent-primary),0.2)] rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center animate-fade-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--accent-primary))] to-blue-600 rounded-2xl blur-xl opacity-75 animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-[rgb(var(--accent-primary))] to-blue-600 p-4 rounded-2xl">
                            <UserPlus className="h-12 w-12 text-white" />
                        </div>
                    </div>
                </div>
                <h2 className="mt-8 text-center text-4xl font-extrabold text-theme-primary animate-fade-in-up stagger-1">
                    Join Pitch Perfect AI
                </h2>
                <p className="mt-3 text-center text-lg text-theme-muted animate-fade-in-up stagger-2">
                    Start mastering your pitch today
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in-up stagger-3">
                <div className="glass-card py-10 px-6 sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-[rgba(var(--error),0.1)] border border-[rgba(var(--error),0.5)] text-[rgb(var(--error))] px-4 py-3 rounded-lg text-sm backdrop-blur-sm animate-fade-in">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    {error}
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-theme-secondary mb-2">
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
                                className="input-glass"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-theme-secondary mb-2">
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
                                className="input-glass"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-theme-secondary mb-2">
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
                                className="input-glass"
                                placeholder="••••••••"
                            />
                            <p className="mt-2 text-xs text-theme-muted">
                                Must be at least 8 characters long
                            </p>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full btn-gradient"
                            >
                                Create Account
                            </button>
                        </div>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[rgba(var(--border-color))]"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-transparent text-theme-muted">
                                        Already have an account?
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-3 px-4 border-2 border-[rgba(var(--border-color))] rounded-xl text-sm font-semibold text-theme-primary bg-[rgba(var(--glass-bg))] hover:bg-[rgba(var(--glass-bg-hover))] hover:border-[rgba(var(--border-hover))] transition-all duration-300"
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
