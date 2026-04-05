import { useEffect, lazy, Suspense } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import SpotlightBackground from '../kinetic/SpotlightBackground';
import { useAuth } from '../../context/AuthContext';
import { useTier } from '../../context/TierContext';
import { LiveCallProvider } from '../../context/LiveCallContext';
import OastLiveWidget from '../live/OastLiveWidget';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PreCallPrepDrawer = lazy(() => import('../../features/pre-call-prep/PreCallPrepDrawer'));

export default function AppShell() {
    const { isLoading, user } = useAuth();
    const { isTrialActive, trialDaysRemaining } = useTier();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [prepOpen, setPrepOpen] = useState(false);

    // Global keyboard shortcut: Cmd+Shift+P (Mac) / Ctrl+Shift+P (Win/Linux)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                setPrepOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springX = useSpring(mouseX, { stiffness: 500, damping: 50 });
    const springY = useSpring(mouseY, { stiffness: 500, damping: 50 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    const spotlightBg = useTransform(
        [springX, springY],
        ([x, y]) => `radial-gradient(1000px circle at ${x}px ${y}px, rgba(255,107,107,0.03), transparent 80%)`
    );

    if (!isLoading && !user) {
        return <Navigate to="/login" replace />;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-bg-canvas gap-6">
                <SpotlightBackground />
                <div className="font-display font-black text-4xl tracking-tighter text-text-primary animate-pulse">
                    OAST<span className="text-accent">.</span>
                </div>
                <LoadingSpinner message="Authenticating Session..." />
            </div>
        );
    }

    // Redirect to onboarding if not completed, except when already on /onboarding
    if (user && user.onboarding_completed === false && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    const showTrialBanner = isTrialActive && trialDaysRemaining !== null && trialDaysRemaining <= 3;

    return (
        <LiveCallProvider>
            <div className="layout-shell min-h-screen flex bg-bg-canvas relative overflow-hidden selection:bg-accent/30 selection:text-white">
                <SpotlightBackground />

                <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} onOpenPrep={() => setPrepOpen(true)} />

                <div
                    className={`flex-1 flex flex-col min-h-screen transition-all duration-500 relative z-10
                    ${collapsed ? 'ml-20' : 'ml-64'}`}
                >
                    <TopBar collapsed={collapsed} setCollapsed={setCollapsed} />

                    {/* Trial expiry warning banner */}
                    {showTrialBanner && (
                        <div className="mt-16 bg-status-warning/10 border-b border-status-warning/30 px-6 py-2 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-status-warning text-xs">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>
                                    Your trial expires in <strong>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}</strong>.
                                    Upgrade to keep access to Revenue Intelligence features.
                                </span>
                            </div>
                            <Link
                                to="/settings/billing"
                                className="text-xs font-bold uppercase tracking-widest text-status-warning hover:text-white transition-colors whitespace-nowrap border border-status-warning/40 px-3 py-1 hover:bg-status-warning/20"
                            >
                                Upgrade now
                            </Link>
                        </div>
                    )}

                    <main className={`flex-1 ${showTrialBanner ? '' : 'mt-16'} p-section overflow-y-auto relative`}>
                        <motion.div
                            className="pointer-events-none absolute inset-0 z-0 opacity-40 transition-opacity duration-500"
                            style={{ background: spotlightBg }}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.99, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                            className="max-w-7xl mx-auto relative z-10"
                        >
                            <ErrorBoundary>
                                <Outlet />
                            </ErrorBoundary>
                        </motion.div>
                    </main>
                </div>
            </div>
            <OastLiveWidget />
            <Suspense fallback={null}>
                <PreCallPrepDrawer open={prepOpen} onClose={() => setPrepOpen(false)} />
            </Suspense>
            <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: 'rgb(15 23 42)',
                        border: '1px solid rgb(30 41 59)',
                        color: 'rgb(248 250 252)',
                        fontFamily: 'Oswald, sans-serif',
                        fontWeight: 600,
                        borderRadius: 0,
                    },
                }}
            />
        </LiveCallProvider>
    );
}
