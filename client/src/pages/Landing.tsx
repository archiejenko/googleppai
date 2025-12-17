import { Link } from 'react-router-dom';
import { Mic, BarChart3, Zap, Shield, ArrowRight, Play } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
    return (
        <div className="min-h-screen gradient-dark-bg">
            {/* Navigation */}
            <nav className="fixed w-full z-50 glass-bg border-b border-border-color backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-75 animate-pulse"></div>
                                <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-2 rounded-xl">
                                    <Mic className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <span className="ml-3 text-xl font-bold text-theme-primary">PitchPerfect AI</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-theme-muted hover:text-theme-primary transition-colors">Features</a>
                            <a href="#how-it-works" className="text-theme-muted hover:text-theme-primary transition-colors">How it Works</a>
                            <Link to="/pricing" className="text-theme-muted hover:text-theme-primary transition-colors">Pricing</Link>
                        </div>
                        <div className="flex items-center space-x-4">
                            <ThemeToggle />
                            <Link to="/login" className="text-theme-primary hover:text-theme-accent font-medium">Log in</Link>
                            <Link
                                to="/register"
                                className="bg-theme-accent hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-theme-accent/10 border border-theme-accent/20 text-theme-accent text-sm font-medium mb-8 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full bg-theme-accent h-2 w-2"></span>
                        </span>
                        Now with Multi-Modal AI Analysis
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-theme-primary mb-8 tracking-tight animate-fade-in-up stagger-1">
                        Master Your Sales Pitch <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                            with AI Precision
                        </span>
                    </h1>
                    <p className="text-xl text-theme-muted max-w-2xl mx-auto mb-12 animate-fade-in-up stagger-2">
                        Get instant, actionable feedback on your sales calls using advanced AI.
                        Improve your win rates with MEDDIC framework analysis and real-time coaching.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-3">
                        <Link
                            to="/register"
                            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                        >
                            Start Free Trial <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            to="/pricing"
                            className="w-full sm:w-auto px-8 py-4 bg-theme-elevated border border-border-color text-theme-primary rounded-xl font-bold text-lg hover:bg-theme-tertiary transition-colors flex items-center justify-center gap-2"
                        >
                            <Play className="h-5 w-5 fill-current" /> See Demo
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div id="features" className="py-24 bg-theme-secondary/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-theme-primary mb-4">
                            Everything you need to close more deals
                        </h2>
                        <p className="text-theme-muted text-lg max-w-2xl mx-auto">
                            Our platform combines behavioral science with cutting-edge AI to provide the most comprehensive sales training tool available.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="glass-card p-8 hover:translate-y-[-4px] transition-transform duration-300">
                            <div className="bg-purple-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                                <BarChart3 className="h-7 w-7 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-bold text-theme-primary mb-3">MEDDIC Analysis</h3>
                            <p className="text-theme-muted">
                                Automated scoring against the 6 key indicators of deal health. Know exactly where your deal stands.
                            </p>
                        </div>
                        <div className="glass-card p-8 hover:translate-y-[-4px] transition-transform duration-300">
                            <div className="bg-blue-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                                <Zap className="h-7 w-7 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-theme-primary mb-3">Instant Feedback</h3>
                            <p className="text-theme-muted">
                                Real-time critique on pace, tone, filler words, and confidence. enhance your delivery instantly.
                            </p>
                        </div>
                        <div className="glass-card p-8 hover:translate-y-[-4px] transition-transform duration-300">
                            <div className="bg-green-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                                <Shield className="h-7 w-7 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-theme-primary mb-3">Enterprise Grade</h3>
                            <p className="text-theme-muted">
                                SOC2 compliant, role-based access control, and team management for growing sales organizations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Final */}
            <div className="py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="glass-card p-12 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <h2 className="text-4xl font-bold text-theme-primary mb-6 relative z-10">
                            Ready to build a world-class sales team?
                        </h2>
                        <p className="text-xl text-theme-muted mb-10 max-w-2xl mx-auto relative z-10">
                            Join over 500+ sales leaders who are using PitchPerfect AI to ramp reps faster and close more revenue.
                        </p>
                        <Link
                            to="/register"
                            className="inline-block px-10 py-5 bg-white text-purple-700 hover:bg-gray-100 rounded-xl font-bold text-lg shadow-xl shadow-purple-900/20 hover:shadow-2xl hover:scale-105 transition-all relative z-10"
                        >
                            Get Started for Free
                        </Link>
                        <p className="mt-6 text-sm text-theme-muted relative z-10">
                            No credit card required · 14-day free trial · Cancel anytime
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-border-color py-12 bg-theme-secondary/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center mb-4 md:mb-0">
                        <Mic className="h-6 w-6 text-theme-muted mr-2" />
                        <span className="text-theme-muted font-semibold">PitchPerfect AI</span>
                    </div>
                    <div className="flex space-x-6 text-theme-muted text-sm">
                        <a href="#" className="hover:text-theme-primary">Privacy Policy</a>
                        <a href="#" className="hover:text-theme-primary">Terms of Service</a>
                        <a href="#" className="hover:text-theme-primary">Contact</a>
                    </div>
                    <div className="mt-4 md:mt-0 text-theme-muted text-sm">
                        © 2024 PitchPerfect AI. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
