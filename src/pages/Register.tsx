import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { showError } from '../utils/toast';
import { useAuth } from '../context/AuthContext';

interface FormState {
    fullName: string;
    companyName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface FieldErrors {
    fullName?: string;
    companyName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

function validate(form: FormState): FieldErrors {
    const errors: FieldErrors = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.companyName.trim()) errors.companyName = 'Company name is required';
    if (!form.email.trim()) {
        errors.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'Enter a valid email address';
    }
    if (!form.password) {
        errors.password = 'Password is required';
    } else if (form.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    }
    if (!form.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
}

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, authLoading, navigate]);
    const planParam = searchParams.get('plan');
    const billingParam = searchParams.get('billing');
    const [form, setForm] = useState<FormState>({
        fullName: '',
        companyName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const fieldErrors = validate(form);
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        setSubmitting(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: form.email.trim().toLowerCase(),
                password: form.password,
                options: {
                    data: {
                        name: form.fullName.trim(),
                        company: form.companyName.trim(),
                    },
                },
            });

            if (error) throw error;

            if (data.user) {
                // Call Edge Function to create org and link to profile
                await supabase.functions.invoke('create-organisation', {
                    body: {
                        userId: data.user.id,
                        companyName: form.companyName.trim(),
                    },
                });
            }

            // Preserve plan selection through onboarding so checkout can be initiated post-signup
            const onboardingPath = planParam
                ? `/onboarding?plan=${planParam}&billing=${billingParam ?? 'monthly'}`
                : '/onboarding';
            navigate(onboardingPath);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
            if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
                setErrors({ email: 'An account with this email already exists' });
            } else {
                showError('Registration failed', msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-canvas flex items-center justify-center p-6 relative overflow-hidden">
            <div className="w-full max-w-[480px] relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="mb-8">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors mb-6 uppercase tracking-widest"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to login
                        </Link>
                        <h1 className="text-3xl font-display text-text-primary mb-2">Create your account</h1>
                        <p className="text-sm text-text-muted">
                            Request access to the OAST platform.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                autoComplete="name"
                                value={form.fullName}
                                onChange={set('fullName')}
                                className={`input-os ${errors.fullName ? 'border-status-danger' : ''}`}
                                placeholder="Jane Smith"
                                disabled={submitting}
                            />
                            {errors.fullName && (
                                <p className="mt-1 text-xs text-status-danger">{errors.fullName}</p>
                            )}
                        </div>

                        {/* Company Name */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                Company Name
                            </label>
                            <input
                                type="text"
                                autoComplete="organization"
                                value={form.companyName}
                                onChange={set('companyName')}
                                className={`input-os ${errors.companyName ? 'border-status-danger' : ''}`}
                                placeholder="Acme Corp"
                                disabled={submitting}
                            />
                            {errors.companyName && (
                                <p className="mt-1 text-xs text-status-danger">{errors.companyName}</p>
                            )}
                        </div>

                        {/* Work Email */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                Work Email
                            </label>
                            <input
                                type="email"
                                autoComplete="email"
                                value={form.email}
                                onChange={set('email')}
                                className={`input-os ${errors.email ? 'border-status-danger' : ''}`}
                                placeholder="jane@acmecorp.com"
                                disabled={submitting}
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-status-danger">{errors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={form.password}
                                    onChange={set('password')}
                                    className={`input-os pr-10 ${errors.password ? 'border-status-danger' : ''}`}
                                    placeholder="Min 8 characters"
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-xs text-status-danger">{errors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={form.confirmPassword}
                                    onChange={set('confirmPassword')}
                                    className={`input-os pr-10 ${errors.confirmPassword ? 'border-status-danger' : ''}`}
                                    placeholder="Repeat your password"
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="mt-1 text-xs text-status-danger">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                            ) : (
                                'Create Account'
                            )}
                        </button>

                        <p className="text-xs text-text-muted text-center">
                            By creating an account you agree to our{' '}
                            <Link to="/terms-of-service" className="text-accent hover:underline">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>.
                        </p>
                    </form>

                    <p className="mt-6 text-sm text-text-muted text-center">
                        Already have an account?{' '}
                        <Link to="/login" className="text-accent hover:underline">
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
