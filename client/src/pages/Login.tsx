import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Mic, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Setup Admin Tool
    const setupAdmin = async () => {
        try {
            const email = 'archiejenkins1234@gmail.com';
            const password = 'chicken6!';

            // 1. Try to sign up
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: 'Archie Jenkins',
                        role: 'admin'
                    }
                }
            });

            if (signUpError) {
                console.log('Signup failed (likely exists), attempting to update...', signUpError.message);
                // If user exists, we can't easily update password without old password or service key.
                // But we can ensure the profile exists and is admin.
                // We'll try to sign in?
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) {
                    alert('User exists but password incorrect. Cannot reset password from client without email flow.');
                } else {
                    alert('Admin account active. Please delete old profiles manually if needed.');
                }
            } else if (data.user) {
                alert('Admin account created successfully!');
            }

        } catch (err: any) {
            alert('Setup failed: ' + err.message);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            // Handle username login (admin)
            let signInEmail = email;
            if (!email.includes('@')) {
                signInEmail = `${email}@admin.pitchperfect.ai`;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: signInEmail,
                password,
            });

            if (error) throw error;

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            setError('Please enter your email address to reset password');
            return;
        }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            alert('Password reset link sent to your email!');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        }
    };

    return (
        <div className="layout-shell flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgb(var(--accent-primary)/0.1)] rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center animate-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[rgb(var(--accent-primary))] rounded-2xl blur-xl opacity-20 animate-pulse"></div>
                        <div className="relative bg-[rgb(var(--accent-primary))] p-4 rounded-2xl">
                            <Mic className="h-12 w-12 text-white" />
                        </div>
                    </div>
                </div>
                <h2 className="mt-8 text-center text-4xl font-display font-bold text-[rgb(var(--text-primary))] animate-in-up" style={{ animationDelay: '0.1s' }}>
                    Welcome Back
                </h2>
                <p className="mt-3 text-center text-lg text-[rgb(var(--text-secondary))] animate-in-up" style={{ animationDelay: '0.2s' }}>
                    Sign in to continue your pitch practice
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
                            <label htmlFor="email" className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                autoComplete="username"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-os"
                                placeholder="Username or Email"
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
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-os"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-[rgb(var(--border-default))] text-[rgb(var(--accent-primary))] focus:ring-[rgb(var(--accent-primary))]"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-[rgb(var(--text-secondary))]">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <button
                                    type="button"
                                    onClick={handlePasswordReset}
                                    className="font-medium text-[rgb(var(--accent-primary))] hover:text-[rgb(var(--accent-secondary))]"
                                >
                                    Forgot your password?
                                </button>
                                {/* Dev Tool */}
                                <button
                                    type="button"
                                    onClick={setupAdmin}
                                    className="ml-4 text-xs text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
                                >
                                    [Setup Admin]
                                </button>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full btn-primary"
                            >
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
