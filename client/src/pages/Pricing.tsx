import { Check, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pricing() {
    const tiers = [
        {
            name: 'Standard Business',
            price: '£65',
            period: '/user/month',
            setup: '+ £2,000 setup fee',
            description: 'Perfect for growing sales teams',
            features: [
                'Unlimited AI training sessions',
                'Real-time feedback and coaching',
                'Complete analytics dashboard',
                'Team management tools',
                'Premium support',
                'Live sentiment analysis',
                'Comprehensive MEDDIC scoring',
                'Performance tracking',
            ],
            cta: 'Get Started',
            highlighted: true,
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            setup: '',
            description: 'For large organizations with specific needs',
            features: [
                'All Standard features',
                'White-labeling options',
                'On-premise deployment',
                'SSO & advanced security',
                'Dedicated account manager',
                'Custom implementation',
                'API access',
                '24/7 priority support',
                'SLA guarantees',
                'Custom integrations',
            ],
            cta: 'Contact Sales',
            highlighted: false,
        },
    ];

    return (
        <div className="layout-shell">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Navigation Controls */}
                <div className="flex justify-between items-center mb-8">
                    <Link to="/" className="flex items-center text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Home
                    </Link>
                    <Link to="/login" className="text-[rgb(var(--accent-primary))] hover:brightness-110 font-medium">
                        Already have an account? Log in
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-16 animate-in-up">
                    <h1 className="text-5xl font-display font-bold text-[rgb(var(--text-primary))] mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-[rgb(var(--text-muted))] text-xl max-w-2xl mx-auto">
                        Choose the plan that fits your team's needs and start improving your sales performance today
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
                    {tiers.map((tier, index) => (
                        <div
                            key={tier.name}
                            className={`card-hero p-8 animate-in-up relative ${tier.highlighted ? 'border-[rgb(var(--accent-primary))]' : 'border-[rgb(var(--border-default))]'
                                }`}
                            style={{ animationDelay: `${index * 0.2}s` }}
                        >
                            {tier.highlighted && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-[rgb(var(--accent-primary))] text-white px-4 py-1 rounded-full text-sm font-bold shadow-[0_0_15px_rgb(var(--accent-glow)/0.5)]">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-2xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">{tier.name}</h3>
                                <p className="text-[rgb(var(--text-secondary))] text-sm mb-4">{tier.description}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold text-[rgb(var(--text-primary))]">{tier.price}</span>
                                    {tier.period && <span className="text-[rgb(var(--text-muted))]">{tier.period}</span>}
                                </div>
                                {tier.setup && <p className="text-[rgb(var(--text-muted))] text-sm mt-2">{tier.setup}</p>}
                            </div>

                            <ul className="space-y-4 mb-8">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            <Check className="h-5 w-5 text-status-success" />
                                        </div>
                                        <span className="text-[rgb(var(--text-secondary))]">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to={tier.name === 'Enterprise' ? '/contact' : '/register'}
                                className={`block w-full py-4 px-6 rounded-[var(--radius-md)] font-bold text-center transition-all ${tier.highlighted
                                    ? 'btn-primary'
                                    : 'bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface-raised))] hover:border-[rgb(var(--border-subtle))]'
                                    }`}
                            >
                                {tier.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Features Breakdown */}
                <div className="card-os p-8 animate-in-up" style={{ animationDelay: '0.4s' }}>
                    <h2 className="text-3xl font-display font-bold text-[rgb(var(--text-primary))] mb-8 text-center">
                        What's Included in All Plans
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="bg-[rgb(var(--accent-primary)/0.1)] w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg className="h-8 w-8 text-[rgb(var(--accent-primary))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-[rgb(var(--text-primary))] font-semibold mb-2">MEDDIC Framework</h3>
                            <p className="text-[rgb(var(--text-secondary))] text-sm">
                                Comprehensive scoring across all six MEDDIC components with detailed feedback
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-blue-500/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-[rgb(var(--text-primary))] font-semibold mb-2">Real-Time AI Analysis</h3>
                            <p className="text-[rgb(var(--text-secondary))] text-sm">
                                Instant feedback on sentiment, confidence, pace, and clarity during your pitches
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-status-success/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg className="h-8 w-8 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-[rgb(var(--text-primary))] font-semibold mb-2">Advanced Analytics</h3>
                            <p className="text-[rgb(var(--text-secondary))] text-sm">
                                Track progress over time with detailed performance metrics and team insights
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center mt-16 animate-in-up" style={{ animationDelay: '0.6s' }}>
                    <h2 className="text-3xl font-display font-bold text-[rgb(var(--text-primary))] mb-4">
                        Ready to transform your sales team?
                    </h2>
                    <p className="text-[rgb(var(--text-muted))] mb-8 max-w-2xl mx-auto">
                        Join hundreds of sales professionals using PitchPerfect AI to improve their performance
                    </p>
                    <Link
                        to="/register"
                        className="inline-block btn-primary px-8 py-4 text-lg"
                    >
                        Start Your Free Trial
                    </Link>
                </div>
            </div>
        </div>
    );
}
