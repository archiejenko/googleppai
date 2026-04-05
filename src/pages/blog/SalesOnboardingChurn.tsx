import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Share2 } from 'lucide-react';

export default function SalesOnboardingChurn() {
    return (
        <article className="w-full pb-32">
            <div className="max-w-4xl mx-auto px-6 md:px-12 pt-32">
                {/* Back Button */}
                <Link to="/insights" className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-12 group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Insights
                </Link>

                {/* Header */}
                <header className="mb-16">
                    <div className="flex items-center gap-6 text-sm text-text-secondary mb-8 uppercase tracking-widest font-bold border-b border-border-default pb-8">
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Feb 4, 2024</span>
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 8 Min Read</span>
                        <button className="ml-auto hover:text-text-primary transition-colors flex items-center gap-2">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-text-primary mb-8 leading-tight">
                        The Invisible Crisis: Slow Onboarding and 35% Turnover
                    </h1>
                    <p className="text-xl text-text-secondary font-light leading-relaxed">
                        A data-driven look at why sales organisations are burning through talent and how to shorten the 9-month ramp-up time.
                    </p>
                </header>

                {/* Featured Image */}
                <div className="aspect-[21/9] rounded-3xl overflow-hidden border border-border-default mb-16">
                    <img
                        src="/assets/screenshots/hero_dashboard.png"
                        alt="Sales Performance Dashboard"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Content */}
                <div className="prose prose-lg max-w-none space-y-8 text-text-secondary font-light leading-relaxed">
                    <p>
                        The sales industry is currently facing a dual crisis: talent is harder to ramp up than ever before, and once they are ramped, they are leaving at unprecedented rates. Understanding the intersection of onboarding speed and turnover is critical for any organisation looking to scale.
                    </p>

                    <h2 className="text-3xl font-display font-bold text-text-primary mt-12 mb-6">The 35% Turnover Reality</h2>
                    <p>
                        According to recent industry data from <strong className="text-text-primary">HubSpot and Xactly</strong>, the average sales turnover rate is a staggering <strong className="text-text-primary">35%</strong>. This is nearly <strong className="text-text-primary">three times higher</strong> than the average turnover rate of 13% for all other professions combined.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
                        <div className="p-8 bg-bg-surface border border-border-default rounded-2xl">
                            <div className="text-4xl font-display font-bold text-accent mb-2">35%</div>
                            <div className="text-sm uppercase tracking-widest font-bold text-text-primary">Annual Sales Turnover</div>
                        </div>
                        <div className="p-8 bg-bg-surface border border-border-default rounded-2xl">
                            <div className="text-4xl font-display font-bold text-accent mb-2">3x</div>
                            <div className="text-sm uppercase tracking-widest font-bold text-text-primary">vs. Other Professions</div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-display font-bold text-white mt-12 mb-6">The Long Road to Productivity</h2>
                    <p>
                        Why do reps leave? A primary driver is frustration during the onboarding process. While many managers expect a 3-month ramp time, research suggests that <strong className="text-white">it takes on average 3.2 months</strong> just to reach basic proficiency, and up to <strong className="text-white">9 months</strong> to become fully competent in complex B2B solutions (Source: Monetizely).
                    </p>

                    <p>
                        When a rep takes 9 months to hit their stride, yet 47% of sales professionals leave within their first 18 months, the organisation only captures "peak value" for 9 months before needing to restart the cycle. This is a massive drain on resources and morale.
                    </p>

                    <h3 className="text-2xl font-display font-bold text-white mt-8 mb-4">The Solution: Intelligent Ramp-Up</h3>
                    <p>
                        Structured onboarding programs that utilise AI-led practice can reduce ramp-up time by <strong className="text-white">50%</strong>. By allowing reps to encounter their first "failed" call in a simulator rather than with a million-dollar prospect, OAST builds the confidence required to stick with the role long-term.
                    </p>

                    <p className="italic text-sm mt-8 border-t border-border-default pt-4">
                        Sources: HubSpot Sales Report, Xactly Intelligence turnover study, Monetizely Sales Enablement data (2023).
                    </p>
                </div>
            </div>
        </article>
    );
}
