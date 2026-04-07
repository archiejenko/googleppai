import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            setSent(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-canvas flex items-center justify-center p-6">
            <div className="w-full max-w-[440px]">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                >
                    <div className="mb-8">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors mb-6 uppercase tracking-widest"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to login
                        </Link>
                        <h1 className="text-3xl font-display text-text-primary mb-2">Reset password</h1>
                        <p className="text-sm text-text-muted">
                            Enter your email and we'll send a reset link.
                        </p>
                    </div>

                    {sent ? (
                        <div className="card-os p-8 flex flex-col items-center gap-4 text-center">
                            <CheckCircle className="w-10 h-10 text-status-success" />
                            <p className="text-text-primary font-bold">Check your inbox</p>
                            <p className="text-sm text-text-muted">
                                A reset link has been sent to <span className="text-text-primary">{email}</span>. It expires in 1 hour.
                            </p>
                            <Link to="/login" className="text-xs text-accent hover:underline mt-2">
                                Return to login
                            </Link>
                        </div>
                    ) : (
                        <div className="card-os p-8">
                            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                                {error && (
                                    <div className="bg-status-danger/10 border-2 border-status-danger/40 text-status-danger px-4 py-3 text-sm">
                                        {error}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                        Work Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-os"
                                        placeholder="jane@acmecorp.com"
                                        disabled={submitting}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting || !email}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending…
                                        </span>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
