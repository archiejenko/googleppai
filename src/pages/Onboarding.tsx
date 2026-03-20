import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Zap, LayoutDashboard, Library, Calendar } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

const SALES_ROLES = ['AE', 'SDR', 'BDR', 'Sales Manager', 'Sales Director', 'VP of Sales', 'Other'] as const;

type SalesRole = typeof SALES_ROLES[number];

export default function Onboarding() {
    const navigate = useNavigate();
    const { user, updateUser, isLoading } = useAuth();
    const [step, setStep] = useState(1);

    // Guard: redirect away if onboarding already completed
    useEffect(() => {
        if (!isLoading && user?.onboarding_completed) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, isLoading, navigate]);
    const [role, setRole] = useState<SalesRole | ''>('');
    const [saving, setSaving] = useState(false);

    const markOnboardingComplete = async () => {
        if (!user?.id) return;
        await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
        updateUser({ ...user, onboarding_completed: true } as any);
    };

    const handleRoleNext = async () => {
        if (!role) return;
        setSaving(true);
        try {
            if (user?.id) {
                await supabase.from('profiles').update({ sales_role: role }).eq('id', user.id);
            }
        } finally {
            setSaving(false);
        }
        setStep(2);
    };

    const handleStartFirstSession = async () => {
        await markOnboardingComplete();
        navigate('/training');
    };

    const handleSkipToSummary = () => setStep(3);

    const handleGoToDashboard = async () => {
        await markOnboardingComplete();
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-bg-canvas flex items-center justify-center p-6">
            {/* Progress dots */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {[1, 2, 3].map(n => (
                    <div
                        key={n}
                        className={`h-1.5 transition-all duration-300 ${n === step ? 'w-8 bg-accent' : n < step ? 'w-4 bg-accent/40' : 'w-4 bg-border'}`}
                    />
                ))}
            </div>

            <div className="w-full max-w-[520px]">
                <AnimatePresence mode="wait">
                    {/* ── Step 1: Welcome + Role ── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="space-y-8"
                        >
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-text-muted mb-3">Welcome to OAST</p>
                                <h1 className="text-3xl text-text-primary mb-2">
                                    Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Let's get you set up.
                                </h1>
                                <p className="text-sm text-text-secondary">
                                    OAST uses AI-powered simulations to accelerate your sales performance.
                                    First — what's your role?
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {SALES_ROLES.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRole(r)}
                                        className={`p-4 text-left border transition-all text-sm ${
                                            role === r
                                                ? 'border-accent bg-accent/10 text-text-primary'
                                                : 'border-border bg-bg-surface text-text-secondary hover:border-accent/40 hover:bg-bg-raised'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleRoleNext}
                                disabled={!role || saving}
                                className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40"
                            >
                                Continue <ChevronRight className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* ── Step 2: First training session ── */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="space-y-8"
                        >
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-text-muted mb-3">Step 2 of 3</p>
                                <h2 className="text-3xl text-text-primary mb-2">
                                    Your first training session
                                </h2>
                                <p className="text-sm text-text-secondary">
                                    OAST simulates realistic buyer conversations so you can practise in a zero-stakes environment.
                                    Your first session is pre-configured — just hit Start.
                                </p>
                            </div>

                            <div className="border border-border bg-bg-surface p-6 space-y-4">
                                <p className="text-xs uppercase tracking-widest text-text-muted">Session Preview</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {[
                                        ['Scenario', 'Cold Call'],
                                        ['Difficulty', 'Easy'],
                                        ['Persona', 'Executive'],
                                        ['Methodology', 'MEDDIC'],
                                    ].map(([label, val]) => (
                                        <div key={label}>
                                            <p className="text-text-muted text-xs mb-0.5">{label}</p>
                                            <p className="text-text-primary">{val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleStartFirstSession}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                                >
                                    <Zap className="w-4 h-4" /> Start My First Session
                                </button>
                                <button
                                    onClick={handleSkipToSummary}
                                    className="w-full py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                                >
                                    Skip for now
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 3: Summary ── */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className="space-y-8"
                        >
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-text-muted mb-3">You're all set</p>
                                <h2 className="text-3xl text-text-primary mb-2">OAST is ready for you</h2>
                                <p className="text-sm text-text-secondary">
                                    Here's what you can explore:
                                </p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    {
                                        icon: LayoutDashboard,
                                        title: 'Dashboard',
                                        desc: 'Track your performance metrics and weekly progress',
                                        href: '/dashboard',
                                    },
                                    {
                                        icon: Zap,
                                        title: 'Training',
                                        desc: 'Start an AI simulation for any scenario or difficulty',
                                        href: '/training',
                                    },
                                    {
                                        icon: Library,
                                        title: 'Library',
                                        desc: 'Read sales methodology articles and playbook guides',
                                        href: '/library',
                                    },
                                    {
                                        icon: Calendar,
                                        title: 'Schedule',
                                        desc: 'Book coaching sessions and practice slots',
                                        href: '/schedule',
                                    },
                                ].map(({ icon: Icon, title, desc, href }) => (
                                    <button
                                        key={title}
                                        onClick={async () => { await markOnboardingComplete(); navigate(href); }}
                                        className="w-full flex items-center gap-4 p-4 border border-border bg-bg-surface hover:bg-bg-raised hover:border-accent/40 transition-all text-left"
                                    >
                                        <div className="w-9 h-9 flex items-center justify-center bg-accent/10 border border-accent/20 flex-shrink-0">
                                            <Icon className="w-4 h-4 text-accent" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-text-primary">{title}</p>
                                            <p className="text-xs text-text-muted mt-0.5">{desc}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-text-muted ml-auto" />
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleGoToDashboard}
                                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                            >
                                Go to Dashboard
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
