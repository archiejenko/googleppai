import { Link } from 'react-router-dom';
import { ChartBar, Zap, Shield, ArrowRight, Play, Check } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
    return (
        <div className="min-h-screen bg-[rgb(var(--bg-canvas))] text-[rgb(var(--text-primary))] font-sans overflow-x-hidden selection:bg-[rgb(var(--accent-primary)/0.3)]">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-screen h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(var(--accent-primary),0.15),transparent_50%)]"></div>
                <div className="absolute bottom-0 right-0 w-screen h-screen bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.15),transparent_50%)]"></div>
            </div>

            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-[rgb(var(--bg-canvas)/0.8)] border-b border-[rgb(var(--border-subtle))] backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--accent-primary))] flex items-center justify-center shadow-[0_0_15px_rgb(var(--accent-glow)/0.5)]">
                                <span className="font-display font-bold text-white text-xl">O</span>
                            </div>
                            <span className="font-display font-bold text-xl tracking-tight">OAST<span className="text-[rgb(var(--accent-primary))]">.</span></span>
                        </div>
                        <div className="hidden md:flex items-center space-x-10">
                            <a href="#features" className="text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">Features</a>
                            <a href="#how-it-works" className="text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">Methodology</a>
                            <Link to="/pricing" className="text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">Pricing</Link>
                        </div>
                        <div className="flex items-center space-x-4">
                            <ThemeToggle />
                            <Link to="/login" className="text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">Log in</Link>
                            <Link
                                to="/register"
                                className="btn-primary py-2 px-5 text-sm"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgb(var(--accent-primary)/0.1)] border border-[rgb(var(--accent-primary)/0.2)] text-[rgb(var(--accent-primary))] text-xs font-semibold uppercase tracking-wide mb-8 animate-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--accent-primary))] opacity-75"></span>
                            <span className="relative inline-flex rounded-full bg-[rgb(var(--accent-primary))] h-2 w-2"></span>
                        </span>
                        New: MEDDIC Framework 2.0
                    </div>

                    <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight mb-8 leading-tight animate-in-up" style={{ animationDelay: '0.1s' }}>
                        Pitch Perfect <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--accent-primary))] to-blue-500">
                            Every Time
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-[rgb(var(--text-secondary))] max-w-2xl mx-auto mb-12 font-light leading-relaxed animate-in-up" style={{ animationDelay: '0.2s' }}>
                        The AI-powered sales coach that analyzes your calls in real-time, giving you the edge to close more deals.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in-up" style={{ animationDelay: '0.3s' }}>
                        <Link
                            to="/register"
                            className="w-full sm:w-auto px-8 py-4 bg-[rgb(var(--accent-primary))] text-white rounded-[var(--radius-lg)] font-bold text-lg hover:shadow-[0_0_30px_rgb(var(--accent-glow)/0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            Start Free Trial <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            to="/pricing"
                            className="w-full sm:w-auto px-8 py-4 bg-[rgb(var(--bg-surface-raised))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] rounded-[var(--radius-lg)] font-bold text-lg hover:bg-[rgb(var(--bg-surface))] transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="h-5 w-5 fill-current" /> See Demo
                        </Link>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--accent-primary),0.05),transparent_70%)] pointer-events-none z-0"></div>
            </div>

            {/* Features Grid */}
            <div id="features" className="py-32 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                            Science-Backed Sales Coaching
                        </h2>
                        <p className="text-[rgb(var(--text-secondary))] text-xl">
                            We don't just transcribe calls. We analyze the psychology, tonality, and framework adherence to build top performers.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="card-hero p-8 group hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--accent-primary)/0.1)] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <ChartBar className="h-7 w-7 text-[rgb(var(--accent-primary))]" />
                            </div>
                            <h3 className="text-2xl font-display font-bold mb-4">MEDDIC Scoring</h3>
                            <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
                                Automatically score every conversation against the 6 pillars of the MEDDIC framework. Identify deal gaps instantly.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="card-hero p-8 group hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <Zap className="h-7 w-7 text-blue-500" />
                            </div>
                            <h3 className="text-2xl font-display font-bold mb-4">Live Coaching</h3>
                            <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
                                Real-time feedback on your speech pace, filler words, and objection handling while you are on the call.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="card-hero p-8 group hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <Shield className="h-7 w-7 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-display font-bold mb-4">Team Intelligence</h3>
                            <p className="text-[rgb(var(--text-secondary))] leading-relaxed">
                                Aggregated analytics for managers to spot team-wide trends and skill gaps before they impact revenue.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Final */}
            <div className="py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="card-hero p-12 md:p-20 text-center relative overflow-hidden group border-[rgb(var(--accent-primary)/0.3)]">
                        {/* Glow effect */}
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(var(--accent-primary),0.15),transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <h2 className="text-4xl md:text-6xl font-display font-bold mb-8 relative z-10">
                            Ready to 10x your close rate?
                        </h2>
                        <p className="text-xl text-[rgb(var(--text-secondary))] mb-12 max-w-2xl mx-auto relative z-10">
                            Join the new wave of sales professionals who treat every pitch like a performance.
                        </p>
                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/register"
                                className="w-full sm:w-auto btn-primary px-10 py-5 text-lg shadow-xl"
                            >
                                Get Started Now
                            </Link>
                        </div>
                        <p className="mt-8 text-sm text-[rgb(var(--text-muted))] relative z-10 flex items-center justify-center gap-2">
                            <Check className="w-4 h-4 text-status-success" /> No credit card required
                            <span className="mx-2">•</span>
                            <Check className="w-4 h-4 text-status-success" /> 14-day free trial
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-[rgb(var(--border-subtle))] py-12 bg-[rgb(var(--bg-canvas))] relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-sm text-[rgb(var(--text-muted))]">
                    <div className="flex items-center mb-4 md:mb-0">
                        <span className="font-display font-bold text-[rgb(var(--text-primary))] mr-2">OAST.</span>
                        <span>© 2024 PitchPerfect AI.</span>
                    </div>
                    <div className="flex space-x-8">
                        <a href="#" className="hover:text-[rgb(var(--text-primary))] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[rgb(var(--text-primary))] transition-colors">Terms</a>
                        <a href="#" className="hover:text-[rgb(var(--text-primary))] transition-colors">Twitter</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
